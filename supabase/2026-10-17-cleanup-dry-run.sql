-- Thunder House ENT: remove the 10/17 dry-run test (Dry Run Test, INV-2026-002) and reopen Nov 28.
-- Exact ids only; nothing else is touched. A copy of these rows is in backups/2026-10-17-dry-run.json
-- (outside the repo). Refund the $1 in Square separately.
begin;

delete from public.thunderhouse_payments  where id = 'c6a6a4e3-8d5d-4d6d-9ec6-460aca2080c9';
delete from public.thunderhouse_contracts where id = '906f0dcc-d80e-42e4-9192-99ceea82c585';
delete from public.thunderhouse_event_plans where id = '707c5025-7902-4855-a814-c34463e97d0f';

-- reopen Nov 28 (only if it is still locked to the test invoice)
update public.thunderhouse_availability
   set status = 'available', locked_invoice_number = null,
       hold_expires_at = null, hold_name = null, hold_email = null, hold_inquiry_id = null
 where date = '2026-11-28' and locked_invoice_number = 'INV-2026-002';

delete from public.thunderhouse_invoices  where id = '648298d8-7ce4-4aea-9f17-5980f79bacd6';
delete from public.thunderhouse_inquiries where id = 'd04f2cde-d6a2-44bb-a938-c9fe273b0c70';

commit;

-- check: everything 0, and Nov 28 'available'
select (select count(*) from public.thunderhouse_invoices where invoice_number = 'INV-2026-002') as invoices,
       (select count(*) from public.thunderhouse_payments where invoice_number = 'INV-2026-002') as payments,
       (select count(*) from public.thunderhouse_contracts where invoice_number = 'INV-2026-002') as contracts,
       (select count(*) from public.thunderhouse_event_plans where client_name = 'Dry Run Test') as plans,
       (select count(*) from public.thunderhouse_inquiries where email = 'olifedigital+test@gmail.com') as quotes,
       (select status from public.thunderhouse_availability where date = '2026-11-28') as nov_28;
