import type { SessionStatus, ExerciseCategory, EventType } from './supabase';
import { Dumbbell, Trophy, Activity, Video, type LucideIcon } from 'lucide-react';

export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; dot: string; icon: LucideIcon }> = {
  training: { label: 'Training', color: 'text-accent-700', bg: 'bg-accent-50', dot: 'bg-accent-500', icon: Dumbbell },
  match: { label: 'Match', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', icon: Trophy },
  gym: { label: 'Gym', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500', icon: Activity },
  video: { label: 'Video', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500', icon: Video },
};

export const EVENT_TYPES: EventType[] = ['training', 'match', 'gym', 'video'];

export const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; bg: string; dot: string }> = {
  planned: { label: 'Planned', color: 'text-ink-600', bg: 'bg-ink-100', dot: 'bg-ink-400' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-400' },
};

export const CATEGORY_CONFIG: Record<ExerciseCategory, { label: string; color: string; bg: string }> = {
  warmup: { label: 'Warm-up', color: 'text-amber-700', bg: 'bg-amber-50' },
  main: { label: 'Main', color: 'text-accent-700', bg: 'bg-accent-50' },
  cooldown: { label: 'Cool-down', color: 'text-blue-700', bg: 'bg-blue-50' },
  game: { label: 'Game', color: 'text-purple-700', bg: 'bg-purple-50' },
};

export const STATUS_ORDER: SessionStatus[] = ['planned', 'in_progress', 'completed', 'cancelled'];

export function statusToIndex(status: SessionStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export function nextStatus(status: SessionStatus): SessionStatus {
  const idx = statusToIndex(status);
  if (idx < 2) return STATUS_ORDER[idx + 1];
  return status;
}
