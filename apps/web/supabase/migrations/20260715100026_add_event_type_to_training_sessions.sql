/*
# Add event_type and opponent columns to training_sessions

This migration transforms training_sessions into a generic "event" table
that supports both Training sessions and Match events.

1. Modified Tables
   - `training_sessions`
     - `event_type` (text, NOT NULL, default 'training') — 'training' or 'match'
     - `opponent` (text, nullable) — opponent name for match events

2. Notes
   - Existing rows default to 'training' so no data is lost.
   - No columns are dropped or renamed; data-safe additive change.
*/

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'training' CHECK (event_type IN ('training', 'match')),
  ADD COLUMN IF NOT EXISTS opponent text;

CREATE INDEX IF NOT EXISTS idx_sessions_event_type ON training_sessions(event_type);
