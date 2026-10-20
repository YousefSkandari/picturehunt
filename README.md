# Flimpy

Flimpy turns real-world good deeds into a live game show. Councils, shops and causes post geofenced challenges (a litter pick, a pop-up trail); contestants go there, prove it with a live photo, and are entered into a prize draw for cash, discount codes and badges.

| Folder | What it is |
| --- | --- |
| `app/` | The mobile app: Expo (SDK 58), Expo Router, React Native Maps, Supabase JS |
| `supabase/` | Database schema, row level security, RPCs and pgTAP tests (Postgres + PostGIS) |
| `scripts/test-db.sh` | Runs the migrations and tests on a plain Postgres, no Docker needed |

## How a show works

1. `nearby_activities(lat, lng)` lists published challenges near the contestant.
2. `join_activity(id)` hands out a contestant number.
3. Inside the zone, the app unlocks the camera, uploads the photo to the private `proofs` bucket under the user's own folder, and calls `submit_proof(...)`.
4. The server judges the proof: outside the zone or the time window is **rejected**; poor GPS accuracy or a mocked location is **flagged** for an admin (`review_submission`); everything else is **verified**, which pays stars and the Street Sweeper badge.
5. After `draw_at`, `run_draw(id)` (or `run_due_draws()` from a pg_cron job) picks winners at random from verified contestants, grand prize first, one prize per person. Winners see their prize and any discount code through `my_prizes()`.

## Run it

```bash
# Database (needs Docker for the local Supabase stack)
npx supabase start          # applies supabase/migrations and supabase/seed.sql
npx supabase test db        # pgTAP tests

# App
cd app
cp .env.example .env.local  # paste the API URL and publishable key from `supabase status`
npm install
npx expo start              # open in Expo Go or a development build
```

Without Docker, `PGHOST=... PGPORT=... PGUSER=postgres scripts/test-db.sh` runs the same tests on any Postgres 16+ with PostGIS and pgTAP installed.

Sign-in uses email one-time codes, which work on a fresh Supabase project. The designs use phone numbers; switch to phone OTP once an SMS provider is set up in Supabase Auth.
