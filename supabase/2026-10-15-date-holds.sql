-- =====================================================================
-- THUNDER HOUSE ENT: date holds + retainer date lock (2026-10-15)
--
-- * A website quote places a hold that fully blocks the date for
--   `hold_hours` (superuser setting, default 72). Expired holds count as
--   open again automatically; nothing has to run on a schedule.
-- * One active hold per email address (limits calendar spam).
-- * Paying the retainer (or marking an invoice Retainer Paid / Paid)
--   locks the date as booked for that invoice.
-- * The public calendar no longer reads the table directly, because
--   held dates now carry the client's name and email.
-- =====================================================================

-- ---------- setting: how long a hold lasts ----------
INSERT INTO public.thunderhouse_site_settings (key, value, updated_at)
VALUES ('booking_settings', '{"hold_hours": 72}', now())
ON CONFLICT (key) DO NOTHING;

-- the website shows the hold length, so it may read this one setting
DROP POLICY IF EXISTS "Public read site content" ON public.thunderhouse_site_settings;
CREATE POLICY "Public read site content" ON public.thunderhouse_site_settings FOR SELECT TO anon, authenticated
  USING (key IN ('site_overrides', 'email_templates', 'booking_settings'));

CREATE OR REPLACE FUNCTION public.th_hold_hours()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT greatest(1, least(720, coalesce(
    (SELECT (value ->> 'hold_hours')::integer FROM public.thunderhouse_site_settings WHERE key = 'booking_settings'),
    72)));
$$;

-- ---------- hold + lock details on each calendar day ----------
ALTER TABLE public.thunderhouse_availability
  ADD COLUMN IF NOT EXISTS hold_expires_at       timestamptz,
  ADD COLUMN IF NOT EXISTS hold_name             text,
  ADD COLUMN IF NOT EXISTS hold_email            text,
  ADD COLUMN IF NOT EXISTS hold_inquiry_id       uuid REFERENCES public.thunderhouse_inquiries (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_invoice_number text;

-- ---------- public calendar: dates + status only, expired holds shown as open ----------
DROP POLICY IF EXISTS "Allow public anon select availability" ON public.thunderhouse_availability;

CREATE OR REPLACE FUNCTION public.public_availability()
RETURNS TABLE (date date, status text, time_slots text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.date,
         CASE WHEN a.status = 'held' AND (a.hold_expires_at IS NULL OR a.hold_expires_at <= now()) THEN 'available'
              ELSE a.status END,
         a.time_slots
    FROM public.thunderhouse_availability a
   WHERE a.date >= current_date - 7
   ORDER BY a.date;
$$;

-- ---------- website quote: save the inquiry and hold the date in one step ----------
CREATE OR REPLACE FUNCTION public.submit_quote_request(p jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name  text := left(trim(coalesce(p ->> 'full_name', '')), 120);
  v_email text := lower(left(trim(coalesce(p ->> 'email', '')), 200));
  v_date_txt text := trim(coalesce(p ->> 'event_date', ''));
  v_date  date;
  v_notes text := left(coalesce(p ->> 'notes', ''), 4000);
  v_inq   uuid;
  v_day   public.thunderhouse_availability;
  v_hours integer := public.th_hold_hours();
  v_held  boolean := false;
  v_reason text := null;
  v_expires timestamptz;
BEGIN
  IF v_name = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'Please include your name and a valid email address.';
  END IF;

  IF v_date_txt ~ '^\d{4}-\d{2}-\d{2}$' THEN
    v_date := v_date_txt::date;
  ELSIF v_date_txt <> '' THEN
    -- flexible requests ("Flexible: Spring 2027 (Saturdays)") keep their wording in the notes
    v_notes := left('[Requested date: ' || v_date_txt || '] ' || v_notes, 4000);
  END IF;

  INSERT INTO public.thunderhouse_inquiries (
    full_name, email, phone, event_date, event_time, venue_location, package_name,
    addons, estimated_total, notes, status, source)
  VALUES (
    v_name, v_email, left(p ->> 'phone', 40), v_date, left(p ->> 'event_time', 80), left(p ->> 'venue_location', 200),
    left(p ->> 'package_name', 120),
    CASE WHEN jsonb_typeof(p -> 'addons') = 'array'
         THEN ARRAY(SELECT left(x, 120) FROM jsonb_array_elements_text(p -> 'addons') AS x LIMIT 20)
         ELSE NULL END,
    CASE WHEN (p ->> 'estimated_total') ~ '^\d+(\.\d+)?$' THEN least((p ->> 'estimated_total')::numeric, 100000) END,
    v_notes, 'new', left(coalesce(p ->> 'source', 'website'), 60))
  RETURNING id INTO v_inq;

  IF v_date IS NULL THEN
    v_reason := 'no_specific_date';
  ELSIF v_date < current_date THEN
    v_reason := 'date_in_past';
  ELSE
    SELECT * INTO v_day FROM public.thunderhouse_availability WHERE date = v_date FOR UPDATE;
    IF NOT FOUND THEN
      v_reason := 'date_not_open';
    ELSIF v_day.status = 'held' AND v_day.hold_expires_at > now() AND lower(v_day.hold_email) = v_email THEN
      v_held := true;                       -- this client already holds it
      v_expires := v_day.hold_expires_at;
    ELSIF v_day.status = 'available' OR (v_day.status = 'held' AND (v_day.hold_expires_at IS NULL OR v_day.hold_expires_at <= now())) THEN
      IF EXISTS (SELECT 1 FROM public.thunderhouse_availability
                  WHERE status = 'held' AND hold_expires_at > now() AND lower(hold_email) = v_email) THEN
        v_reason := 'one_hold_per_client';
      ELSE
        v_expires := now() + make_interval(hours => v_hours);
        UPDATE public.thunderhouse_availability SET
          status = 'held', hold_expires_at = v_expires, hold_name = v_name, hold_email = v_email,
          hold_inquiry_id = v_inq, updated_at = now()
        WHERE date = v_date;
        v_held := true;
      END IF;
    ELSE
      v_reason := 'date_unavailable';
    END IF;
  END IF;

  RETURN jsonb_build_object('inquiry_id', v_inq, 'held', v_held, 'hold_expires_at', v_expires,
                            'hold_hours', v_hours, 'reason', v_reason);
END $$;

-- ---------- retainer paid => date locked for that invoice ----------
CREATE OR REPLACE FUNCTION public.th_lock_date_on_retainer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ret numeric;
BEGIN
  IF NEW.event_date IS NULL THEN RETURN NEW; END IF;
  v_ret := least(coalesce(NEW.deposit_requested, 200), coalesce(NEW.total_amount, 0));
  IF NEW.status IN ('Retainer Paid', 'Paid') OR (v_ret > 0 AND coalesce(NEW.amount_paid, 0) >= v_ret - 0.005) THEN
    INSERT INTO public.thunderhouse_availability (date, status, time_slots, notes, locked_invoice_number, updated_at)
    VALUES (NEW.event_date, 'booked', '{}', 'Booked: ' || coalesce(NEW.client_name, NEW.invoice_number), NEW.invoice_number, now())
    ON CONFLICT (date) DO UPDATE SET
      status = 'booked',
      locked_invoice_number = NEW.invoice_number,
      notes = 'Booked: ' || coalesce(NEW.client_name, NEW.invoice_number),
      hold_expires_at = NULL, hold_name = NULL, hold_email = NULL, hold_inquiry_id = NULL,
      updated_at = now()
    -- never take a date that is already locked for a different invoice
    WHERE public.thunderhouse_availability.locked_invoice_number IS NULL
       OR public.thunderhouse_availability.locked_invoice_number = NEW.invoice_number;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS th_lock_date_on_retainer ON public.thunderhouse_invoices;
CREATE TRIGGER th_lock_date_on_retainer
  AFTER INSERT OR UPDATE OF amount_paid, status, event_date ON public.thunderhouse_invoices
  FOR EACH ROW EXECUTE FUNCTION public.th_lock_date_on_retainer();

-- ---------- who may call what ----------
REVOKE EXECUTE ON FUNCTION public.th_lock_date_on_retainer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.th_hold_hours() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.th_hold_hours() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_availability() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_request(jsonb) TO anon, authenticated;
