-- =====================================================================
-- THUNDER HOUSE ENT: $200 retainer + payment log (2026-10-15)
--
-- 1. thunderhouse_payments: one row per Square payment. The unique Square
--    payment id means a payment can never be counted twice, even when both
--    the card form and Square's webhook report it.
-- 2. New invoices default to a $200 retainer; contracts drafted from an
--    invoice use $200 (or the total, if smaller) instead of 30%.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.thunderhouse_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid REFERENCES public.thunderhouse_invoices (id) ON DELETE SET NULL,
  invoice_number    text NOT NULL,
  square_payment_id text UNIQUE,
  amount            numeric(10, 2) NOT NULL CHECK (amount > 0),
  kind              text,          -- retainer | balance
  method            text,
  source            text,          -- card_form | square_webhook | manual
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS thunderhouse_payments_invoice_number_idx ON public.thunderhouse_payments (invoice_number);
CREATE INDEX IF NOT EXISTS thunderhouse_payments_invoice_id_idx ON public.thunderhouse_payments (invoice_id);

ALTER TABLE public.thunderhouse_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payments" ON public.thunderhouse_payments
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- new invoices: $200 retainer unless staff set something else
ALTER TABLE public.thunderhouse_invoices ALTER COLUMN deposit_requested SET DEFAULT 200;

-- contracts drafted from an invoice: $200 retainer fallback (was 30% of total)
CREATE OR REPLACE FUNCTION public.client_get_contract(p_invoice text, p_key text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.thunderhouse_invoices; c public.thunderhouse_contracts; pl public.thunderhouse_event_plans;
        tot numeric; dep numeric;
BEGIN
  IF coalesce(length(p_key), 0) < 20 THEN RETURN NULL; END IF;
  SELECT * INTO inv FROM public.thunderhouse_invoices WHERE invoice_number = p_invoice AND client_key = p_key;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.thunderhouse_contracts WHERE invoice_number = p_invoice ORDER BY created_at LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO pl FROM public.thunderhouse_event_plans WHERE invoice_number = p_invoice LIMIT 1;
    tot := coalesce(inv.total_amount, 0);
    dep := least(coalesce(inv.deposit_requested, 200), tot);
    INSERT INTO public.thunderhouse_contracts (
      invoice_number, inquiry_id, client_name, client_email, client_phone, client_address,
      event_type, event_date, event_start_time, event_end_time, venue_name, venue_address,
      total_amount, deposit_amount, balance_due, overtime_rate, package_name, included_addons, status)
    VALUES (
      inv.invoice_number, inv.inquiry_id, inv.client_name, inv.client_email, inv.client_phone,
      coalesce(inv.venue_city, 'Oklahoma City, OK'),
      coalesce(pl.event_type, 'Event Celebration'), inv.event_date, '5:00 PM', '11:00 PM',
      coalesce(pl.venue_name, inv.venue_city), coalesce(pl.venue_address, inv.venue_city),
      tot, dep, tot - dep, 150.00,
      coalesce(inv.items -> 0 ->> 'description', 'Custom Entertainment Experience'),
      coalesce((SELECT jsonb_agg(concat(e ->> 'description', ' (', coalesce(e ->> 'quantity', '1'), 'x)') ORDER BY i)
                  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(inv.items) = 'array' THEN inv.items ELSE '[]'::jsonb END)
                       WITH ORDINALITY AS t(e, i) WHERE i > 1), '[]'::jsonb),
      'Pending Signature')
    RETURNING * INTO c;
  END IF;
  RETURN (to_jsonb(c) - 'signer_ip' - 'signer_user_agent' - 'inquiry_id' - 'notes')
      || jsonb_build_object('invoice', jsonb_build_object(
           'invoice_number', inv.invoice_number, 'square_payment_link', inv.square_payment_link,
           'status', inv.status, 'total_amount', inv.total_amount, 'balance_due', inv.balance_due));
END $$;

-- tidy-ups flagged by the Supabase security scanner
ALTER FUNCTION public.th_random_token() SET search_path = public;
ALTER FUNCTION public.th_client_plan_json(public.thunderhouse_event_plans, text) SET search_path = public;
