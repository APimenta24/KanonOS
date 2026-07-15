/*
# Close Session — attendance, athlete ratings, objective achieved

Replaces the old "Review" concept with a "Close Session" workflow.
Adds attendance tracking, quick per-athlete ratings, and an
objective_achieved field on session_reviews.

1. New Tables
   - `session_attendance`
     - `id` (uuid, PK)
     - `session_id` (uuid, FK → training_sessions, CASCADE)
     - `athlete_id` (uuid, FK → athletes, CASCADE)
     - `status` (text, CHECK in 'present','absent','justified' — 'justified' reserved for future)
     - `created_at`, `updated_at` (timestamptz)
     - UNIQUE(session_id, athlete_id)

   - `athlete_session_reviews`
     - `id` (uuid, PK)
     - `session_id` (uuid, FK → training_sessions, CASCADE)
     - `athlete_id` (uuid, FK → athletes, CASCADE)
     - `rating` (int, 1–5, NOT NULL)
     - `note` (text, nullable)
     - `created_at`, `updated_at` (timestamptz)
     - UNIQUE(session_id, athlete_id)
     - This table stores quick ratings only. Future detailed evaluations
       (technical/tactical/physical/mental) will live in a separate table
       referencing this one, keeping the architecture forward-compatible.

2. Modified Tables
   - `training_sessions`
     - No structural change (status 'completed' is reused for closed sessions).
   - `session_reviews`
     - `objective_achieved` (text, CHECK in 'yes','partial','no', nullable)
     - Existing columns (intensity_rating, objectives_rating, quality_rating,
       notes, highlights, next_actions) remain for backward compatibility.

3. Security
   - RLS enabled on both new tables.
   - Policies: TO anon, authenticated — full CRUD (single-tenant app, no auth).

4. Notes
   - 'justified' attendance status is in the CHECK constraint but NOT exposed
     in the UI yet — reserved for future use as requested.
   - athlete_session_reviews is designed to be extended (not replaced) when
     detailed evaluations are added later.
*/

-- session_attendance
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

DROP POLICY IF EXISTS "anon_select_attendance" ON session_attendance;
CREATE POLICY "anon_select_attendance" ON session_attendance FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_attendance" ON session_attendance;
CREATE POLICY "anon_insert_attendance" ON session_attendance FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_attendance" ON session_attendance;
CREATE POLICY "anon_update_attendance" ON session_attendance FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_attendance" ON session_attendance;
CREATE POLICY "anon_delete_attendance" ON session_attendance FOR DELETE
  TO anon, authenticated USING (true);

-- athlete_session_reviews
CREATE TABLE IF NOT EXISTS athlete_session_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  rating int NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);

ALTER TABLE athlete_session_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_athlete_reviews" ON athlete_session_reviews;
CREATE POLICY "anon_select_athlete_reviews" ON athlete_session_reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_athlete_reviews" ON athlete_session_reviews;
CREATE POLICY "anon_insert_athlete_reviews" ON athlete_session_reviews FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_athlete_reviews" ON athlete_session_reviews;
CREATE POLICY "anon_update_athlete_reviews" ON athlete_session_reviews FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_athlete_reviews" ON athlete_session_reviews;
CREATE POLICY "anon_delete_athlete_reviews" ON athlete_session_reviews FOR DELETE
  TO anon, authenticated USING (true);

-- session_reviews: add objective_achieved
ALTER TABLE session_reviews
  ADD COLUMN IF NOT EXISTS objective_achieved text CHECK (objective_achieved IN ('yes', 'partial', 'no'));
