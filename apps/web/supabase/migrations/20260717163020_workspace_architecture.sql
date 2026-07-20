/*
# Workspace-Based Architecture

Refactors the database to a workspace-centric model where every user gets a
Personal Workspace on signup, and can later create or join Organizations
(clubs, academies, schools, national/regional teams). All existing data
(teams, athletes, planning, sessions, reviews) belongs to a workspace.

## New Tables
- workspaces: owner_id, name, type ('personal'|'organization')
- organizations: workspace_id, name, type, created_by
- memberships: organization_id, user_id, role ('coach'|'coordinator'|'admin')

## Modified Tables
- user_profiles: added active_workspace_id
- teams: added workspace_id, age_category

## Security
- RLS on all tables. Workspace access via has_workspace_access().
- is_team_coach() extended to check workspace membership.
- Signup trigger creates personal workspace + sets active_workspace_id.
*/

-- ============================================================
-- PART 1: CREATE ALL TABLES (no policies yet)
-- ============================================================

-- WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'organization')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'club' CHECK (type IN ('club', 'academy', 'school', 'national_team', 'regional_team')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- MEMBERSHIPS
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'coach' CHECK (role IN ('coach', 'coordinator', 'admin')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season text NOT NULL DEFAULT '2024/25',
  color text NOT NULL DEFAULT '#3B82F6',
  sport text NOT NULL DEFAULT 'General',
  athlete_count integer NOT NULL DEFAULT 0,
  head_coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  age_category text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_teams_workspace ON teams(workspace_id);

-- SEASONS
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
CREATE INDEX IF NOT EXISTS idx_seasons_team ON seasons(team_id);

-- MACROCYCLES
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
CREATE INDEX IF NOT EXISTS idx_macrocycles_season ON macrocycles(season_id);

-- MESOCYCLES
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
CREATE INDEX IF NOT EXISTS idx_mesocycles_macrocycle ON mesocycles(macrocycle_id);

-- MICROCYCLES
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
CREATE INDEX IF NOT EXISTS idx_microcycles_mesocycle ON microcycles(mesocycle_id);

-- WORK DAYS
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
CREATE INDEX IF NOT EXISTS idx_work_days_team ON work_days(team_id);
CREATE INDEX IF NOT EXISTS idx_work_days_date ON work_days(date);

-- TRAINING SESSIONS
CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  work_day_id uuid REFERENCES work_days(id) ON DELETE SET NULL,
  title text NOT NULL,
  date date NOT NULL,
  time text NOT NULL DEFAULT '18:30',
  location text,
  objectives text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  event_type text NOT NULL DEFAULT 'training' CHECK (event_type IN ('training', 'match', 'gym', 'video')),
  opponent text,
  training_type text,
  duration_minutes integer,
  competition text,
  notes text,
  topic text,
  microcycle text,
  training_unit text,
  material text,
  logistics text,
  week_number integer NOT NULL DEFAULT 0,
  week_year integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sessions_date ON training_sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_week ON training_sessions(week_year, week_number);
CREATE INDEX IF NOT EXISTS idx_sessions_team ON training_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_work_day ON training_sessions(work_day_id);

-- EXERCISES
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 15,
  order_index integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'main' CHECK (category IN ('warmup', 'main', 'cooldown', 'game')),
  objective text,
  training_type text,
  equipment text,
  logistics text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_exercises_session ON exercises(session_id);

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
  objective_achieved text CHECK (objective_achieved IN ('yes', 'partial', 'no')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE session_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reviews_session ON session_reviews(session_id);

-- ATHLETES
CREATE TABLE IF NOT EXISTS athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date_of_birth date,
  gender text DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
  jersey_number integer,
  position text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

-- TEAM ATHLETES
CREATE TABLE IF NOT EXISTS team_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, athlete_id)
);
ALTER TABLE team_athletes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_team_athletes_team ON team_athletes(team_id);
CREATE INDEX IF NOT EXISTS idx_team_athletes_athlete ON team_athletes(athlete_id);

-- SESSION ATTENDANCE
CREATE TABLE IF NOT EXISTS session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'justified')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attendance_session ON session_attendance(session_id);

-- ATHLETE SESSION REVIEWS
CREATE TABLE IF NOT EXISTS athlete_session_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);
ALTER TABLE athlete_session_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_athlete_reviews_session ON athlete_session_reviews(session_id);

-- SESSION ATHLETES
CREATE TABLE IF NOT EXISTS session_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);
ALTER TABLE session_athletes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_session_athletes_session ON session_athletes(session_id);

-- USER PROFILES — add active_workspace_id
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;

-- ============================================================
-- PART 2: HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION has_workspace_access(workspace_uuid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_uuid
    AND (
      w.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM memberships m
        JOIN organizations o ON o.id = m.organization_id
        WHERE o.workspace_id = w.id AND m.user_id = auth.uid()
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION is_coordinator()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role = 'coordinator'
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coordinator'
  );
$$;

CREATE OR REPLACE FUNCTION is_team_coach(team_uuid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_uuid
    AND (
      t.head_coach_id = auth.uid()
      OR is_coordinator()
      OR (t.workspace_id IS NOT NULL AND has_workspace_access(t.workspace_id))
    )
  );
$$;

-- ============================================================
-- PART 3: ALL RLS POLICIES
-- ============================================================

-- WORKSPACES
DROP POLICY IF EXISTS "select_workspaces" ON workspaces;
CREATE POLICY "select_workspaces" ON workspaces FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE o.workspace_id = workspaces.id AND m.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "insert_workspaces" ON workspaces;
CREATE POLICY "insert_workspaces" ON workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "update_workspaces" ON workspaces;
CREATE POLICY "update_workspaces" ON workspaces FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "delete_workspaces" ON workspaces;
CREATE POLICY "delete_workspaces" ON workspaces FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ORGANIZATIONS
DROP POLICY IF EXISTS "select_organizations" ON organizations;
CREATE POLICY "select_organizations" ON organizations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = organizations.id AND m.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "insert_organizations" ON organizations;
CREATE POLICY "insert_organizations" ON organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "update_organizations" ON organizations;
CREATE POLICY "update_organizations" ON organizations FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = organizations.id AND m.user_id = auth.uid() AND m.role = 'admin'
    )
  );
DROP POLICY IF EXISTS "delete_organizations" ON organizations;
CREATE POLICY "delete_organizations" ON organizations FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = organizations.id AND m.user_id = auth.uid() AND m.role = 'admin'
    )
  );

-- MEMBERSHIPS
DROP POLICY IF EXISTS "select_memberships" ON memberships;
CREATE POLICY "select_memberships" ON memberships FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.organization_id = memberships.organization_id
      AND m2.user_id = auth.uid() AND m2.role = 'admin'
    )
  );
DROP POLICY IF EXISTS "insert_memberships" ON memberships;
CREATE POLICY "insert_memberships" ON memberships FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.organization_id = memberships.organization_id
      AND m2.user_id = auth.uid() AND m2.role = 'admin'
    )
  );
DROP POLICY IF EXISTS "update_memberships" ON memberships;
CREATE POLICY "update_memberships" ON memberships FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.organization_id = memberships.organization_id
      AND m2.user_id = auth.uid() AND m2.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.organization_id = memberships.organization_id
      AND m2.user_id = auth.uid() AND m2.role = 'admin'
    )
  );
DROP POLICY IF EXISTS "delete_memberships" ON memberships;
CREATE POLICY "delete_memberships" ON memberships FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.organization_id = memberships.organization_id
      AND m2.user_id = auth.uid() AND m2.role = 'admin'
    )
  );

-- TEAMS
DROP POLICY IF EXISTS "select_teams" ON teams;
CREATE POLICY "select_teams" ON teams FOR SELECT TO authenticated
  USING (
    head_coach_id = auth.uid()
    OR is_coordinator()
    OR (workspace_id IS NOT NULL AND has_workspace_access(workspace_id))
  );
DROP POLICY IF EXISTS "insert_teams" ON teams;
CREATE POLICY "insert_teams" ON teams FOR INSERT TO authenticated
  WITH CHECK (
    head_coach_id = auth.uid()
    OR is_coordinator()
    OR (workspace_id IS NOT NULL AND has_workspace_access(workspace_id))
  );
DROP POLICY IF EXISTS "update_teams" ON teams;
CREATE POLICY "update_teams" ON teams FOR UPDATE TO authenticated
  USING (
    head_coach_id = auth.uid()
    OR is_coordinator()
    OR (workspace_id IS NOT NULL AND has_workspace_access(workspace_id))
  )
  WITH CHECK (
    head_coach_id = auth.uid()
    OR is_coordinator()
    OR (workspace_id IS NOT NULL AND has_workspace_access(workspace_id))
  );
DROP POLICY IF EXISTS "delete_teams" ON teams;
CREATE POLICY "delete_teams" ON teams FOR DELETE TO authenticated
  USING (
    head_coach_id = auth.uid()
    OR is_coordinator()
    OR (workspace_id IS NOT NULL AND has_workspace_access(workspace_id))
  );

-- SEASONS
DROP POLICY IF EXISTS "select_seasons" ON seasons;
CREATE POLICY "select_seasons" ON seasons FOR SELECT TO authenticated USING (is_team_coach(team_id));
DROP POLICY IF EXISTS "insert_seasons" ON seasons;
CREATE POLICY "insert_seasons" ON seasons FOR INSERT TO authenticated WITH CHECK (is_team_coach(team_id));
DROP POLICY IF EXISTS "update_seasons" ON seasons;
CREATE POLICY "update_seasons" ON seasons FOR UPDATE TO authenticated USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
DROP POLICY IF EXISTS "delete_seasons" ON seasons;
CREATE POLICY "delete_seasons" ON seasons FOR DELETE TO authenticated USING (is_team_coach(team_id));

-- MACROCYCLES
DROP POLICY IF EXISTS "select_macrocycles" ON macrocycles;
CREATE POLICY "select_macrocycles" ON macrocycles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "insert_macrocycles" ON macrocycles;
CREATE POLICY "insert_macrocycles" ON macrocycles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "update_macrocycles" ON macrocycles;
CREATE POLICY "update_macrocycles" ON macrocycles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "delete_macrocycles" ON macrocycles;
CREATE POLICY "delete_macrocycles" ON macrocycles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id)));

-- MESOCYCLES
DROP POLICY IF EXISTS "select_mesocycles" ON mesocycles;
CREATE POLICY "select_mesocycles" ON mesocycles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "insert_mesocycles" ON mesocycles;
CREATE POLICY "insert_mesocycles" ON mesocycles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "update_mesocycles" ON mesocycles;
CREATE POLICY "update_mesocycles" ON mesocycles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "delete_mesocycles" ON mesocycles;
CREATE POLICY "delete_mesocycles" ON mesocycles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id)));

-- MICROCYCLES
DROP POLICY IF EXISTS "select_microcycles" ON microcycles;
CREATE POLICY "select_microcycles" ON microcycles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "insert_microcycles" ON microcycles;
CREATE POLICY "insert_microcycles" ON microcycles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "update_microcycles" ON microcycles;
CREATE POLICY "update_microcycles" ON microcycles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id)));
DROP POLICY IF EXISTS "delete_microcycles" ON microcycles;
CREATE POLICY "delete_microcycles" ON microcycles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id)));

-- WORK DAYS
DROP POLICY IF EXISTS "select_work_days" ON work_days;
CREATE POLICY "select_work_days" ON work_days FOR SELECT TO authenticated USING (is_team_coach(team_id));
DROP POLICY IF EXISTS "insert_work_days" ON work_days;
CREATE POLICY "insert_work_days" ON work_days FOR INSERT TO authenticated WITH CHECK (is_team_coach(team_id));
DROP POLICY IF EXISTS "update_work_days" ON work_days;
CREATE POLICY "update_work_days" ON work_days FOR UPDATE TO authenticated USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
DROP POLICY IF EXISTS "delete_work_days" ON work_days;
CREATE POLICY "delete_work_days" ON work_days FOR DELETE TO authenticated USING (is_team_coach(team_id));

-- TRAINING SESSIONS
DROP POLICY IF EXISTS "select_training_sessions" ON training_sessions;
CREATE POLICY "select_training_sessions" ON training_sessions FOR SELECT TO authenticated USING (is_team_coach(team_id));
DROP POLICY IF EXISTS "insert_training_sessions" ON training_sessions;
CREATE POLICY "insert_training_sessions" ON training_sessions FOR INSERT TO authenticated WITH CHECK (is_team_coach(team_id));
DROP POLICY IF EXISTS "update_training_sessions" ON training_sessions;
CREATE POLICY "update_training_sessions" ON training_sessions FOR UPDATE TO authenticated USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
DROP POLICY IF EXISTS "delete_training_sessions" ON training_sessions;
CREATE POLICY "delete_training_sessions" ON training_sessions FOR DELETE TO authenticated USING (is_team_coach(team_id));

-- EXERCISES
DROP POLICY IF EXISTS "select_exercises" ON exercises;
CREATE POLICY "select_exercises" ON exercises FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "insert_exercises" ON exercises;
CREATE POLICY "insert_exercises" ON exercises FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "update_exercises" ON exercises;
CREATE POLICY "update_exercises" ON exercises FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "delete_exercises" ON exercises;
CREATE POLICY "delete_exercises" ON exercises FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id)));

-- SESSION REVIEWS
DROP POLICY IF EXISTS "select_session_reviews" ON session_reviews;
CREATE POLICY "select_session_reviews" ON session_reviews FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "insert_session_reviews" ON session_reviews;
CREATE POLICY "insert_session_reviews" ON session_reviews FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "update_session_reviews" ON session_reviews;
CREATE POLICY "update_session_reviews" ON session_reviews FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "delete_session_reviews" ON session_reviews;
CREATE POLICY "delete_session_reviews" ON session_reviews FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id)));

-- ATHLETES
DROP POLICY IF EXISTS "select_athletes" ON athletes;
CREATE POLICY "select_athletes" ON athletes FOR SELECT TO authenticated
  USING (
    is_coordinator()
    OR EXISTS (
      SELECT 1 FROM team_athletes ta
      JOIN teams ON teams.id = ta.team_id
      WHERE ta.athlete_id = athletes.id
      AND (teams.head_coach_id = auth.uid() OR (teams.workspace_id IS NOT NULL AND has_workspace_access(teams.workspace_id)))
    )
  );
DROP POLICY IF EXISTS "insert_athletes" ON athletes;
CREATE POLICY "insert_athletes" ON athletes FOR INSERT TO authenticated
  WITH CHECK (
    is_coordinator()
    OR EXISTS (SELECT 1 FROM teams WHERE head_coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM teams WHERE workspace_id IS NOT NULL AND has_workspace_access(workspace_id))
  );
DROP POLICY IF EXISTS "update_athletes" ON athletes;
CREATE POLICY "update_athletes" ON athletes FOR UPDATE TO authenticated
  USING (
    is_coordinator()
    OR EXISTS (
      SELECT 1 FROM team_athletes ta
      JOIN teams ON teams.id = ta.team_id
      WHERE ta.athlete_id = athletes.id
      AND (teams.head_coach_id = auth.uid() OR (teams.workspace_id IS NOT NULL AND has_workspace_access(teams.workspace_id)))
    )
  )
  WITH CHECK (
    is_coordinator()
    OR EXISTS (
      SELECT 1 FROM team_athletes ta
      JOIN teams ON teams.id = ta.team_id
      WHERE ta.athlete_id = athletes.id
      AND (teams.head_coach_id = auth.uid() OR (teams.workspace_id IS NOT NULL AND has_workspace_access(teams.workspace_id)))
    )
  );
DROP POLICY IF EXISTS "delete_athletes" ON athletes;
CREATE POLICY "delete_athletes" ON athletes FOR DELETE TO authenticated
  USING (
    is_coordinator()
    OR EXISTS (
      SELECT 1 FROM team_athletes ta
      JOIN teams ON teams.id = ta.team_id
      WHERE ta.athlete_id = athletes.id
      AND (teams.head_coach_id = auth.uid() OR (teams.workspace_id IS NOT NULL AND has_workspace_access(teams.workspace_id)))
    )
  );

-- TEAM ATHLETES
DROP POLICY IF EXISTS "select_team_athletes" ON team_athletes;
CREATE POLICY "select_team_athletes" ON team_athletes FOR SELECT TO authenticated USING (is_team_coach(team_id));
DROP POLICY IF EXISTS "insert_team_athletes" ON team_athletes;
CREATE POLICY "insert_team_athletes" ON team_athletes FOR INSERT TO authenticated WITH CHECK (is_team_coach(team_id));
DROP POLICY IF EXISTS "update_team_athletes" ON team_athletes;
CREATE POLICY "update_team_athletes" ON team_athletes FOR UPDATE TO authenticated USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
DROP POLICY IF EXISTS "delete_team_athletes" ON team_athletes;
CREATE POLICY "delete_team_athletes" ON team_athletes FOR DELETE TO authenticated USING (is_team_coach(team_id));

-- SESSION ATTENDANCE
DROP POLICY IF EXISTS "select_session_attendance" ON session_attendance;
CREATE POLICY "select_session_attendance" ON session_attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "insert_session_attendance" ON session_attendance;
CREATE POLICY "insert_session_attendance" ON session_attendance FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "update_session_attendance" ON session_attendance;
CREATE POLICY "update_session_attendance" ON session_attendance FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "delete_session_attendance" ON session_attendance;
CREATE POLICY "delete_session_attendance" ON session_attendance FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id)));

-- ATHLETE SESSION REVIEWS
DROP POLICY IF EXISTS "select_athlete_session_reviews" ON athlete_session_reviews;
CREATE POLICY "select_athlete_session_reviews" ON athlete_session_reviews FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "insert_athlete_session_reviews" ON athlete_session_reviews;
CREATE POLICY "insert_athlete_session_reviews" ON athlete_session_reviews FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "update_athlete_session_reviews" ON athlete_session_reviews;
CREATE POLICY "update_athlete_session_reviews" ON athlete_session_reviews FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "delete_athlete_session_reviews" ON athlete_session_reviews;
CREATE POLICY "delete_athlete_session_reviews" ON athlete_session_reviews FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id)));

-- SESSION ATHLETES
DROP POLICY IF EXISTS "select_session_athletes" ON session_athletes;
CREATE POLICY "select_session_athletes" ON session_athletes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "insert_session_athletes" ON session_athletes;
CREATE POLICY "insert_session_athletes" ON session_athletes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "update_session_athletes" ON session_athletes;
CREATE POLICY "update_session_athletes" ON session_athletes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id)));
DROP POLICY IF EXISTS "delete_session_athletes" ON session_athletes;
CREATE POLICY "delete_session_athletes" ON session_athletes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id)));

-- ============================================================
-- PART 4: SIGNUP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ws_id uuid;
  profile_name text;
BEGIN
  profile_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  INSERT INTO workspaces (owner_id, name, type)
  VALUES (NEW.id, profile_name || '''s Workspace', 'personal')
  RETURNING id INTO ws_id;

  INSERT INTO user_profiles (id, email, full_name, active_workspace_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', ws_id)
  ON CONFLICT (id) DO UPDATE SET active_workspace_id = COALESCE(user_profiles.active_workspace_id, ws_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
