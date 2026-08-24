CREATE OR REPLACE FUNCTION private.process_site_order(_source text, _payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $fn$
DECLARE
  _event_id text := _payload->>'event_id';
  _event_type text := lower(coalesce(_payload->>'event_type',''));
  _ext text := _payload->>'order_external_ref';
  _email text := lower(trim(coalesce(_payload->>'customer_email','')));
  _qty integer := greatest(coalesce((_payload->>'quantity')::int, 1), 1);
  _key text := nullif(_payload->>'catalog_key','');
  _order_key text;
  _amount integer := nullif(_payload->>'amount_cents','')::int;
  _curr text := upper(nullif(_payload->>'currency',''));
  _link text := nullif(_payload->>'stripe_payment_link_id','');
  _meta jsonb := coalesce(_payload->'metadata','{}'::jsonb);
  _pay public.payment_status;
  _stat public.order_status;
  _is_paid boolean;
  _cat record;
  _ru record;
  _title text;
  _category text;
  _final_amount integer;
  _final_curr text;
  _event_row record;
  _customer_id uuid;
  _order_id uuid;
  _participant_id uuid;
  _mentorship_id uuid;
  _sessions integer;
  _i integer;
BEGIN
  IF _event_id IS NULL OR _ext IS NULL OR _email = '' THEN
    RAISE EXCEPTION 'payload invalido' USING ERRCODE = '22023';
  END IF;

  _pay := private.site_order_map_payment(_payload->>'payment_status');
  _stat := private.site_order_map_status(_payload->>'operational_status');

  IF _event_type IN ('checkout.session.completed','checkout.session.async_payment_succeeded',
                     'payment_confirmation','payment.confirmed') THEN
    _pay := coalesce(_pay, 'pago'::public.payment_status);
  ELSIF _event_type = 'charge.refunded' THEN
    _pay := coalesce(_pay, 'reembolsado'::public.payment_status);
  ELSIF _event_type IN ('order.created','order.updated','request.created') THEN
    _pay := coalesce(_pay, 'pendente'::public.payment_status);
  ELSE
    RAISE EXCEPTION 'evento nao suportado' USING ERRCODE = '22023';
  END IF;

  _is_paid := _pay = 'pago';
  _stat := coalesce(_stat, CASE WHEN _is_paid THEN 'em_andamento'
                                WHEN _pay = 'reembolsado' THEN 'cancelado'
                                ELSE 'novo' END::public.order_status);

  _final_curr := coalesce(_curr, 'EUR');
  _final_amount := _amount;
  _title := nullif(_payload->>'service_name','');
  _category := NULL;
  _order_key := _key;

  IF _key IS NOT NULL AND _key ~ '^recruitment_(operational|specialized)_(eu|br)$' THEN
    IF _qty < 1 OR _qty > 100 THEN
      RAISE EXCEPTION 'quantidade invalida' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO _ru FROM private.recruitment_unit(_key);
    IF _curr IS NOT NULL AND _curr <> _ru.currency THEN
      RAISE EXCEPTION 'moeda divergente' USING ERRCODE = '22023';
    END IF;
    IF _amount IS NOT NULL AND _amount <> _ru.unit_cents * _qty THEN
      RAISE EXCEPTION 'valor divergente' USING ERRCODE = '22023';
    END IF;
    _final_curr := _ru.currency;
    _final_amount := _ru.unit_cents * _qty;
    _category := 'recrutamento';
    _title := coalesce(_title, 'Recrutamento e selecao');
    -- recrutamento dinamico nao pertence ao catalogo fixo
    _order_key := NULL;
    _meta := _meta || jsonb_build_object('recruitment_key', _key, 'unit_cents', _ru.unit_cents);
  ELSIF _key IS NOT NULL THEN
    SELECT * INTO _cat FROM public.service_catalog WHERE catalog_key = _key;
    IF _cat IS NULL THEN
      IF _is_paid THEN
        RAISE EXCEPTION 'catalogo desconhecido' USING ERRCODE = '22023';
      END IF;
      _key := NULL;
      _order_key := NULL;
    ELSE
      IF _is_paid THEN
        IF _link IS NOT NULL AND _cat.stripe_payment_link_id IS NOT NULL
           AND _link <> _cat.stripe_payment_link_id THEN
          RAISE EXCEPTION 'payment link divergente' USING ERRCODE = '22023';
        END IF;
        IF _curr IS NOT NULL AND _curr <> _cat.currency THEN
          RAISE EXCEPTION 'moeda divergente' USING ERRCODE = '22023';
        END IF;
        IF _amount IS NOT NULL AND _amount <> _cat.amount_cents * _qty
           AND _amount <> _cat.amount_cents THEN
          RAISE EXCEPTION 'valor divergente' USING ERRCODE = '22023';
        END IF;
      END IF;
      _final_curr := _cat.currency;
      _final_amount := _cat.amount_cents * _qty;
      _title := _cat.name;
      _category := _cat.category;
    END IF;
  ELSIF _is_paid THEN
    RAISE EXCEPTION 'catalogo obrigatorio' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _event_row FROM public.integration_events
   WHERE source = _source AND event_id = _event_id FOR UPDATE;

  IF _event_row.id IS NOT NULL AND _event_row.status = 'processado' THEN
    RETURN jsonb_build_object('status','duplicate','order_id',_event_row.order_id);
  END IF;

  IF _event_row.id IS NULL THEN
    INSERT INTO public.integration_events (source, event_id, event_type, occurred_at, status, summary)
    VALUES (_source, _event_id, _event_type,
            coalesce(nullif(_payload->>'occurred_at','')::timestamptz, now()),
            'recebido',
            jsonb_build_object('catalog_key', _key, 'order_external_ref', _ext))
    RETURNING * INTO _event_row;
  END IF;

  SELECT id INTO _customer_id FROM public.customers WHERE lower(email) = _email;
  IF _customer_id IS NULL THEN
    INSERT INTO public.customers (full_name, email, phone, source)
    VALUES (coalesce(nullif(trim(_payload->>'customer_name'),''), _email), _email,
            nullif(_payload->>'customer_phone',''), _source)
    RETURNING id INTO _customer_id;
  ELSE
    UPDATE public.customers
       SET phone = coalesce(phone, nullif(_payload->>'customer_phone','')),
           full_name = coalesce(nullif(full_name,''), nullif(trim(_payload->>'customer_name'),''), _email)
     WHERE id = _customer_id;
  END IF;

  SELECT id INTO _order_id FROM public.orders WHERE external_ref = _ext FOR UPDATE;
  IF _order_id IS NULL THEN
    INSERT INTO public.orders (
      order_number, external_ref, customer_id, contact_email, contact_phone, title, catalog_key,
      category, currency, amount_cents, quantity, payment_status, status, is_request, source,
      stripe_payment_link_id, stripe_checkout_session_id, metadata, service_type
    ) VALUES (
      '', _ext, _customer_id, _email, nullif(_payload->>'customer_phone',''),
      coalesce(_title,'Solicitacao do site'), _order_key, _category, _final_curr, _final_amount, _qty,
      _pay, _stat, NOT _is_paid, _source,
      _link, nullif(_payload->>'stripe_checkout_session_id',''), _meta,
      CASE WHEN _category = 'mentoria' THEN 'mentoria'
           WHEN _category = 'site' THEN 'site'
           WHEN _category = 'recrutamento' THEN 'recrutamento_selecao'
           ELSE 'outros' END::public.service_type
    ) RETURNING id INTO _order_id;
  ELSE
    UPDATE public.orders
       SET customer_id = coalesce(customer_id, _customer_id),
           contact_email = coalesce(contact_email, _email),
           title = coalesce(_title, title),
           catalog_key = coalesce(_order_key, catalog_key),
           category = coalesce(_category, category),
           currency = _final_curr,
           amount_cents = coalesce(_final_amount, amount_cents),
           quantity = _qty,
           payment_status = _pay,
           status = _stat,
           is_request = CASE WHEN _is_paid THEN false ELSE is_request END,
           stripe_payment_link_id = coalesce(_link, stripe_payment_link_id),
           stripe_checkout_session_id = coalesce(nullif(_payload->>'stripe_checkout_session_id',''), stripe_checkout_session_id),
           metadata = metadata || _meta
     WHERE id = _order_id;
  END IF;

  INSERT INTO public.order_history (order_id, field, old_value, new_value, note)
  VALUES (_order_id, 'integracao', NULL, _event_type, 'site: ' || _source);

  IF _is_paid THEN
    PERFORM private.grant_order_credits(_order_id);
  END IF;

  IF _is_paid AND _key IN ('mentoria_4','mentoria_8') THEN
    _sessions := CASE WHEN _key = 'mentoria_8' THEN 8 ELSE 4 END;

    SELECT id INTO _participant_id FROM public.participants WHERE lower(email) = _email;
    IF _participant_id IS NULL THEN
      INSERT INTO public.participants (full_name, email, phone, business_area, goal, notes)
      VALUES (coalesce(nullif(trim(_payload->>'customer_name'),''), _email), _email,
              nullif(_payload->>'customer_phone',''),
              nullif(_meta->>'business_area',''), nullif(_meta->>'goal',''),
              nullif(_meta->>'legacy_case_id',''))
      RETURNING id INTO _participant_id;
    ELSE
      UPDATE public.participants
         SET business_area = coalesce(business_area, nullif(_meta->>'business_area','')),
             goal = coalesce(goal, nullif(_meta->>'goal','')),
             phone = coalesce(phone, nullif(_payload->>'customer_phone','')),
             notes = coalesce(notes, nullif(_meta->>'legacy_case_id',''))
       WHERE id = _participant_id;
    END IF;

    SELECT id INTO _mentorship_id FROM public.mentorships WHERE order_id = _order_id;
    IF _mentorship_id IS NULL THEN
      INSERT INTO public.mentorships (customer_id, order_id, participant_id, payment_status, status, program_name, goal)
      VALUES (_customer_id, _order_id, _participant_id, _pay, 'aguardando_agendamento',
              coalesce(_title, _key), nullif(_meta->>'goal',''))
      RETURNING id INTO _mentorship_id;
    ELSE
      UPDATE public.mentorships
         SET customer_id = coalesce(customer_id, _customer_id),
             participant_id = coalesce(participant_id, _participant_id),
             payment_status = _pay
       WHERE id = _mentorship_id;
    END IF;

    FOR _i IN 1.._sessions LOOP
      INSERT INTO public.s8_sessions (participant_id, session_number)
      VALUES (_participant_id, _i)
      ON CONFLICT (participant_id, session_number) DO NOTHING;
    END LOOP;

    INSERT INTO public.business_projects (participant_id)
    VALUES (_participant_id) ON CONFLICT (participant_id) DO NOTHING;
    INSERT INTO public.pde_records (participant_id)
    VALUES (_participant_id) ON CONFLICT (participant_id) DO NOTHING;
  END IF;

  UPDATE public.integration_events
     SET status = 'processado', order_id = _order_id, customer_id = _customer_id,
         summary = summary || jsonb_build_object('payment_status', _pay, 'order_status', _stat)
   WHERE id = _event_row.id;

  RETURN jsonb_build_object('status','processed','order_id',_order_id,'customer_id',_customer_id);
END
$fn$;

REVOKE ALL ON FUNCTION private.process_site_order(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.process_site_order(text, jsonb) TO service_role;