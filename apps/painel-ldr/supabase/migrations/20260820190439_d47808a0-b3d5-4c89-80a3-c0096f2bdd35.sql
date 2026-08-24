-- Novos valores de enum para o fluxo de aprovação do cliente
ALTER TYPE public.delivery_status ADD VALUE IF NOT EXISTS 'ajustes_solicitados';
ALTER TYPE public.delivery_status ADD VALUE IF NOT EXISTS 'aprovada';