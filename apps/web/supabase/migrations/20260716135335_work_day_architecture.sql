/*
# Sprint 4.5 — Work Day Architecture

Introduces the Season → Macrocycle → Mesocycle → Microcycle → Work Day → Session hierarchy.
Sessions become children of Work Days. A Work Day groups one or more Sessions on the same date.

1. New Tables
   - `seasons`
     - `id`, `team_id` (FK → teams CASCADE), `name`, `start_date`, `end_date`
     - `training_days` (text[] — weekday names e.g. ['Monday','Wednesday','Friday'])
     - `competition_days` (text[] — weekday names, nullable)
     - `objective` (text, nullable), `notes` (text, nullable)
     - `created_at`, `updated_at`
   - `macrocycles`
     - `id`, `season_id` (FK → seasons CASCADE), `name`, `start_date`, `end_date`
     - `objective` (text, nullable), `order_index` (int)
   - `mesocycles`
     - `id`, `macrocycle_id` (FK → macrocycles CASCADE), `name`, `start_date`, `end_date`
     - `objective` (text, nullable), `order_index` (int)
   - `microcycles`
     - `id`, `mesocycle_id` (FK → mesocycles CASCADE), `name`, `start_date`, `end_date`
     - `objective` (text, nullable), `order_index` (int)
   - `work_days`
     - `id`, `microcycle_id` (FK → microcycles CASCADE, nullable — allows standalone work days)
     - `team_id` (FK → teams CASCADE), `date` (date), `objective` (text, nullable)
     - `notes` (text, nullable), `status` (text DEFAULT 'planned', CHECK in 'planned','completed','cancelled')
     - `created_at`, `updated_at`
     - UNIQUE(team_id, date) — one work day per team per date

2. Modified Tables
   - `training_sessions`
     - `work_day_id` (uuid, FK → work_days CASCADE, nullable for backward compat)
   - `exercises`
     - `objective` already exists — no change needed

3. Security
   - RLS enabled on all new tables. Policies: TO anon, authenticated — full CRUD.

4. Notes
   - All hierarchy levels have an `objective` field for cascading.
   - work_days.microcycle_id is nullable so work days can exist without a season structure.
   - training_sessions.work_day_id is nullable for backward compatibility with existing sessions.
   - When a Work Day is created, sessions for that date are linked to it.
*/

-- seasons
CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  training_days text[] DEFAULT '{}',
  competition_days text[],
  objective text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_seasons" ON seasons;
CREATE POLICY "anon_select_seasons" ON seasons FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_seasons" ON seasons;
CREATE POLICY "anon_insert_seasons" ON seasons FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_seasons" ON seasons;
CREATE POLICY "anon_update_seasons" ON seasons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_seasons" ON seasons;
CREATE POLICY "anon_delete_seasons" ON seasons FOR DELETE TO anon, authenticated USING (true);

-- macrocycles
CREATE TABLE IF NOT EXISTS macrocycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  objective text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE macrocycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_macrocycles" ON macrocycles;
CREATE POLICY "anon_select_macrocycles" ON macrocycles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_macrocycles" ON macrocycles;
CREATE POLICY "anon_insert_macrocycles" ON macrocycles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_macrocycles" ON macrocycles;
CREATE POLICY "anon_update_macrocycles" ON macrocycles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_macrocycles" ON macrocycles;
CREATE POLICY "anon_delete_macrocycles" ON macrocycles FOR DELETE TO anon, authenticated USING (true);

-- mesocycles
CREATE TABLE IF NOT EXISTS mesocycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  macrocycle_id uuid NOT NULL REFERENCES macrocycles(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  objective text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mesocycles" ON mesocycles;
CREATE POLICY "anon_select_mesocycles" ON mesocycles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_mesocycles" ON mesocycles;
CREATE POLICY "anon_insert_mesocycles" ON mesocycles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_mesocycles" ON mesocycles;
CREATE POLICY "anon_update_mesocycles" ON mesocycles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_mesocycles" ON mesocycles;
CREATE POLICY "anon_delete_mesocycles" ON mesocycles FOR DELETE TO anon, authenticated USING (true);

-- microcycles
CREATE TABLE IF NOT EXISTS microcycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id uuid NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  objective text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE microcycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_microcycles" ON microcycles;
CREATE POLICY "anon_select_microcycles" ON microcycles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_microcycles" ON microcycles;
CREATE POLICY "anon_insert_microcycles" ON microcycles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_microcycles" ON microcycles;
CREATE POLICY "anon_update_microcycles" ON microcycles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_microcycles" ON microcycles;
CREATE POLICY "anon_delete_microcycles" ON microcycles FOR DELETE TO anon, authenticated USING (true);

-- work_days
CREATE TABLE IF NOT EXISTS work_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  microcycle_id uuid REFERENCES microcycles(id) ON DELETE SET NULL,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date date NOT NULL,
  objective text,
  notes text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, date)
);

ALTER TABLE work_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_work_days" ON work_days;
CREATE POLICY "anon_select_work_days" ON work_days FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_work_days" ON work_days;
CREATE POLICY "anon_insert_work_days" ON work_days FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_work_days" ON work_days;
CREATE POLICY "anon_update_work_days" ON work_days FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_work_days" ON work_days;
CREATE POLICY "anon_delete_work_days" ON work_days FOR DELETE TO anon, authenticated USING (true);

-- Add work_day_id to training_sessions
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS work_day_id uuid REFERENCES work_days(id) ON DELETE SET NULL;
