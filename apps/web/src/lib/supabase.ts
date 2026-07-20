import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Roles ──────────────────────────────────────────────────────
export type UserRole = 'coach' | 'coordinator' | 'admin';

// ── Workspace ─────────────────────────────────────────────────
export type WorkspaceType = 'personal' | 'organization';

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  type: WorkspaceType;
  created_at: string;
};

// ── Organization ──────────────────────────────────────────────
export type OrganizationType = 'club' | 'academy' | 'school' | 'national_team' | 'regional_team';

export type Organization = {
  id: string;
  workspace_id: string;
  name: string;
  type: OrganizationType;
  created_by: string;
  created_at: string;
};

// ── Membership ────────────────────────────────────────────────
export type MembershipRole = 'coach' | 'coordinator' | 'admin';

export type Membership = {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: string;
};

// ── User Profile ──────────────────────────────────────────────
export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  active_workspace_id: string | null;
  created_at: string;
  updated_at: string;
};

// ── Team ──────────────────────────────────────────────────────
export type Team = {
  id: string;
  name: string;
  season: string;
  color: string;
  sport: string;
  age_category: string | null;
  athlete_count: number;
  head_coach_id: string | null;
  workspace_id: string | null;
  created_at: string;
};

// ── Season ────────────────────────────────────────────────────
export type Season = {
  id: string;
  team_id: string;
  name: string;
  start_date: string;
  end_date: string;
  training_days: string[];
  competition_days: string[] | null;
  objective: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ── Planning Hierarchy ────────────────────────────────────────
export type Macrocycle = {
  id: string;
  season_id: string;
  name: string;
  start_date: string;
  end_date: string;
  objective: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type Mesocycle = {
  id: string;
  macrocycle_id: string;
  name: string;
  start_date: string;
  end_date: string;
  objective: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type Microcycle = {
  id: string;
  mesocycle_id: string;
  name: string;
  start_date: string;
  end_date: string;
  objective: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

// ── Work Day ──────────────────────────────────────────────────
export type WorkDayStatus = 'planned' | 'completed' | 'cancelled';

export type WorkDay = {
  id: string;
  microcycle_id: string | null;
  team_id: string;
  date: string;
  objective: string | null;
  notes: string | null;
  status: WorkDayStatus;
  created_at: string;
  updated_at: string;
};

// ── Training Session ──────────────────────────────────────────
export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type EventType = 'training' | 'match' | 'gym' | 'video';

export type TrainingSession = {
  id: string;
  team_id: string;
  work_day_id: string | null;
  title: string;
  date: string;
  time: string;
  location: string | null;
  objectives: string | null;
  status: SessionStatus;
  event_type: EventType;
  opponent: string | null;
  training_type: string | null;
  duration_minutes: number | null;
  competition: string | null;
  notes: string | null;
  topic: string | null;
  microcycle: string | null;
  training_unit: string | null;
  material: string | null;
  logistics: string | null;
  week_number: number;
  week_year: number;
  created_at: string;
  updated_at: string;
};

// ── Exercise ──────────────────────────────────────────────────
export type ExerciseCategory = 'warmup' | 'main' | 'cooldown' | 'game';

export type Exercise = {
  id: string;
  session_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  order_index: number;
  category: ExerciseCategory;
  objective: string | null;
  training_type: string | null;
  equipment: string | null;
  logistics: string | null;
  created_at: string;
};

// ── Session Review ────────────────────────────────────────────
export type ObjectiveAchieved = 'yes' | 'partial' | 'no';

export type SessionReview = {
  id: string;
  session_id: string;
  intensity_rating: number;
  objectives_rating: number;
  quality_rating: number;
  notes: string | null;
  highlights: string | null;
  next_actions: string | null;
  objective_achieved: ObjectiveAchieved | null;
  created_at: string;
  updated_at: string;
};

// ── Athlete ───────────────────────────────────────────────────
export type AthleteStatus = 'active' | 'inactive';
export type AthleteGender = 'male' | 'female' | 'other';

export type Athlete = {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: AthleteGender | null;
  jersey_number: number | null;
  position: string | null;
  status: AthleteStatus;
  created_at: string;
};

// ── Team Athletes (join) ──────────────────────────────────────
export type TeamAthlete = {
  id: string;
  team_id: string;
  athlete_id: string;
  created_at: string;
};

// ── Session Athletes (join) ───────────────────────────────────
export type SessionAthlete = {
  id: string;
  session_id: string;
  athlete_id: string;
  is_guest: boolean;
  created_at: string;
};

// ── Session Attendance ────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'justified';

export type SessionAttendance = {
  id: string;
  session_id: string;
  athlete_id: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
};

// ── Athlete Session Reviews ────────────────────────────────────
export type AthleteSessionReview = {
  id: string;
  session_id: string;
  athlete_id: string;
  rating: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};
