-- =====================================================================
-- THUNDER HOUSE ENT: security lockdown (2026-10-14)
--
-- 1. Staff access = signed in AND listed in thunderhouse_staff.
-- 2. Clients never touch tables directly. They use client_* functions
--    that require the booking's secret client_key (or the plan's random
--    portal token) and only return / change their own records.
-- 3. Secrets in thunderhouse_site_settings are staff-only.
-- Rollback reference: backup-2026-10-14-policies-before-lockdown.sql
-- =====================================================================

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.thunderhouse_staff WHERE id = auth.uid());
$$;

-- superuser now requires a staff-table row (no more trusting the JWT email claim)
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.thunderhouse_staff WHERE id = auth.uid() AND role = 'superuser');
$$;

CREATE OR REPLACE FUNCTION public.th_random_token()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

-- ---------- secret keys ----------
ALTER TABLE public.thunderhouse_invoices
  ADD COLUMN IF NOT EXISTS client_key text NOT NULL DEFAULT public.th_random_token();
CREATE UNIQUE INDEX IF NOT EXISTS thunderhouse_invoices_client_key_idx ON public.thunderhouse_invoices (client_key);

ALTER TABLE public.thunderhouse_event_plans ALTER COLUMN portal_token SET DEFAULT 'th-' || public.th_random_token();
ALTER TABLE public.thunderhouse_contracts  ALTER COLUMN contract_token SET DEFAULT 'th-c-' || public.th_random_token();
-- replace the old guessable tokens (th-vip-skirvin-2026, th-contract-th-inv-2026-001, ...)
UPDATE public.thunderhouse_event_plans SET portal_token = 'th-' || public.th_random_token();
UPDATE public.thunderhouse_contracts  SET contract_token = 'th-c-' || public.th_random_token();

-- ---------- policies: drop the "allow everyone" rules ----------
DROP POLICY IF EXISTS "Allow authenticated staff all availability" ON public.thunderhouse_availability;
DROP POLICY IF EXISTS "Public create contract" ON public.thunderhouse_contracts;
DROP POLICY IF EXISTS "Public read contract by token" ON public.thunderhouse_contracts;
DROP POLICY IF EXISTS "Public sign contract by token" ON public.thunderhouse_contracts;
DROP POLICY IF EXISTS "Staff full access to contracts" ON public.thunderhouse_contracts;
DROP POLICY IF EXISTS "Public token access to event plans" ON public.thunderhouse_event_plans;
DROP POLICY IF EXISTS "Public token insert to event plans" ON public.thunderhouse_event_plans;
DROP POLICY IF EXISTS "Public token update to event plans" ON public.thunderhouse_event_plans;
DROP POLICY IF EXISTS "Staff full access to event plans" ON public.thunderhouse_event_plans;
DROP POLICY IF EXISTS "Allow authenticated staff delete" ON public.thunderhouse_inquiries;
DROP POLICY IF EXISTS "Allow authenticated staff select" ON public.thunderhouse_inquiries;
DROP POLICY IF EXISTS "Allow authenticated staff update" ON public.thunderhouse_inquiries;
DROP POLICY IF EXISTS "Anon public access to intakes" ON public.thunderhouse_intakes;
DROP POLICY IF EXISTS "Staff full access to intakes" ON public.thunderhouse_intakes;
DROP POLICY IF EXISTS "Public can view invoice" ON public.thunderhouse_invoices;
DROP POLICY IF EXISTS "Staff can manage invoices" ON public.thunderhouse_invoices;
DROP POLICY IF EXISTS "Public can view site settings" ON public.thunderhouse_site_settings;
DROP POLICY IF EXISTS "Staff can view staff directory" ON public.thunderhouse_staff;

-- ---------- policies: staff only ----------
CREATE POLICY "Staff manage availability" ON public.thunderhouse_availability FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Staff manage contracts"    ON public.thunderhouse_contracts    FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Staff manage event plans"  ON public.thunderhouse_event_plans  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Staff manage inquiries"    ON public.thunderhouse_inquiries    FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Staff manage intakes"      ON public.thunderhouse_intakes      FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Staff manage invoices"     ON public.thunderhouse_invoices     FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Staff view staff directory" ON public.thunderhouse_staff       FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff read all settings"   ON public.thunderhouse_site_settings FOR SELECT TO authenticated USING (public.is_staff());
-- the public website only needs its text/color overrides and email copy
CREATE POLICY "Public read site content"  ON public.thunderhouse_site_settings FOR SELECT TO anon, authenticated
  USING (key IN ('site_overrides', 'email_templates'));
-- kept from before: anon can read the availability calendar and submit inquiries
--   "Allow public anon select availability" (SELECT, anon)
--   "Allow public anon insert"              (INSERT, anon, thunderhouse_inquiries)

-- ---------- client functions ----------
CREATE OR REPLACE FUNCTION public.client_get_invoice(p_invoice text, p_key text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.thunderhouse_invoices; c public.thunderhouse_contracts;
BEGIN
  IF coalesce(length(p_key), 0) < 20 THEN RETURN NULL; END IF;
  SELECT * INTO inv FROM public.thunderhouse_invoices WHERE invoice_number = p_invoice AND client_key = p_key;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.thunderhouse_contracts WHERE invoice_number = p_invoice ORDER BY created_at LIMIT 1;
  RETURN (to_jsonb(inv) - 'created_by' - 'consultant_id')
      || jsonb_build_object('contract', CASE WHEN c.id IS NULL THEN NULL
                                             ELSE jsonb_build_object('status', c.status, 'signed_at', c.signed_at) END);
END $$;

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
    -- first visit: draft the agreement from the invoice (same rules the page used to apply)
    SELECT * INTO pl FROM public.thunderhouse_event_plans WHERE invoice_number = p_invoice LIMIT 1;
    tot := coalesce(inv.total_amount, 0);
    dep := coalesce(inv.deposit_requested, tot * 0.3);
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

CREATE OR REPLACE FUNCTION public.client_sign_contract(
  p_invoice text, p_key text, p_signer_name text, p_signer_title text,
  p_signature_data text, p_signature_type text, p_user_agent text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.thunderhouse_contracts; v_ip text;
BEGIN
  IF coalesce(length(p_key), 0) < 20
     OR NOT EXISTS (SELECT 1 FROM public.thunderhouse_invoices WHERE invoice_number = p_invoice AND client_key = p_key) THEN
    RAISE EXCEPTION 'This contract link is not valid.';
  END IF;
  IF coalesce(trim(p_signer_name), '') = '' OR coalesce(p_signature_data, '') = '' THEN
    RAISE EXCEPTION 'A name and signature are required.';
  END IF;
  IF length(p_signature_data) > 600000 THEN RAISE EXCEPTION 'Signature image is too large.'; END IF;
  v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  UPDATE public.thunderhouse_contracts SET
    status = 'Signed', signer_name = left(trim(p_signer_name), 200), signer_title = left(p_signer_title, 200),
    signature_data = p_signature_data, signature_type = left(p_signature_type, 20),
    signed_at = now(), signer_ip = nullif(v_ip, ''), signer_user_agent = left(p_user_agent, 500), updated_at = now()
  WHERE invoice_number = p_invoice AND coalesce(status, '') <> 'Signed'
  RETURNING * INTO c;
  IF NOT FOUND THEN RAISE EXCEPTION 'This contract is already signed.'; END IF;
  UPDATE public.thunderhouse_invoices SET contract_status = 'Signed', contract_signed_at = now(), updated_at = now()
  WHERE invoice_number = p_invoice;
  RETURN to_jsonb(c) - 'signer_ip' - 'signer_user_agent' - 'inquiry_id' - 'notes';
END $$;

-- fields a client may see in their planning portal
CREATE OR REPLACE FUNCTION public.th_client_plan_json(pl public.thunderhouse_event_plans, p_key text)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id', pl.id, 'portal_token', pl.portal_token, 'invoice_number', pl.invoice_number, 'client_key', p_key,
    'client_name', pl.client_name, 'event_type', pl.event_type, 'event_date', pl.event_date,
    'venue_name', pl.venue_name, 'venue_city', pl.venue_city, 'guest_count', pl.guest_count,
    'spotify_playlist_url', pl.spotify_playlist_url, 'apple_music_url', pl.apple_music_url,
    'genres_preferred', pl.genres_preferred, 'genres_avoid', pl.genres_avoid,
    'must_play_songs', pl.must_play_songs, 'play_if_possible_songs', pl.play_if_possible_songs,
    'do_not_play_songs', pl.do_not_play_songs, 'special_moments', pl.special_moments,
    'timeline_items', pl.timeline_items, 'vip_names_pronunciations', pl.vip_names_pronunciations,
    'special_announcements', pl.special_announcements, 'mc_notes', pl.mc_notes,
    'last_saved_at', pl.last_saved_at, 'status', pl.status);
$$;

-- find the plan a client link points at: a random portal token, or invoice number + client key
CREATE OR REPLACE FUNCTION public.th_find_client_plan(p_token text, p_invoice text, p_key text, p_create boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE pl public.thunderhouse_event_plans; inv public.thunderhouse_invoices; v_key text;
BEGIN
  IF coalesce(length(p_token), 0) >= 30 THEN
    SELECT * INTO pl FROM public.thunderhouse_event_plans WHERE portal_token = p_token;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT client_key INTO v_key FROM public.thunderhouse_invoices WHERE invoice_number = pl.invoice_number;
    RETURN jsonb_build_object('id', pl.id, 'key', v_key);
  END IF;
  IF coalesce(length(p_key), 0) < 20 THEN RETURN NULL; END IF;
  SELECT * INTO inv FROM public.thunderhouse_invoices WHERE invoice_number = p_invoice AND client_key = p_key;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO pl FROM public.thunderhouse_event_plans WHERE invoice_number = p_invoice ORDER BY created_at LIMIT 1;
  IF NOT FOUND THEN
    IF NOT p_create THEN RETURN NULL; END IF;
    INSERT INTO public.thunderhouse_event_plans (
      invoice_number, client_name, client_email, client_phone, event_date, venue_name, event_type,
      must_play_songs, play_if_possible_songs, do_not_play_songs, special_moments, timeline_items, vip_names_pronunciations)
    VALUES (inv.invoice_number, inv.client_name, inv.client_email, inv.client_phone, inv.event_date, inv.venue_city, 'Event',
      '[]', '[]', '[]', '{}',
      '[{"time":"5:00 PM","title":"Cocktail Hour & Guest Arrival","notes":"Background music"},
        {"time":"6:00 PM","title":"Grand Entrance & Welcome","notes":"Mic announcement"},
        {"time":"7:00 PM","title":"Open Dance Floor","notes":"High energy"}]', '[]')
    RETURNING * INTO pl;
  END IF;
  RETURN jsonb_build_object('id', pl.id, 'key', p_key);
END $$;

CREATE OR REPLACE FUNCTION public.client_get_plan(p_token text, p_invoice text, p_key text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE f jsonb; pl public.thunderhouse_event_plans;
BEGIN
  f := public.th_find_client_plan(p_token, p_invoice, p_key, true);
  IF f IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO pl FROM public.thunderhouse_event_plans WHERE id = (f ->> 'id')::uuid;
  RETURN public.th_client_plan_json(pl, f ->> 'key');
END $$;

CREATE OR REPLACE FUNCTION public.client_save_plan(p_token text, p_invoice text, p_key text, p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE f jsonb; pl public.thunderhouse_event_plans;
BEGIN
  IF pg_column_size(p_data) > 300000 THEN RAISE EXCEPTION 'Plan is too large to save.'; END IF;
  f := public.th_find_client_plan(p_token, p_invoice, p_key, false);
  IF f IS NULL THEN RAISE EXCEPTION 'This planning link is not valid.'; END IF;
  UPDATE public.thunderhouse_event_plans SET
    spotify_playlist_url     = left(p_data ->> 'spotify_playlist_url', 500),
    genres_preferred         = coalesce(p_data -> 'genres_preferred', '[]'),
    genres_avoid             = coalesce(p_data -> 'genres_avoid', '[]'),
    must_play_songs          = coalesce(p_data -> 'must_play_songs', '[]'),
    play_if_possible_songs   = coalesce(p_data -> 'play_if_possible_songs', '[]'),
    do_not_play_songs        = coalesce(p_data -> 'do_not_play_songs', '[]'),
    special_moments          = coalesce(p_data -> 'special_moments', '{}'),
    timeline_items           = coalesce(p_data -> 'timeline_items', '[]'),
    vip_names_pronunciations = coalesce(p_data -> 'vip_names_pronunciations', '[]'),
    special_announcements    = left(p_data ->> 'special_announcements', 5000),
    mc_notes                 = left(p_data ->> 'mc_notes', 5000),
    last_saved_at = now(), updated_at = now()
  WHERE id = (f ->> 'id')::uuid
  RETURNING * INTO pl;
  RETURN public.th_client_plan_json(pl, f ->> 'key');
END $$;

-- ---------- who may call what ----------
REVOKE EXECUTE ON FUNCTION public.th_find_client_plan(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.th_client_plan_json(public.thunderhouse_event_plans, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_get_invoice(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_get_contract(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_sign_contract(text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_get_plan(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_save_plan(text, text, text, jsonb) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
