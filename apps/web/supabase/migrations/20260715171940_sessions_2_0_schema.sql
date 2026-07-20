/*
# Sessions 2.0 — common header, expected athletes, training material/logistics

1. Modified Tables
   - `training_sessions`
     - `microcycle` (text, nullable) — e.g. "Microcycle 3", week-within-season label
     - `training_unit` (text, nullable) — e.g. "Unit 2", sub-period within microcycle
     - `material` (text, nullable) — equipment needed for the session (Training/Gym)
     - `logistics` (text, nullable) — logistics notes for the session (Training/Gym)
   - `exercises`
     - `training_type` (text, nullable) — type tag for this exercise (e.g. Tactical, Physical)

2. New Tables
   - `session_athletes`
     - Stores the expected athlete list for a session (set BEFORE the session starts).
     - Becomes the attendance list during Close Session.
     - Supports guest players from other teams.
     - `id` (uuid, PK)
     - `session_id` (uuid, FK → training_sessions, CASCADE)
     - `athlete_id` (uuid, FK → athletes, CASCADE)
     - `is_guest` (boolean, default false) — marks guest players from other teams
     - `created_at` (timestamptz)
     - UNIQUE(session_id, athlete_id)

3. Security
   - RLS enabled on session_athletes.
   - Policies: TO anon, authenticated — full CRUD (single-tenant app, no auth).

4. Notes
   - session_athletes is separate from team_athletes so that guest players can be
     added to a session without joining the team roster.
   - Close Session will read from session_athletes (not team_athletes) for attendance.
   - Video sessions do not use session_athletes (no athlete management required).
*/

-- Add columns to training_sessions
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS microcycle text,
  ADD COLUMN IF NOT EXISTS training_unit text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS logistics text;

-- Add training_type to exercises
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS training_type text;

-- session_athletes table
CREATE TABLE IF NOT EXISTS session_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);

ALTER TABLE session_athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_session_athletes" ON session_athletes;
CREATE POLICY "anon_select_session_athletes" ON session_athletes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_session_athletes" ON session_athletes;
CREATE POLICY "anon_insert_session_athletes" ON session_athletes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_session_athletes" ON session_athletes;
CREATE POLICY "anon_update_session_athletes" ON session_athletes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_session_athletes" ON session_athletes;
CREATE POLICY "anon_delete_session_athletes" ON session_athletes FOR DELETE
  TO anon, authenticated USING (true);
