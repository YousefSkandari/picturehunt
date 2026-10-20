-- Local demo data: one live litter pick around Brick Lane, London.
insert into public.activities (id, title, description, category, proof_instructions, sponsor, starts_at, ends_at, draw_at, geofence, max_participants, published)
values (
  '00000000-0000-4000-8000-000000000001',
  'The Great Brick Lane Litter Blitz',
  'Help clear Brick Lane and the side streets. Bags and pickers at the Flimpy booth.',
  'litter_pick',
  'Take one photo of your filled bags inside the zone.',
  null,
  now() - interval '1 hour',
  now() + interval '2 hours',
  now() + interval '2 hours 15 minutes',
  public.circle_geofence(51.5212, -0.0717, 250),
  60,
  true
);

insert into public.rewards (activity_id, kind, title, quantity, rank) values
  ('00000000-0000-4000-8000-000000000001', 'cash', '£100 cash', 1, 1),
  ('00000000-0000-4000-8000-000000000001', 'cash', '£50 cash', 1, 2),
  ('00000000-0000-4000-8000-000000000001', 'discount_code', '£10 off at a partner shop', 10, 3);
