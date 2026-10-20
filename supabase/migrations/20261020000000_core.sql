-- Flimpy core schema: activities with geofences, participation, photo-proof
-- submissions verified on the server, and prize draws.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.participation_status as enum ('joined', 'verified', 'flagged', 'rejected');
create type public.submission_status as enum ('verified', 'flagged', 'rejected');
create type public.reward_kind as enum ('cash', 'discount_code', 'other');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  stage_name text check (char_length(stage_name) between 1 and 18),
  avatar text not null default 'sparkle',
  stars integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'litter_pick',
  proof_instructions text not null default '',
  sponsor text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  draw_at timestamptz not null,
  -- The area people must be inside. Polygons let a zone follow streets or a
  -- park boundary; use public.circle_geofence() for a simple radius.
  geofence extensions.geography (polygon, 4326) not null,
  max_participants integer check (max_participants > 0),
  stars_reward integer not null default 150,
  published boolean not null default false,
  drawn_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (draw_at >= ends_at)
);

create index activities_geofence_idx on public.activities using gist (geofence);
create index activities_window_idx on public.activities (ends_at) where published;

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  kind public.reward_kind not null,
  title text not null,
  quantity integer not null default 1 check (quantity > 0),
  -- Lower ranks are drawn first, so the grand prize goes out before the rest.
  rank integer not null default 1
);

create index rewards_activity_idx on public.rewards (activity_id);

-- Discount codes are secret until won, so they live apart from rewards and
-- have no read policy except for the person they were given to.
create table public.reward_codes (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards (id) on delete cascade,
  code text not null,
  unique (reward_id, code)
);

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  contestant_number integer not null,
  status public.participation_status not null default 'joined',
  joined_at timestamptz not null default now(),
  unique (activity_id, user_id),
  unique (activity_id, contestant_number)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations (id) on delete cascade,
  photo_path text not null,
  location extensions.geography (point, 4326) not null,
  accuracy_m real not null,
  is_mocked boolean not null default false,
  captured_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  status public.submission_status not null,
  reasons text[] not null default '{}',
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz
);

create index submissions_participation_idx on public.submissions (participation_id);

create table public.draw_winners (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  code_id uuid unique references public.reward_codes (id),
  drawn_at timestamptz not null default now(),
  redeemed_at timestamptz,
  -- One prize per person per activity keeps the draw spread out.
  unique (activity_id, user_id)
);

create table public.badges (
  slug text primary key,
  name text not null,
  description text not null
);

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_slug text not null references public.badges (slug),
  activity_id uuid references public.activities (id) on delete set null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_slug, activity_id)
);

insert into public.badges (slug, name, description) values
  ('street_sweeper', 'Street Sweeper', 'Verified at a litter pick.'),
  ('first_win', 'First Win', 'Won a prize in a live draw.');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- A round zone of radius_m metres around a point, for activities that do not
-- need a hand-drawn boundary.
create function public.circle_geofence(lat double precision, lng double precision, radius_m double precision)
returns extensions.geography
language sql
immutable
set search_path = ''
as $$
  select extensions.st_buffer(
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
    radius_m
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_codes enable row level security;
alter table public.participations enable row level security;
alter table public.submissions enable row level security;
alter table public.draw_winners enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy "own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- People may rename themselves and change avatar, never their stars or role.
revoke update on public.profiles from authenticated;
grant update (stage_name, avatar) on public.profiles to authenticated;

create policy "published activities" on public.activities
  for select to anon, authenticated using (published or public.is_admin());
create policy "admins manage activities" on public.activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "rewards of visible activities" on public.rewards
  for select to anon, authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and (a.published or public.is_admin())));
create policy "admins manage rewards" on public.rewards
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins manage codes" on public.reward_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "own participations" on public.participations
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "own submissions" on public.submissions
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.participations p where p.id = participation_id and p.user_id = auth.uid()
  ));

create policy "own wins" on public.draw_winners
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "badges are public" on public.badges
  for select to anon, authenticated using (true);

create policy "own badges" on public.user_badges
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPCs: the only way to join, submit proof and draw winners
-- ---------------------------------------------------------------------------

-- Published activities near a point that have not finished yet, nearest first.
create function public.nearby_activities(lat double precision, lng double precision, radius_m double precision default 25000)
returns table (
  id uuid,
  title text,
  category text,
  sponsor text,
  starts_at timestamptz,
  ends_at timestamptz,
  draw_at timestamptz,
  distance_m double precision,
  center_lat double precision,
  center_lng double precision,
  geofence jsonb,
  participant_count bigint,
  max_participants integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with here as (
    select extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography as g
  )
  select
    a.id, a.title, a.category, a.sponsor, a.starts_at, a.ends_at, a.draw_at,
    extensions.st_distance(a.geofence, here.g) as distance_m,
    extensions.st_y(extensions.st_centroid(a.geofence::extensions.geometry)) as center_lat,
    extensions.st_x(extensions.st_centroid(a.geofence::extensions.geometry)) as center_lng,
    extensions.st_asgeojson(a.geofence)::jsonb as geofence,
    (select count(*) from public.participations p where p.activity_id = a.id) as participant_count,
    a.max_participants
  from public.activities a, here
  where a.published
    and a.ends_at > now()
    and extensions.st_dwithin(a.geofence, here.g, radius_m)
  order by distance_m, a.starts_at;
$$;

create function public.join_activity(p_activity_id uuid)
returns public.participations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity public.activities;
  v_count integer;
  v_row public.participations;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join' using errcode = '28000';
  end if;

  select * into v_activity from public.activities where id = p_activity_id and published for update;
  if not found then
    raise exception 'Activity not found' using errcode = 'P0002';
  end if;
  if v_activity.ends_at <= now() then
    raise exception 'This activity has finished' using errcode = 'P0001';
  end if;

  select * into v_row from public.participations where activity_id = p_activity_id and user_id = auth.uid();
  if found then
    return v_row;
  end if;

  select count(*) into v_count from public.participations where activity_id = p_activity_id;
  if v_activity.max_participants is not null and v_count >= v_activity.max_participants then
    raise exception 'This activity is full' using errcode = 'P0001';
  end if;

  insert into public.participations (activity_id, user_id, contestant_number)
  values (p_activity_id, auth.uid(), v_count + 1)
  returning * into v_row;
  return v_row;
end;
$$;

-- Records a proof photo and judges it. Hard failures (outside the zone or the
-- time window) are rejected; soft signals (poor GPS accuracy, a mocked
-- location) are flagged for an admin to review; everything else is verified.
create function public.submit_proof(
  p_activity_id uuid,
  p_photo_path text,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m real,
  p_captured_at timestamptz,
  p_is_mocked boolean default false
)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity public.activities;
  v_part public.participations;
  v_point extensions.geography;
  v_reasons text[] := '{}';
  v_status public.submission_status;
  v_row public.submissions;
begin
  if auth.uid() is null then
    raise exception 'Sign in to submit' using errcode = '28000';
  end if;

  select * into v_activity from public.activities where id = p_activity_id and published;
  if not found then
    raise exception 'Activity not found' using errcode = 'P0002';
  end if;

  select * into v_part from public.participations
  where activity_id = p_activity_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'Join the activity before submitting proof' using errcode = 'P0001';
  end if;
  if v_part.status = 'verified' then
    raise exception 'You are already verified for this activity' using errcode = 'P0001';
  end if;

  -- Photos must sit in the uploader's own folder of the proofs bucket.
  if split_part(p_photo_path, '/', 1) <> auth.uid()::text then
    raise exception 'Photo must be uploaded to your own folder' using errcode = '42501';
  end if;

  v_point := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;

  if now() < v_activity.starts_at or now() > v_activity.ends_at then
    v_reasons := array_append(v_reasons, 'outside_time_window');
  end if;
  if p_captured_at < v_activity.starts_at or p_captured_at > v_activity.ends_at
     or p_captured_at > now() + interval '1 minute'
     or p_captured_at < now() - interval '10 minutes' then
    v_reasons := array_append(v_reasons, 'capture_time_invalid');
  end if;
  if not extensions.st_covers(v_activity.geofence, v_point) then
    v_reasons := array_append(v_reasons, 'outside_geofence');
  end if;

  if cardinality(v_reasons) > 0 then
    v_status := 'rejected';
  else
    if p_accuracy_m > 30 then
      v_reasons := array_append(v_reasons, 'low_gps_accuracy');
    end if;
    if p_is_mocked then
      v_reasons := array_append(v_reasons, 'mocked_location');
    end if;
    v_status := case when cardinality(v_reasons) > 0 then 'flagged' else 'verified' end;
  end if;

  insert into public.submissions (participation_id, photo_path, location, accuracy_m, is_mocked, captured_at, status, reasons)
  values (v_part.id, p_photo_path, v_point, p_accuracy_m, p_is_mocked, p_captured_at, v_status, v_reasons)
  returning * into v_row;

  -- A rejected attempt does not change the participation, so they can retry.
  if v_status = 'verified' then
    perform public._verify_participation(v_part.id);
  elsif v_status = 'flagged' then
    update public.participations set status = 'flagged' where id = v_part.id;
  end if;

  return v_row;
end;
$$;

-- Marks a participation verified and pays out stars and the badge, once.
create function public._verify_participation(p_participation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part public.participations;
  v_stars integer;
begin
  update public.participations set status = 'verified'
  where id = p_participation_id and status <> 'verified'
  returning * into v_part;
  if not found then
    return;
  end if;

  select stars_reward into v_stars from public.activities where id = v_part.activity_id;
  update public.profiles set stars = stars + v_stars where id = v_part.user_id;
  insert into public.user_badges (user_id, badge_slug, activity_id)
  values (v_part.user_id, 'street_sweeper', v_part.activity_id)
  on conflict do nothing;
end;
$$;

revoke execute on function public._verify_participation(uuid) from public, anon, authenticated;

-- Admin decision on a flagged submission.
create function public.review_submission(p_submission_id uuid, p_approve boolean)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.submissions;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  update public.submissions
  set status = case when p_approve then 'verified'::public.submission_status else 'rejected'::public.submission_status end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_submission_id and status = 'flagged'
  returning * into v_row;
  if not found then
    raise exception 'No flagged submission with that id' using errcode = 'P0002';
  end if;

  if p_approve then
    perform public._verify_participation(v_row.participation_id);
  else
    update public.participations set status = 'rejected' where id = v_row.participation_id;
  end if;
  return v_row;
end;
$$;

-- Draws winners for an activity whose draw time has passed. Each prize unit
-- goes to a different verified contestant, picked uniformly at random, grand
-- prize first. Runs once per activity.
create function public._run_draw_unchecked(p_activity_id uuid)
returns setof public.draw_winners
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity public.activities;
  v_reward public.rewards;
  v_user uuid;
  v_code uuid;
  i integer;
begin
  select * into v_activity from public.activities where id = p_activity_id for update;
  if not found then
    raise exception 'Activity not found' using errcode = 'P0002';
  end if;
  if v_activity.drawn_at is not null then
    raise exception 'This draw has already run' using errcode = 'P0001';
  end if;
  if now() < v_activity.draw_at then
    raise exception 'The draw is not due yet' using errcode = 'P0001';
  end if;

  for v_reward in
    select * from public.rewards where activity_id = p_activity_id order by rank, id
  loop
    for i in 1..v_reward.quantity loop
      select p.user_id into v_user
      from public.participations p
      where p.activity_id = p_activity_id
        and p.status = 'verified'
        and not exists (select 1 from public.draw_winners w where w.activity_id = p_activity_id and w.user_id = p.user_id)
      order by random()
      limit 1;
      exit when v_user is null;

      v_code := null;
      if v_reward.kind = 'discount_code' then
        select c.id into v_code
        from public.reward_codes c
        where c.reward_id = v_reward.id
          and not exists (select 1 from public.draw_winners w where w.code_id = c.id)
        limit 1;
      end if;

      insert into public.draw_winners (activity_id, reward_id, user_id, code_id)
      values (p_activity_id, v_reward.id, v_user, v_code);

      insert into public.user_badges (user_id, badge_slug, activity_id)
      values (v_user, 'first_win', p_activity_id)
      on conflict do nothing;
    end loop;
  end loop;

  update public.activities set drawn_at = now() where id = p_activity_id;
  return query select * from public.draw_winners where activity_id = p_activity_id;
end;
$$;

revoke execute on function public._run_draw_unchecked(uuid) from public, anon, authenticated;

create function public.run_draw(p_activity_id uuid)
returns setof public.draw_winners
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query select * from public._run_draw_unchecked(p_activity_id);
end;
$$;

-- Runs every draw that is due. Meant for a pg_cron job, e.g. every minute.
create function public.run_due_draws()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  n integer := 0;
begin
  for v_id in
    select id from public.activities where published and drawn_at is null and draw_at <= now()
  loop
    perform public._run_draw_unchecked(v_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.run_due_draws() from public, anon, authenticated;

-- What a winner sees: their prizes, with the code revealed only to them.
create function public.my_prizes()
returns table (
  win_id uuid,
  activity_id uuid,
  activity_title text,
  reward_title text,
  kind public.reward_kind,
  code text,
  drawn_at timestamptz,
  redeemed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, a.id, a.title, r.title, r.kind, c.code, w.drawn_at, w.redeemed_at
  from public.draw_winners w
  join public.activities a on a.id = w.activity_id
  join public.rewards r on r.id = w.reward_id
  left join public.reward_codes c on c.id = w.code_id
  where w.user_id = auth.uid()
  order by w.drawn_at desc;
$$;

-- Everything the activity screen needs in one call: the activity, its zone as
-- GeoJSON, its prizes, how full it is, and the caller's own participation.
create function public.get_activity(p_activity_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'description', a.description,
    'category', a.category,
    'proof_instructions', a.proof_instructions,
    'sponsor', a.sponsor,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'draw_at', a.draw_at,
    'drawn_at', a.drawn_at,
    'stars_reward', a.stars_reward,
    'max_participants', a.max_participants,
    'geofence', extensions.st_asgeojson(a.geofence)::jsonb,
    'center_lat', extensions.st_y(extensions.st_centroid(a.geofence::extensions.geometry)),
    'center_lng', extensions.st_x(extensions.st_centroid(a.geofence::extensions.geometry)),
    'participant_count', (select count(*) from public.participations p where p.activity_id = a.id),
    'rewards', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'title', r.title, 'quantity', r.quantity, 'rank', r.rank) order by r.rank)
      from public.rewards r where r.activity_id = a.id
    ), '[]'::jsonb),
    'participation', (
      select jsonb_build_object('id', p.id, 'contestant_number', p.contestant_number, 'status', p.status)
      from public.participations p where p.activity_id = a.id and p.user_id = auth.uid()
    )
  )
  from public.activities a
  where a.id = p_activity_id and (a.published or public.is_admin());
$$;
