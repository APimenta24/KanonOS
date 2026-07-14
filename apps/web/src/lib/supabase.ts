import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'kanonos-mvp',
    },
  },
});

export type Team = {
  id: string;
  name: string;
  season: string;
  color: string;
  sport: string;
  age_category: string | null;
  athlete_count: number;
  created_at: string;
};

export type AthleteStatus = 'active' | 'inactive';
export type AthleteGender = 'male' | 'female' | 'other';

export type Athlete = {
  id: string;
  name: string;
  date_of_birth: string;
  gender: AthleteGender;
  jersey_number: number | null;
  position: string | null;
  status: AthleteStatus;
  created_at: string;
};

export type TeamAthlete = {
  id: string;
  team_id: string;
  athlete_id: string;
  created_at: string;
};

export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export type TrainingSession = {
  id: string;
  team_id: string;
  title: string;
  date: string;
  time: string;
  location: string | null;
  objectives: string | null;
  status: SessionStatus;
  week_number: number;
  week_year: number;
  created_at: string;
  updated_at: string;
};

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
  equipment: string | null;
  logistics: string | null;
  created_at: string;
};

export type SessionReview = {
  id: string;
  session_id: string;
  intensity_rating: number;
  objectives_rating: number;
  quality_rating: number;
  notes: string | null;
  highlights: string | null;
  next_actions: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionWithTeam = TrainingSession & {
  team: Pick<Team, 'id' | 'name' | 'color'> | null;
};

export type SessionWithDetails = TrainingSession & {
  team: Pick<Team, 'id' | 'name' | 'color'> | null;
  exercises: Exercise[];
  review: SessionReview | null;
};
