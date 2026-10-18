-- Thunder House ENT: a new contract takes its showtime hours from the client's quote
-- (e.g. "5:00 PM - 10:00 PM") instead of always saying 5:00 PM to 11:00 PM.
-- Falls back to 5:00 PM - 11:00 PM only when the quote has no time slot. Existing contracts are not changed.
begin;

create or replace function public.client_get_contract(p_invoice text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare inv public.thunderhouse_invoices; c public.thunderhouse_contracts; pl public.thunderhouse_event_plans;
        tot numeric; dep numeric; v_time text; v_m text[]; v_start text := '5:00 PM'; v_end text := '11:00 PM';
begin
  if coalesce(length(p_key), 0) < 20 then return null; end if;
  select * into inv from public.thunderhouse_invoices where invoice_number = p_invoice and client_key = p_key;
  if not found then return null; end if;
  select * into c from public.thunderhouse_contracts where invoice_number = p_invoice order by created_at limit 1;
  if not found then
    select * into pl from public.thunderhouse_event_plans where invoice_number = p_invoice limit 1;
    tot := coalesce(inv.total_amount, 0);
    dep := least(coalesce(inv.deposit_requested, 200), tot);

    -- the hours the client picked on the website quote
    select event_time into v_time from public.thunderhouse_inquiries where id = inv.inquiry_id;
    v_m := regexp_match(coalesce(v_time, ''), '(\d{1,2}:\d{2}\s*[AaPp][Mm])\s*[-–—to]+\s*(\d{1,2}:\d{2}\s*[AaPp][Mm])');
    if v_m is not null then
      v_start := upper(regexp_replace(v_m[1], '\s*([AaPp][Mm])$', ' \1'));
      v_end   := upper(regexp_replace(v_m[2], '\s*([AaPp][Mm])$', ' \1'));
    end if;

    insert into public.thunderhouse_contracts (
      invoice_number, inquiry_id, client_name, client_email, client_phone, client_address,
      event_type, event_date, event_start_time, event_end_time, venue_name, venue_address,
      total_amount, deposit_amount, balance_due, overtime_rate, package_name, included_addons, status)
    values (
      inv.invoice_number, inv.inquiry_id, inv.client_name, inv.client_email, inv.client_phone,
      coalesce(inv.venue_city, 'Oklahoma City, OK'),
      coalesce(pl.event_type, 'Event Celebration'), inv.event_date, v_start, v_end,
      coalesce(pl.venue_name, inv.venue_city), coalesce(pl.venue_address, inv.venue_city),
      tot, dep, tot - dep, 150.00,
      coalesce(inv.items -> 0 ->> 'description', 'Custom Entertainment Experience'),
      coalesce((select jsonb_agg(concat(e ->> 'description', ' (', coalesce(e ->> 'quantity', '1'), 'x)') order by i)
                  from jsonb_array_elements(case when jsonb_typeof(inv.items) = 'array' then inv.items else '[]'::jsonb end)
                       with ordinality as t(e, i) where i > 1), '[]'::jsonb),
      'Pending Signature')
    returning * into c;
  end if;
  return (to_jsonb(c) - 'signer_ip' - 'signer_user_agent' - 'inquiry_id' - 'notes')
      || jsonb_build_object('invoice', jsonb_build_object(
           'invoice_number', inv.invoice_number, 'square_payment_link', inv.square_payment_link,
           'status', inv.status, 'total_amount', inv.total_amount, 'balance_due', inv.balance_due));
end $function$;

commit;
