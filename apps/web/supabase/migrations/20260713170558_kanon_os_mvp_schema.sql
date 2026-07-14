
/*
# KanonOS MVP Schema

Creates the full schema for the KanonOS Coach Operating System MVP.

## New Tables

### teams
Represents a coach's sports team (e.g. HCT Sub-17).
- id: uuid primary key
- name: team name
- season: season label (e.g. 2024/25)
- color: hex color for visual identification
- athlete_count: number of athletes
- sport: sport type
- created_at: timestamp

### training_sessions
A planned or executed training session.
- id: uuid primary key
- team_id: foreign key to teams
- title: session title (e.g. "Tática Ofensiva")
- date: session date
- time: session start time
- location: training location
- objectives: session objectives text
- status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
- week_number: ISO week number for grouping
- week_year: year for the week
- created_at, updated_at

### exercises
Individual exercises within a training session.
- id: uuid primary key
- session_id: foreign key to training_sessions
- name: exercise name
- description: optional notes
- duration_minutes: planned duration
- order_index: display order
- category: 'warmup' | 'main' | 'cooldown' | 'game'
- created_at

### session_reviews
Post-session evaluation by the coach.
- id: uuid primary key
- session_id: foreign key to training_sessions (unique - one review per session)
- intensity_rating: 1-5
- objectives_rating: 1-5
- quality_rating: 1-5
- notes: coach's free text notes
- highlights: what went well
- next_actions: actions for next session
- created_at, updated_at

## Security
- RLS enabled on all tables.
- Single-tenant (no auth) — anon + authenticated roles can read/write all data.
*/

-- TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season text NOT NULL DEFAULT '2024/25',
  color text NOT NULL DEFAULT '#3B82F6',
  sport text NOT NULL DEFAULT 'Futebol',
  athlete_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_teams" ON teams;
CREATE POLICY "anon_select_teams" ON teams FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_teams" ON teams;
CREATE POLICY "anon_insert_teams" ON teams FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_teams" ON teams;
CREATE POLICY "anon_update_teams" ON teams FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_teams" ON teams;
CREATE POLICY "anon_delete_teams" ON teams FOR DELETE TO anon, authenticated USING (true);


-- TRAINING SESSIONS
CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  time text NOT NULL DEFAULT '18:30',
  location text,
  objectives text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  week_number integer NOT NULL,
  week_year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON training_sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_week ON training_sessions(week_year, week_number);
CREATE INDEX IF NOT EXISTS idx_sessions_team ON training_sessions(team_id);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON training_sessions;
CREATE POLICY "anon_select_sessions" ON training_sessions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON training_sessions;
CREATE POLICY "anon_insert_sessions" ON training_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON training_sessions;
CREATE POLICY "anon_update_sessions" ON training_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON training_sessions;
CREATE POLICY "anon_delete_sessions" ON training_sessions FOR DELETE TO anon, authenticated USING (true);


-- EXERCISES
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 15,
  order_index integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'main' CHECK (category IN ('warmup', 'main', 'cooldown', 'game')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_session ON exercises(session_id);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_exercises" ON exercises;
CREATE POLICY "anon_select_exercises" ON exercises FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_exercises" ON exercises;
CREATE POLICY "anon_insert_exercises" ON exercises FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_exercises" ON exercises;
CREATE POLICY "anon_update_exercises" ON exercises FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_exercises" ON exercises;
CREATE POLICY "anon_delete_exercises" ON exercises FOR DELETE TO anon, authenticated USING (true);


-- SESSION REVIEWS
CREATE TABLE IF NOT EXISTS session_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES training_sessions(id) ON DELETE CASCADE,
  intensity_rating integer NOT NULL DEFAULT 3 CHECK (intensity_rating BETWEEN 1 AND 5),
  objectives_rating integer NOT NULL DEFAULT 3 CHECK (objectives_rating BETWEEN 1 AND 5),
  quality_rating integer NOT NULL DEFAULT 3 CHECK (quality_rating BETWEEN 1 AND 5),
  notes text,
  highlights text,
  next_actions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_session ON session_reviews(session_id);

ALTER TABLE session_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reviews" ON session_reviews;
CREATE POLICY "anon_select_reviews" ON session_reviews FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reviews" ON session_reviews;
CREATE POLICY "anon_insert_reviews" ON session_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reviews" ON session_reviews;
CREATE POLICY "anon_update_reviews" ON session_reviews FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reviews" ON session_reviews;
CREATE POLICY "anon_delete_reviews" ON session_reviews FOR DELETE TO anon, authenticated USING (true);
