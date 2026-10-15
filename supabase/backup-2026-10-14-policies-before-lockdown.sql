-- =====================================================================
-- BACKUP: Supabase row-level security policies BEFORE the 2026-10-14
-- security lockdown (project: thunder-house / kxoivmflghfgtvawhktt).
--
-- These "allow everyone" rules let anyone with the public site key read
-- and change client plans, contracts, invoices and intakes, and read the
-- email/Square credentials in thunderhouse_site_settings.
-- Kept only for reference / emergency rollback. Do NOT re-apply as-is.
-- =====================================================================

CREATE POLICY "Allow authenticated staff all availability" ON public.thunderhouse_availability AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public anon select availability" ON public.thunderhouse_availability AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Public create contract" ON public.thunderhouse_contracts AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public read contract by token" ON public.thunderhouse_contracts AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Public sign contract by token" ON public.thunderhouse_contracts AS PERMISSIVE FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Staff full access to contracts" ON public.thunderhouse_contracts AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public token access to event plans" ON public.thunderhouse_event_plans AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Public token insert to event plans" ON public.thunderhouse_event_plans AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public token update to event plans" ON public.thunderhouse_event_plans AS PERMISSIVE FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Staff full access to event plans" ON public.thunderhouse_event_plans AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated staff delete" ON public.thunderhouse_inquiries AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow authenticated staff select" ON public.thunderhouse_inquiries AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated staff update" ON public.thunderhouse_inquiries AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow public anon insert" ON public.thunderhouse_inquiries AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon public access to intakes" ON public.thunderhouse_intakes AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Staff full access to intakes" ON public.thunderhouse_intakes AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can view invoice" ON public.thunderhouse_invoices AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Staff can manage invoices" ON public.thunderhouse_invoices AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can view site settings" ON public.thunderhouse_site_settings AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Superusers can manage site settings" ON public.thunderhouse_site_settings AS PERMISSIVE FOR ALL TO authenticated USING (is_superuser()) WITH CHECK (is_superuser());
CREATE POLICY "Staff can view staff directory" ON public.thunderhouse_staff AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superusers can modify staff" ON public.thunderhouse_staff AS PERMISSIVE FOR ALL TO authenticated USING (is_superuser()) WITH CHECK (is_superuser());

-- is_superuser() before the lockdown (trusted a hard-coded email list,
-- including the JWT email claim, even without a staff-table row):
CREATE OR REPLACE FUNCTION public.is_superuser()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role, email INTO v_role, v_email
  FROM public.thunderhouse_staff
  WHERE id = auth.uid();

  IF v_role = 'superuser' THEN
    RETURN TRUE;
  END IF;

  IF LOWER(COALESCE(v_email, '')) IN ('blackrader@gmail.com', 'olifedigital@gmail.com') THEN
    RETURN TRUE;
  END IF;

  IF LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('blackrader@gmail.com', 'olifedigital@gmail.com') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;
