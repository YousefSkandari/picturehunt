begin;
select plan(29);

-- Contestants a, b, c and an admin. Profiles come from the signup trigger.
insert into auth.users (id) values
  ('aaaaaaaa-0000-4000-8000-000000000000'),
  ('bbbbbbbb-0000-4000-8000-000000000000'),
  ('cccccccc-0000-4000-8000-000000000000'),
  ('dddddddd-0000-4000-8000-000000000000');
update public.profiles set is_admin = true where id = 'dddddddd-0000-4000-8000-000000000000';

-- A live litter pick: 250 m around Brick Lane, London.
insert into public.activities (id, title, starts_at, ends_at, draw_at, geofence, published)
values ('11111111-0000-4000-8000-000000000000', 'Brick Lane Litter Blitz',
        now() - interval '1 hour', now() + interval '1 hour', now() + interval '2 hours',
        public.circle_geofence(51.5212, -0.0717, 250), true);
insert into public.rewards (id, activity_id, kind, title, quantity, rank) values
  ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000000', 'cash', '£100', 1, 1),
  ('22222222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000000', 'discount_code', '£10 off', 5, 2);
insert into public.reward_codes (reward_id, code) values
  ('22222222-0000-4000-8000-000000000002', 'CODE-1'),
  ('22222222-0000-4000-8000-000000000002', 'CODE-2');

select is(count(*)::int, 4, 'signup trigger creates a profile per user') from public.profiles;

-- Discovery ---------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000000';

select is((select count(*)::int from public.nearby_activities(51.5230, -0.0720, 5000)), 1,
  'a nearby activity is listed');
select is((select count(*)::int from public.nearby_activities(53.4808, -2.2426, 5000)), 0,
  'an activity in another city is not listed');

select is((public.get_activity('11111111-0000-4000-8000-000000000000') -> 'rewards' -> 0 ->> 'title'), '£100',
  'the activity screen lists the grand prize first');
select is((public.get_activity('11111111-0000-4000-8000-000000000000') ->> 'participation'), null,
  'no participation before joining');

-- Joining -----------------------------------------------------------------
select is((public.join_activity('11111111-0000-4000-8000-000000000000')).contestant_number, 1,
  'first contestant gets number 1');
select is((public.join_activity('11111111-0000-4000-8000-000000000000')).contestant_number, 1,
  'joining twice returns the same participation');

-- Proof -------------------------------------------------------------------
select is(
  (select s.status::text from public.submit_proof('11111111-0000-4000-8000-000000000000',
    'aaaaaaaa-0000-4000-8000-000000000000/1.jpg', 51.5300, -0.0717, 8, now()) s),
  'rejected', 'a photo taken outside the zone is rejected');
select is(
  (select s.reasons from public.submit_proof('11111111-0000-4000-8000-000000000000',
    'aaaaaaaa-0000-4000-8000-000000000000/1b.jpg', 51.5212, -0.0717, 8, now() - interval '3 hours') s),
  array['capture_time_invalid'], 'a photo captured before the activity started is rejected');
select is((select status::text from public.participations where user_id = auth.uid()), 'joined',
  'a rejected attempt leaves the contestant free to retry');
select throws_ok(
  $$ select public.submit_proof('11111111-0000-4000-8000-000000000000',
       'bbbbbbbb-0000-4000-8000-000000000000/x.jpg', 51.5212, -0.0717, 8, now()) $$,
  '42501', null, 'a photo in someone else''s folder is refused');
select is(
  (select s.status::text from public.submit_proof('11111111-0000-4000-8000-000000000000',
    'aaaaaaaa-0000-4000-8000-000000000000/2.jpg', 51.5214, -0.0715, 8, now()) s),
  'verified', 'a good photo inside the zone is verified');
select is((select stars from public.profiles where id = auth.uid()), 150, 'verification pays out stars');
select is((select count(*)::int from public.user_badges where user_id = auth.uid()), 1,
  'verification awards the Street Sweeper badge');
select throws_ok(
  $$ select public.submit_proof('11111111-0000-4000-8000-000000000000',
       'aaaaaaaa-0000-4000-8000-000000000000/3.jpg', 51.5214, -0.0715, 8, now()) $$,
  'P0001', 'You are already verified for this activity', 'a verified contestant cannot submit again');
select throws_ok($$ update public.profiles set stars = 99999 where id = auth.uid() $$,
  '42501', null, 'contestants cannot edit their own stars');
select lives_ok($$ update public.profiles set stage_name = 'Sparkle' where id = auth.uid() $$,
  'contestants can set a stage name');

-- Contestant b: poor GPS gets flagged, then an admin approves it.
set local request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000000';
select is((public.join_activity('11111111-0000-4000-8000-000000000000')).contestant_number, 2,
  'second contestant gets number 2');
select is((select count(*)::int from public.participations), 1,
  'contestants only see their own participations');
select is(
  (select s.status::text from public.submit_proof('11111111-0000-4000-8000-000000000000',
    'bbbbbbbb-0000-4000-8000-000000000000/1.jpg', 51.5212, -0.0717, 55, now()) s),
  'flagged', 'a low-accuracy fix is flagged for review');

-- Contestant c never joins.
set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000000';
select throws_ok(
  $$ select public.submit_proof('11111111-0000-4000-8000-000000000000',
       'cccccccc-0000-4000-8000-000000000000/1.jpg', 51.5212, -0.0717, 8, now()) $$,
  'P0001', 'Join the activity before submitting proof', 'proof needs a participation');
select throws_ok($$ select public.run_draw('11111111-0000-4000-8000-000000000000') $$,
  '42501', 'Admins only', 'contestants cannot run the draw');

-- Admin review and the draw -------------------------------------------------
set local request.jwt.claim.sub = 'dddddddd-0000-4000-8000-000000000000';
select is(
  (select r.status::text from public.review_submission(
    (select s.id from public.submissions s where s.status = 'flagged'), true) r),
  'verified', 'an admin can approve a flagged submission');
select throws_ok($$ select public.run_draw('11111111-0000-4000-8000-000000000000') $$,
  'P0001', 'The draw is not due yet', 'the draw waits for its time');

reset role;
update public.activities set draw_at = now(), ends_at = now() where id = '11111111-0000-4000-8000-000000000000';
set local role authenticated;

select is((select count(*)::int from public.run_draw('11111111-0000-4000-8000-000000000000')), 2,
  'each verified contestant wins at most one prize');
reset role;
select is((select count(*)::int from public.draw_winners w
           join public.rewards r on r.id = w.reward_id where r.rank = 1), 1,
  'the grand prize is drawn first');
select is((select count(*)::int from public.draw_winners where code_id is not null), 1,
  'a discount code goes to the code winner');
set local role authenticated;
select throws_ok($$ select public.run_draw('11111111-0000-4000-8000-000000000000') $$,
  'P0001', 'This draw has already run', 'a draw runs once');

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000000';
select is((select count(*)::int from public.my_prizes()), 1, 'a winner sees their prize');

select * from finish();
rollback;
