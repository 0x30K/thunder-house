-- Thunder House ENT: shared bank of saved run-of-show templates for Thunder Crate.
-- Every staff member can see and use every run; only the person who created a run can rename or delete it.
begin;

create table if not exists public.thunderhouse_saved_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  moments jsonb not null default '[]'::jsonb,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- the creator and their name are set by the database, never by the app
create or replace function public.th_saved_run_stamp() returns trigger
language plpgsql security definer set search_path to 'public' as $f$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    select coalesce(nullif(trim(display_name), ''), email) into new.created_by_name
      from public.thunderhouse_staff where id = auth.uid();
  else
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $f$;

drop trigger if exists th_saved_run_stamp on public.thunderhouse_saved_runs;
create trigger th_saved_run_stamp before insert or update on public.thunderhouse_saved_runs
  for each row execute function public.th_saved_run_stamp();

alter table public.thunderhouse_saved_runs enable row level security;

drop policy if exists "staff read runs" on public.thunderhouse_saved_runs;
create policy "staff read runs" on public.thunderhouse_saved_runs
  for select to authenticated using (public.is_staff());

drop policy if exists "staff create own runs" on public.thunderhouse_saved_runs;
create policy "staff create own runs" on public.thunderhouse_saved_runs
  for insert to authenticated with check (public.is_staff() and created_by = auth.uid());

drop policy if exists "creator renames run" on public.thunderhouse_saved_runs;
create policy "creator renames run" on public.thunderhouse_saved_runs
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "creator deletes run" on public.thunderhouse_saved_runs;
create policy "creator deletes run" on public.thunderhouse_saved_runs
  for delete to authenticated using (created_by = auth.uid());

revoke all on public.thunderhouse_saved_runs from anon;
grant select, insert, update, delete on public.thunderhouse_saved_runs to authenticated;

commit;

-- check: should show the table with row security on (true)
select relname, relrowsecurity from pg_class where relname = 'thunderhouse_saved_runs';
