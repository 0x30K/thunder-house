-- =====================================================================
-- THUNDER HOUSE ENT: Staff-Gated Guest Song Requests (2026-10-19)
--
-- Policy: Hidden by default. Only enabled when staff explicitly toggle
-- it for an event. Allows guests to submit requests via a dedicated code,
-- couples to review/approve in their portal, and DJs to coordinate cues.
-- =====================================================================

begin;

-- 1. Extend thunderhouse_event_plans
alter table public.thunderhouse_event_plans
  add column if not exists guest_requests_enabled boolean not null default false,
  add column if not exists guest_request_token text unique default 'rq-' || encode(gen_random_bytes(12), 'hex');

-- Backfill tokens for any existing plans that lack one
update public.thunderhouse_event_plans
   set guest_request_token = 'rq-' || encode(gen_random_bytes(12), 'hex')
 where guest_request_token is null;

-- 2. Create thunderhouse_guest_requests table
create table if not exists public.thunderhouse_guest_requests (
  id             uuid primary key default gen_random_uuid(),
  event_plan_id  uuid not null references public.thunderhouse_event_plans(id) on delete cascade,
  guest_name     text not null check (length(trim(guest_name)) between 1 and 100),
  song_title     text not null check (length(trim(song_title)) between 1 and 200),
  artist_name    text check (length(trim(artist_name)) <= 200),
  dedication     text check (length(trim(dedication)) <= 500),
  status         text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'played')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists thunderhouse_guest_requests_event_plan_idx
  on public.thunderhouse_guest_requests (event_plan_id);

alter table public.thunderhouse_guest_requests enable row level security;

-- Staff full access
drop policy if exists "Staff manage guest requests" on public.thunderhouse_guest_requests;
create policy "Staff manage guest requests" on public.thunderhouse_guest_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

revoke all on public.thunderhouse_guest_requests from anon;
grant select, insert, update, delete on public.thunderhouse_guest_requests to authenticated;

-- 3. Public RPC: Get event info for guest request page
create or replace function public.get_guest_request_info(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pl public.thunderhouse_event_plans;
begin
  if coalesce(length(trim(p_token)), 0) < 5 then return null; end if;
  select * into pl from public.thunderhouse_event_plans where guest_request_token = trim(p_token);
  if not found then return null; end if;
  if not coalesce(pl.guest_requests_enabled, false) then
    return jsonb_build_object('enabled', false, 'reason', 'Guest song requests are currently closed for this event.');
  end if;
  return jsonb_build_object(
    'enabled', true,
    'client_name', pl.client_name,
    'event_type', coalesce(pl.event_type, 'Celebration'),
    'event_date', pl.event_date,
    'venue_name', pl.venue_name
  );
end $$;

-- 4. Public RPC: Guest submits a song request
create or replace function public.submit_guest_song_request(
  p_token text,
  p_guest_name text,
  p_song text,
  p_artist text,
  p_dedication text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pl public.thunderhouse_event_plans; req_id uuid;
begin
  if coalesce(length(trim(p_token)), 0) < 5 then
    return jsonb_build_object('success', false, 'error', 'Invalid request link.');
  end if;
  select * into pl from public.thunderhouse_event_plans where guest_request_token = trim(p_token);
  if not found then
    return jsonb_build_object('success', false, 'error', 'Event not found.');
  end if;
  if not coalesce(pl.guest_requests_enabled, false) then
    return jsonb_build_object('success', false, 'error', 'Guest song requests are not enabled for this event.');
  end if;
  if length(trim(coalesce(p_song, ''))) < 1 then
    return jsonb_build_object('success', false, 'error', 'Song title is required.');
  end if;
  if length(trim(coalesce(p_guest_name, ''))) < 1 then
    return jsonb_build_object('success', false, 'error', 'Your name is required.');
  end if;

  insert into public.thunderhouse_guest_requests (
    event_plan_id, guest_name, song_title, artist_name, dedication, status
  ) values (
    pl.id,
    left(trim(p_guest_name), 100),
    left(trim(p_song), 200),
    nullif(left(trim(p_artist), 200), ''),
    nullif(left(trim(p_dedication), 500), ''),
    'pending'
  ) returning id into req_id;

  return jsonb_build_object('success', true, 'id', req_id);
end $$;

-- 5. Client RPC: Fetch guest requests in portal
create or replace function public.client_get_guest_requests(p_token text, p_invoice text, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; pl public.thunderhouse_event_plans; reqs jsonb;
begin
  f := public.th_find_client_plan(p_token, p_invoice, p_key, false);
  if f is null then return '[]'::jsonb; end if;
  select * into pl from public.thunderhouse_event_plans where id = (f ->> 'id')::uuid;
  if not found or not coalesce(pl.guest_requests_enabled, false) then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'guest_name', r.guest_name,
      'song_title', r.song_title,
      'artist_name', r.artist_name,
      'dedication', r.dedication,
      'status', r.status,
      'created_at', r.created_at
    ) order by r.created_at desc
  ), '[]'::jsonb)
    into reqs
    from public.thunderhouse_guest_requests r
   where r.event_plan_id = pl.id;
  return reqs;
end $$;

-- 6. Client RPC: Approve or decline guest request
create or replace function public.client_set_guest_request_status(
  p_token text, p_invoice text, p_key text, p_request_id uuid, p_status text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; pl public.thunderhouse_event_plans;
begin
  if p_status not in ('approved', 'declined', 'pending') then
    return jsonb_build_object('success', false, 'error', 'Invalid status.');
  end if;
  f := public.th_find_client_plan(p_token, p_invoice, p_key, false);
  if f is null then return jsonb_build_object('success', false, 'error', 'Invalid planning link.'); end if;
  select * into pl from public.thunderhouse_event_plans where id = (f ->> 'id')::uuid;
  if not found or not coalesce(pl.guest_requests_enabled, false) then
    return jsonb_build_object('success', false, 'error', 'Guest requests are not enabled for this event.');
  end if;

  update public.thunderhouse_guest_requests
     set status = p_status, updated_at = now()
   where id = p_request_id and event_plan_id = pl.id;

  return jsonb_build_object('success', true);
end $$;

-- 7. Update th_client_plan_json to include guest request status and token
create or replace function public.th_client_plan_json(pl public.thunderhouse_event_plans, p_key text)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', pl.id, 'portal_token', pl.portal_token, 'invoice_number', pl.invoice_number, 'client_key', p_key,
    'client_name', pl.client_name, 'event_type', pl.event_type, 'event_date', pl.event_date,
    'venue_name', pl.venue_name, 'venue_city', pl.venue_city, 'guest_count', pl.guest_count,
    'spotify_playlist_url', pl.spotify_playlist_url, 'apple_music_url', pl.apple_music_url,
    'genres_preferred', pl.genres_preferred, 'genres_avoid', pl.genres_avoid,
    'must_play_songs', pl.must_play_songs, 'play_if_possible_songs', pl.play_if_possible_songs,
    'do_not_play_songs', pl.do_not_play_songs, 'special_moments', pl.special_moments,
    'timeline_items', pl.timeline_items, 'vip_names_pronunciations', pl.vip_names_pronunciations,
    'special_announcements', pl.special_announcements, 'mc_notes', pl.mc_notes,
    'last_saved_at', pl.last_saved_at, 'status', pl.status,
    'guest_requests_enabled', coalesce(pl.guest_requests_enabled, false),
    'guest_request_token', pl.guest_request_token);
$$;

-- 8. Permissions
grant execute on function public.get_guest_request_info(text) to anon, authenticated;
grant execute on function public.submit_guest_song_request(text, text, text, text, text) to anon, authenticated;
grant execute on function public.client_get_guest_requests(text, text, text) to anon, authenticated;
grant execute on function public.client_set_guest_request_status(text, text, text, uuid, text) to anon, authenticated;

commit;
