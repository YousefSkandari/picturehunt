#!/usr/bin/env bash
# Runs the migrations and pgTAP tests against a plain Postgres with PostGIS and
# pgTAP installed, without Docker. With the Supabase CLI and Docker you can use
# `supabase test db` instead.
#
#   PGHOST=... PGPORT=... PGUSER=postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."

db=flimpy_test
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $db" -c "create database $db"
run() { psql -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }

run -f supabase/tests/supabase-stub.sql
for f in supabase/migrations/*.sql; do run -f "$f"; done
run -c 'create extension if not exists pgtap with schema extensions'

status=0
for t in supabase/tests/database/*.sql; do
  echo "# $t"
  out=$(psql -X -v ON_ERROR_STOP=1 -d "$db" -c 'set search_path = public, extensions' -f "$t" -t -A 2>&1) || status=1
  echo "$out"
  grep -qE '^not ok|# Looks like' <<<"$out" && status=1
done
exit $status
