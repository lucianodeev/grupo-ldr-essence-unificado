ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'parcialmente_reembolsado';

ALTER TABLE public.service_catalog
  ADD COLUMN IF NOT EXISTS billing_cadence text NOT NULL DEFAULT 'one_time';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.service_catalog'::regclass AND conname = 'service_catalog_billing_cadence_check'
  ) THEN
    ALTER TABLE public.service_catalog
      ADD CONSTRAINT service_catalog_billing_cadence_check
      CHECK (billing_cadence IN ('one_time','monthly'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_lower_uidx
  ON public.customers (lower(email)) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_external_ref_uidx
  ON public.orders (external_ref) WHERE external_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mentorships_order_id_uidx
  ON public.mentorships (order_id) WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS participants_email_lower_uidx
  ON public.participants (lower(email)) WHERE email IS NOT NULL;