/*
# Update user_profiles role constraint

Adds 'admin' to the allowed roles on user_profiles.role to match the new
membership roles (coach, coordinator, admin).
*/

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('coach', 'coordinator', 'admin'));
