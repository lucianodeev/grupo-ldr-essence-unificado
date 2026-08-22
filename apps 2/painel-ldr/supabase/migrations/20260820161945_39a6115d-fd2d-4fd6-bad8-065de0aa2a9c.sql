REVOKE ALL ON public.customers, public.orders, public.order_history, public.mentorships, public.deliveries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers, public.orders, public.mentorships, public.deliveries TO authenticated;
GRANT SELECT, INSERT ON public.order_history TO authenticated;
GRANT ALL ON public.customers, public.orders, public.order_history, public.mentorships, public.deliveries TO service_role;