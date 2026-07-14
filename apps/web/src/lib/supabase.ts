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
  athlete_count: number;
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
