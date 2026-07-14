/*
# Add athletes and team_athletes tables, add age_category to teams

1. New Tables
   - `athletes`: stores athlete profiles (name, DOB, gender, jersey number, position, status)
   - `team_athletes`: join table linking athletes to teams (many-to-many)

2. Modified Tables
   - `teams`: added `age_category` column (text, nullable)

3. Security
   - RLS enabled on both new tables
   - anon + authenticated CRUD (single-tenant, no auth)
*/

-- Add age_category to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS age_category text;

-- ATHLETES
CREATE TABLE IF NOT EXISTS athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  jersey_number integer,
  position text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_athletes" ON athletes;
CREATE POLICY "anon_select_athletes" ON athletes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_athletes" ON athletes;
CREATE POLICY "anon_insert_athletes" ON athletes FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_athletes" ON athletes;
CREATE POLICY "anon_update_athletes" ON athletes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_athletes" ON athletes;
CREATE POLICY "anon_delete_athletes" ON athletes FOR DELETE TO anon, authenticated USING (true);

-- TEAM_ATHLETES (join table)
CREATE TABLE IF NOT EXISTS team_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_team_athletes_team ON team_athletes(team_id);
CREATE INDEX IF NOT EXISTS idx_team_athletes_athlete ON team_athletes(athlete_id);

ALTER TABLE team_athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_team_athletes" ON team_athletes;
CREATE POLICY "anon_select_team_athletes" ON team_athletes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_team_athletes" ON team_athletes;
CREATE POLICY "anon_insert_team_athletes" ON team_athletes FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_team_athletes" ON team_athletes;
CREATE POLICY "anon_update_team_athletes" ON team_athletes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_team_athletes" ON team_athletes;
CREATE POLICY "anon_delete_team_athletes" ON team_athletes FOR DELETE TO anon, authenticated USING (true);
