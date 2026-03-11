# ContriBot Database Schema

This directory contains the PostgreSQL schema and migrations for ContriBot, designed to run on Supabase.

## Files

- `schema.sql`: The complete, idempotent database schema. Safe to run multiple times.
- `seed.sql`: Minimal seed data for local testing and development.
- `migrations/001_initial.sql`: The initial migration file (identical to `schema.sql`).

## How to Apply the Schema in Supabase

Follow these steps to set up your Supabase database:

1. Go to [supabase.com](https://supabase.com) and open your project.
2. Click on **SQL Editor** in the left sidebar.
3. Click **+ New query**.
4. Copy the entire contents of `schema.sql` and paste it into the editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Check the **Table Editor** (left sidebar) to verify that all 9 tables were created successfully.

## Local Testing

If you are setting up a local development environment and need some dummy data to test the UI:

1. Open a new query in the Supabase SQL Editor.
2. Paste the contents of `seed.sql`.
3. Click **Run**.

*Note: Do not run `seed.sql` in your production database unless you want dummy test users and repositories.*

## Architecture Notes

- **RLS (Row Level Security):** RLS is explicitly disabled for all tables (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`). ContriBot interacts with Supabase using the Service Role Key from the backend, which bypasses RLS anyway. Security is handled at the API layer (FastAPI) via Firebase Authentication middleware.
- **Idempotency:** The schema uses `IF NOT EXISTS` for tables and `CREATE OR REPLACE` for functions, making it safe to re-run if you need to ensure all tables exist.
- **Triggers:** Every table (except append-only logs) has an `updated_at` trigger that automatically updates the timestamp whenever a row is modified.
