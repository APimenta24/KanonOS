/*
# Extend exercises table with objective, equipment, and logistics fields

1. Modified Tables
   - `exercises`
     - `objective` (text, nullable) — the specific objective of this exercise
     - `equipment` (text, nullable) — equipment needed for this exercise
     - `logistics` (text, nullable) — logistical notes (space, group size, setup)

2. Notes
   - All three columns are nullable so existing exercises remain valid.
   - No data is lost; existing rows simply get NULL for the new columns.
*/

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS logistics text;
