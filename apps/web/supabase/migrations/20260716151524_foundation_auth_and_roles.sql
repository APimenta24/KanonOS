/*
# Sprint 5 — Foundation Refactor: Auth, User Roles, Team Ownership

Creates user_profiles table, helper functions, team head_coach_id column,
and migrates all RLS policies from anon+authenticated to authenticated-only
with ownership checks.
*/

-- 1. Create user_profiles table (RLS enabled, no policies yet)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'coach' CHECK (role IN ('coach', 'coordinator')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Add head_coach_id to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS head_coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Helper functions (can now reference user_profiles and teams)
CREATE OR REPLACE FUNCTION is_coordinator()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coordinator');
$$;

CREATE OR REPLACE FUNCTION is_team_coach(team_uuid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM teams WHERE id = team_uuid AND (head_coach_id = auth.uid() OR is_coordinator()));
$$;

-- 4. user_profiles policies
DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id OR is_coordinator());
DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 5. Teams RLS
DROP POLICY IF EXISTS "anon_select_teams" ON teams;
DROP POLICY IF EXISTS "anon_insert_teams" ON teams;
DROP POLICY IF EXISTS "anon_update_teams" ON teams;
DROP POLICY IF EXISTS "anon_delete_teams" ON teams;
CREATE POLICY "select_teams" ON teams FOR SELECT TO authenticated USING (head_coach_id = auth.uid() OR is_coordinator());
CREATE POLICY "insert_teams" ON teams FOR INSERT TO authenticated WITH CHECK (head_coach_id = auth.uid() OR is_coordinator());
CREATE POLICY "update_teams" ON teams FOR UPDATE TO authenticated USING (head_coach_id = auth.uid() OR is_coordinator()) WITH CHECK (head_coach_id = auth.uid() OR is_coordinator());
CREATE POLICY "delete_teams" ON teams FOR DELETE TO authenticated USING (head_coach_id = auth.uid() OR is_coordinator());

-- 6. Seasons RLS
DROP POLICY IF EXISTS "anon_select_seasons" ON seasons;
DROP POLICY IF EXISTS "anon_insert_seasons" ON seasons;
DROP POLICY IF EXISTS "anon_update_seasons" ON seasons;
DROP POLICY IF EXISTS "anon_delete_seasons" ON seasons;
CREATE POLICY "select_seasons" ON seasons FOR SELECT TO authenticated USING (is_team_coach(team_id));
CREATE POLICY "insert_seasons" ON seasons FOR INSERT TO authenticated WITH CHECK (is_team_coach(team_id));
CREATE POLICY "update_seasons" ON seasons FOR UPDATE TO authenticated USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
CREATE POLICY "delete_seasons" ON seasons FOR DELETE TO authenticated USING (is_team_coach(team_id));

-- 7. Macrocycles RLS
DROP POLICY IF EXISTS "anon_select_macrocycles" ON macrocycles;
DROP POLICY IF EXISTS "anon_insert_macrocycles" ON macrocycles;
DROP POLICY IF EXISTS "anon_update_macrocycles" ON macrocycles;
DROP POLICY IF EXISTS "anon_delete_macrocycles" ON macrocycles;
CREATE POLICY "select_macrocycles" ON macrocycles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "insert_macrocycles" ON macrocycles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "update_macrocycles" ON macrocycles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "delete_macrocycles" ON macrocycles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM seasons WHERE seasons.id = macrocycles.season_id AND is_team_coach(seasons.team_id)));

-- 8. Mesocycles RLS
DROP POLICY IF EXISTS "anon_select_mesocycles" ON mesocycles;
DROP POLICY IF EXISTS "anon_insert_mesocycles" ON mesocycles;
DROP POLICY IF EXISTS "anon_update_mesocycles" ON mesocycles;
DROP POLICY IF EXISTS "anon_delete_mesocycles" ON mesocycles;
CREATE POLICY "select_mesocycles" ON mesocycles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "insert_mesocycles" ON mesocycles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "update_mesocycles" ON mesocycles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "delete_mesocycles" ON mesocycles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM macrocycles JOIN seasons ON seasons.id = macrocycles.season_id WHERE macrocycles.id = mesocycles.macrocycle_id AND is_team_coach(seasons.team_id)));

-- 9. Microcycles RLS
DROP POLICY IF EXISTS "anon_select_microcycles" ON microcycles;
DROP POLICY IF EXISTS "anon_insert_microcycles" ON microcycles;
DROP POLICY IF EXISTS "anon_update_microcycles" ON microcycles;
DROP POLICY IF EXISTS "anon_delete_microcycles" ON microcycles;
CREATE POLICY "select_microcycles" ON microcycles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "insert_microcycles" ON microcycles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "update_microcycles" ON microcycles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id)));
CREATE POLICY "delete_microcycles" ON microcycles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM mesocycles JOIN macrocycles ON macrocycles.id = mesocycles.macrocycle_id JOIN seasons ON seasons.id = macrocycles.season_id WHERE mesocycles.id = microcycles.mesocycle_id AND is_team_coach(seasons.team_id)));

-- 10. Work Days RLS
DROP POLICY IF EXISTS "anon_select_work_days" ON work_days;
DROP POLICY IF EXISTS "anon_insert_work_days" ON work_days;
DROP POLICY IF EXISTS "anon_update_work_days" ON work_days;
DROP POLICY IF EXISTS "anon_delete_work_days" ON work_days;
CREATE POLICY "select_work_days" ON work_days FOR SELECT TO authenticated USING (is_team_coach(team_id));
CREATE POLICY "insert_work_days" ON work_days FOR INSERT TO authenticated WITH CHECK (is_team_coach(team_id));
CREATE POLICY "update_work_days" ON work_days FOR UPDATE TO authenticated USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
CREATE POLICY "delete_work_days" ON work_days FOR DELETE TO authenticated USING (is_team_coach(team_id));

-- 11. Training Sessions RLS
DROP POLICY IF EXISTS "anon_select_training_sessions" ON training_sessions;
DROP POLICY IF EXISTS "anon_insert_training_sessions" ON training_sessions;
DROP POLICY IF EXISTS "anon_update_training_sessions" ON training_sessions;
DROP POLICY IF EXISTS "anon_delete_training_sessions" ON training_sessions;
CREATE POLICY "select_training_sessions" ON training_sessions FOR SELECT TO authenticated USING (is_team_coach(team_id));
CREATE POLICY "insert_training_sessions" ON training_sessions FOR INSERT TO authenticated WITH CHECK (is_team_coach(team_id));
CREATE POLICY "update_training_sessions" ON training_sessions FOR UPDATE TO authenticated USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
CREATE POLICY "delete_training_sessions" ON training_sessions FOR DELETE TO authenticated USING (is_team_coach(team_id));

-- 12. Exercises RLS
DROP POLICY IF EXISTS "anon_select_exercises" ON exercises;
DROP POLICY IF EXISTS "anon_insert_exercises" ON exercises;
DROP POLICY IF EXISTS "anon_update_exercises" ON exercises;
DROP POLICY IF EXISTS "anon_delete_exercises" ON exercises;
CREATE POLICY "select_exercises" ON exercises FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "insert_exercises" ON exercises FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "update_exercises" ON exercises FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "delete_exercises" ON exercises FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = exercises.session_id AND is_team_coach(training_sessions.team_id)));

-- 13. Session Reviews RLS
DROP POLICY IF EXISTS "anon_select_session_reviews" ON session_reviews;
DROP POLICY IF EXISTS "anon_insert_session_reviews" ON session_reviews;
DROP POLICY IF EXISTS "anon_update_session_reviews" ON session_reviews;
DROP POLICY IF EXISTS "anon_delete_session_reviews" ON session_reviews;
CREATE POLICY "select_session_reviews" ON session_reviews FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "insert_session_reviews" ON session_reviews FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "update_session_reviews" ON session_reviews FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "delete_session_reviews" ON session_reviews FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_reviews.session_id AND is_team_coach(training_sessions.team_id)));

-- 14. Session Attendance RLS
DROP POLICY IF EXISTS "anon_select_session_attendance" ON session_attendance;
DROP POLICY IF EXISTS "anon_insert_session_attendance" ON session_attendance;
DROP POLICY IF EXISTS "anon_update_session_attendance" ON session_attendance;
DROP POLICY IF EXISTS "anon_delete_session_attendance" ON session_attendance;
CREATE POLICY "select_session_attendance" ON session_attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "insert_session_attendance" ON session_attendance FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "update_session_attendance" ON session_attendance FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "delete_session_attendance" ON session_attendance FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_attendance.session_id AND is_team_coach(training_sessions.team_id)));

-- 15. Athlete Session Reviews RLS
DROP POLICY IF EXISTS "anon_select_athlete_session_reviews" ON athlete_session_reviews;
DROP POLICY IF EXISTS "anon_insert_athlete_session_reviews" ON athlete_session_reviews;
DROP POLICY IF EXISTS "anon_update_athlete_session_reviews" ON athlete_session_reviews;
DROP POLICY IF EXISTS "anon_delete_athlete_session_reviews" ON athlete_session_reviews;
CREATE POLICY "select_athlete_session_reviews" ON athlete_session_reviews FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "insert_athlete_session_reviews" ON athlete_session_reviews FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "update_athlete_session_reviews" ON athlete_session_reviews FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "delete_athlete_session_reviews" ON athlete_session_reviews FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = athlete_session_reviews.session_id AND is_team_coach(training_sessions.team_id)));

-- 16. Athletes RLS
DROP POLICY IF EXISTS "anon_select_athletes" ON athletes;
DROP POLICY IF EXISTS "anon_insert_athletes" ON athletes;
DROP POLICY IF EXISTS "anon_update_athletes" ON athletes;
DROP POLICY IF EXISTS "anon_delete_athletes" ON athletes;
CREATE POLICY "select_athletes" ON athletes FOR SELECT TO authenticated USING (is_coordinator() OR EXISTS (SELECT 1 FROM team_athletes JOIN teams ON teams.id = team_athletes.team_id WHERE team_athletes.athlete_id = athletes.id AND teams.head_coach_id = auth.uid()));
CREATE POLICY "insert_athletes" ON athletes FOR INSERT TO authenticated WITH CHECK (is_coordinator() OR EXISTS (SELECT 1 FROM teams WHERE head_coach_id = auth.uid()));
CREATE POLICY "update_athletes" ON athletes FOR UPDATE TO authenticated USING (is_coordinator() OR EXISTS (SELECT 1 FROM team_athletes JOIN teams ON teams.id = team_athletes.team_id WHERE team_athletes.athlete_id = athletes.id AND teams.head_coach_id = auth.uid())) WITH CHECK (is_coordinator() OR EXISTS (SELECT 1 FROM team_athletes JOIN teams ON teams.id = team_athletes.team_id WHERE team_athletes.athlete_id = athletes.id AND teams.head_coach_id = auth.uid()));
CREATE POLICY "delete_athletes" ON athletes FOR DELETE TO authenticated USING (is_coordinator() OR EXISTS (SELECT 1 FROM team_athletes JOIN teams ON teams.id = team_athletes.team_id WHERE team_athletes.athlete_id = athletes.id AND teams.head_coach_id = auth.uid()));

-- 17. Team Athletes RLS
DROP POLICY IF EXISTS "anon_select_team_athletes" ON team_athletes;
DROP POLICY IF EXISTS "anon_insert_team_athletes" ON team_athletes;
DROP POLICY IF EXISTS "anon_update_team_athletes" ON team_athletes;
DROP POLICY IF EXISTS "anon_delete_team_athletes" ON team_athletes;
CREATE POLICY "select_team_athletes" ON team_athletes FOR SELECT TO authenticated USING (is_team_coach(team_id));
CREATE POLICY "insert_team_athletes" ON team_athletes FOR INSERT TO authenticated WITH CHECK (is_team_coach(team_id));
CREATE POLICY "update_team_athletes" ON team_athletes FOR UPDATE TO authenticated USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
CREATE POLICY "delete_team_athletes" ON team_athletes FOR DELETE TO authenticated USING (is_team_coach(team_id));

-- 18. Session Athletes RLS
DROP POLICY IF EXISTS "anon_select_session_athletes" ON session_athletes;
DROP POLICY IF EXISTS "anon_insert_session_athletes" ON session_athletes;
DROP POLICY IF EXISTS "anon_update_session_athletes" ON session_athletes;
DROP POLICY IF EXISTS "anon_delete_session_athletes" ON session_athletes;
CREATE POLICY "select_session_athletes" ON session_athletes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "insert_session_athletes" ON session_athletes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "update_session_athletes" ON session_athletes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id))) WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id)));
CREATE POLICY "delete_session_athletes" ON session_athletes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_athletes.session_id AND is_team_coach(training_sessions.team_id)));

-- 19. Trigger: Auto-create user_profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
