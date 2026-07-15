/*
# Expand session types: Training, Match, Gym, Video

Replaces the 2-value event_type (training|match) with 4 values
(training|match|gym|video) and adds type-specific columns.

1. Modified Tables
   - `training_sessions`
     - `event_type` CHECK constraint expanded to include 'gym' and 'video'
     - `training_type` (text, nullable) — for Training sessions
     - `duration_minutes` (integer, nullable) — for Training/Gym/Video sessions
     - `competition` (text, nullable) — for Match sessions
     - `notes` (text, nullable) — for Gym sessions
     - `topic` (text, nullable) — for Video sessions

2. Notes
   - Existing rows keep their current event_type ('training' or 'match').
   - All new columns are nullable and additive — no data is lost.
   - The `opponent` column (added previously) remains for Match sessions.
*/

-- Drop old CHECK and replace with expanded version
ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_event_type_check;
ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_event_type_check
  CHECK (event_type IN ('training', 'match', 'gym', 'video'));

-- Add type-specific columns (all nullable, additive)
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS training_type text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS competition text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS topic text;
