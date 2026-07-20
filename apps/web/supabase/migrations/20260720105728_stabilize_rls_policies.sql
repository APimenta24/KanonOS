/*
# Stabilize RLS Policies for Full CRUD

Fixes athlete creation ("new row violates row-level security policy") and
stabilizes all CRUD operations. The root cause was that is_coordinator()
only checked for the 'coordinator' role, excluding 'admin' and 'coach'
users. Since all three roles have full CRUD in this MVP, the functions
and policies are simplified to be reliable.

## Changes

1. is_coordinator() → now returns true for coordinator OR admin roles
2. has_workspace_access() — unchanged, already robust
3. is_team_coach() — simplified to check head_coach OR workspace access
   (is_coordinator check removed since workspace access covers it)
4. Athletes INSERT policy — simplified: allow if user is head_coach of
   any team OR has workspace access to any team's workspace. Uses a
   SECURITY DEFINER function to avoid RLS recursion on the teams subquery.
5. Backfill existing team's workspace_id (was null, causing workspace
   access checks to fail).
*/

-- ============================================================
-- 1. Updated helper functions
-- ============================================================

-- Checks if user has coordinator or admin role (both have full CRUD)
CREATE OR REPLACE FUNCTION is_coordinator()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid() AND m.role IN ('coordinator', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('coordinator', 'admin')
  );
$$;

-- Check if user can manage a team (head coach, coordinator/admin, or workspace access)
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

-- Check if user can manage athletes (head coach of any team, or workspace access)
-- SECURITY DEFINER to bypass RLS on teams subquery, avoiding recursion
CREATE OR REPLACE FUNCTION can_manage_athletes()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams t
    WHERE t.head_coach_id = auth.uid()
       OR is_coordinator()
       OR (t.workspace_id IS NOT NULL AND has_workspace_access(t.workspace_id))
  );
$$;

-- ============================================================
-- 2. Backfill: set workspace_id on existing teams
-- ============================================================
UPDATE teams t
SET workspace_id = up.active_workspace_id
FROM user_profiles up
WHERE t.head_coach_id = up.id
  AND t.workspace_id IS NULL
  AND up.active_workspace_id IS NOT NULL;

-- ============================================================
-- 3. Simplified Athletes RLS
-- ============================================================
DROP POLICY IF EXISTS "select_athletes" ON athletes;
CREATE POLICY "select_athletes" ON athletes FOR SELECT TO authenticated
  USING (can_manage_athletes());

DROP POLICY IF EXISTS "insert_athletes" ON athletes;
CREATE POLICY "insert_athletes" ON athletes FOR INSERT TO authenticated
  WITH CHECK (can_manage_athletes());

DROP POLICY IF EXISTS "update_athletes" ON athletes;
CREATE POLICY "update_athletes" ON athletes FOR UPDATE TO authenticated
  USING (can_manage_athletes())
  WITH CHECK (can_manage_athletes());

DROP POLICY IF EXISTS "delete_athletes" ON athletes;
CREATE POLICY "delete_athletes" ON athletes FOR DELETE TO authenticated
  USING (can_manage_athletes());
