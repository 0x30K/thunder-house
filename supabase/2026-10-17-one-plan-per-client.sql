-- Thunder House ENT: one music plan per client.
-- A plan made from the quote (admin "VIP Planning Hub") is now picked up when the client opens the
-- portal from their invoice, instead of a second, empty plan being created.
begin;

create or replace function public.th_find_client_plan(p_token text, p_invoice text, p_key text, p_create boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare pl public.thunderhouse_event_plans; inv public.thunderhouse_invoices; v_key text;
begin
  if coalesce(length(p_token), 0) >= 30 then
    select * into pl from public.thunderhouse_event_plans where portal_token = p_token;
    if not found then return null; end if;
    select client_key into v_key from public.thunderhouse_invoices where invoice_number = pl.invoice_number;
    return jsonb_build_object('id', pl.id, 'key', v_key);
  end if;
  if coalesce(length(p_key), 0) < 20 then return null; end if;
  select * into inv from public.thunderhouse_invoices where invoice_number = p_invoice and client_key = p_key;
  if not found then return null; end if;

  select * into pl from public.thunderhouse_event_plans where invoice_number = p_invoice order by created_at limit 1;

  -- no plan for this invoice yet: adopt the one made from the same quote, if there is one
  if not found and inv.inquiry_id is not null then
    select * into pl from public.thunderhouse_event_plans
     where inquiry_id = inv.inquiry_id and invoice_number is null
     order by created_at limit 1;
    if found then
      update public.thunderhouse_event_plans set invoice_number = inv.invoice_number, updated_at = now()
       where id = pl.id returning * into pl;
    end if;
  end if;

  if pl.id is null then
    if not p_create then return null; end if;
    insert into public.thunderhouse_event_plans (
      invoice_number, inquiry_id, client_name, client_email, client_phone, event_date, venue_name, event_type,
      must_play_songs, play_if_possible_songs, do_not_play_songs, special_moments, timeline_items, vip_names_pronunciations)
    values (inv.invoice_number, inv.inquiry_id, inv.client_name, inv.client_email, inv.client_phone, inv.event_date, inv.venue_city, 'Event',
      '[]', '[]', '[]', '{}',
      '[{"time":"5:00 PM","title":"Cocktail Hour & Guest Arrival","notes":"Background music"},
        {"time":"6:00 PM","title":"Grand Entrance & Welcome","notes":"Mic announcement"},
        {"time":"7:00 PM","title":"Open Dance Floor","notes":"High energy"}]', '[]')
    returning * into pl;
  end if;
  return jsonb_build_object('id', pl.id, 'key', p_key);
end $function$;

-- Dry run cleanup: remove the empty duplicate plan that was created by opening the portal from the invoice,
-- so the next visit adopts the plan the "client" filled in.
delete from public.thunderhouse_event_plans
 where id = '3931c482-0a60-4b33-9a12-58f53c4ed6a5'
   and must_play_songs = '[]'::jsonb and special_moments = '{}'::jsonb;

commit;

-- check: the Dry Run Test plan with your songs should now show invoice INV-2026-002
select client_name, invoice_number, jsonb_array_length(must_play_songs) as must_play, genres_avoid
  from public.thunderhouse_event_plans where client_name = 'Dry Run Test';
