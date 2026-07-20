/*
# Backfill: Create personal workspace for existing users

For any user_profiles row that doesn't have an active_workspace_id, creates
a personal workspace and links it. This is a one-time backfill for users
who signed up before the workspace trigger was added.
*/

DO $$
DECLARE
  r RECORD;
  ws_id uuid;
BEGIN
  FOR r IN SELECT id, email, COALESCE(full_name, email) as display_name FROM user_profiles WHERE active_workspace_id IS NULL LOOP
    INSERT INTO workspaces (owner_id, name, type)
    VALUES (r.id, r.display_name || '''s Workspace', 'personal')
    RETURNING id INTO ws_id;

    UPDATE user_profiles SET active_workspace_id = ws_id WHERE id = r.id;
  END LOOP;
END $$;
