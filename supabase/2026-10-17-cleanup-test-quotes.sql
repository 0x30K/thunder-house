-- Thunder House ENT: remove the 10/16 test quotes and release the test hold on Nov 21.
-- A copy of the removed rows is saved outside the repo in backups/2026-10-17-test-quotes.json
begin;

-- 1) release the test hold on 2026-11-21 (only if it is still that test hold)
update thunderhouse_availability
   set status = 'available', hold_expires_at = null, hold_name = null,
       hold_email = null, hold_inquiry_id = null
 where date = '2026-11-21'
   and status = 'held'
   and hold_inquiry_id = '855f6126-3d84-446f-861a-7ed6fb0b2b78';

-- 2) delete the five test quotes (exact ids, nothing else)
delete from thunderhouse_inquiries
 where id in ('95543f39-0de7-4d6b-9dee-1e07252f3a6f',
              '7dc2d105-aaec-44ca-85b0-aff0c99fc726',
              '773f6eda-5b35-4356-bad4-d84256050af7',
              'bccee1f2-3384-422e-b9fa-f78484dadd02',
              '855f6126-3d84-446f-861a-7ed6fb0b2b78');

commit;

-- check: should show 1 quote left, and no held days
select (select count(*) from thunderhouse_inquiries) as quotes_left,
       (select count(*) from thunderhouse_availability where status = 'held') as held_days;
