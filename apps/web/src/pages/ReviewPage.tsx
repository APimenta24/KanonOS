import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { supabase, type TrainingSession, type Team, type SessionReview, type Exercise } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { formatDateLong } from '../lib/date';
import { CATEGORY_CONFIG, STATUS_CONFIG } from '../lib/constants';
import { LoadingState, ErrorState } from '../components/ui/States';
import { Button, IconButton } from '../components/ui/Button';
import { Textarea, Label } from '../components/ui/Form';

export function ReviewPage({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [review, setReview] = useState<SessionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [intensity, setIntensity] = useState(3);
  const [objectives, setObjectivesRating] = useState(3);
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [highlights, setHighlights] = useState('');
  const [nextActions, setNextActions] = useState('');

  const loadAll = useCallback(async () => {
    const { data: sessionData, error: sessionErr } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr || !sessionData) {
      setError('Session not found');
      setLoading(false);
      return;
    }

    const s = sessionData as TrainingSession;
    setSession(s);

    const [{ data: teamData }, { data: exercisesData }, { data: reviewData }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', s.team_id).maybeSingle(),
      supabase.from('exercises').select('*').eq('session_id', sessionId).order('order_index', { ascending: true }),
      supabase.from('session_reviews').select('*').eq('session_id', sessionId).maybeSingle(),
    ]);

    setTeam(teamData as Team | null);
    setExercises((exercisesData as Exercise[]) || []);
    const r = reviewData as SessionReview | null;
    setReview(r);
    if (r) {
      setIntensity(r.intensity_rating);
      setObjectivesRating(r.objectives_rating);
      setQuality(r.quality_rating);
      setNotes(r.notes || '');
      setHighlights(r.highlights || '');
      setNextActions(r.next_actions || '');
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    if (review) {
      await supabase.from('session_reviews').update({
        intensity_rating: intensity,
        objectives_rating: objectives,
        quality_rating: quality,
        notes: notes.trim() || null,
        highlights: highlights.trim() || null,
        next_actions: nextActions.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', review.id);
    } else {
      await supabase.from('session_reviews').insert({
        session_id: session.id,
        intensity_rating: intensity,
        objectives_rating: objectives,
        quality_rating: quality,
        notes: notes.trim() || null,
        highlights: highlights.trim() || null,
        next_actions: nextActions.trim() || null,
      });
      // Also mark session as completed
      await supabase.from('training_sessions').update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', session.id);
    }
    setSaving(false);
    navigate({ name: 'session', sessionId: session.id });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!session) return <ErrorState message="Session not found" />;

  const status = STATUS_CONFIG[session.status];
  const totalDuration = exercises.reduce((sum, e) => sum + e.duration_minutes, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <IconButton onClick={() => navigate({ name: 'session', sessionId: session.id })} aria-label="Back to session">
            <ArrowLeft size={18} />
          </IconButton>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team?.color || '#D4D4D8' }} />
              <span className="text-xs text-ink-400">{team?.name}</span>
              <span className="text-ink-200">·</span>
              <span className="text-xs text-ink-400">{formatDateLong(session.date)}</span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">Review: {session.title}</h1>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : review ? 'Update review' : 'Save review'}
        </Button>
      </div>

      {/* Session summary */}
      <div className="bg-white rounded-xl border border-ink-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-ink-500 uppercase tracking-wide">Session Summary</h2>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <Label>Time</Label>
            <p className="text-sm text-ink-700">{session.time}</p>
          </div>
          <div>
            <Label>Location</Label>
            <p className="text-sm text-ink-700">{session.location || '—'}</p>
          </div>
          <div>
            <Label>Exercises</Label>
            <p className="text-sm text-ink-700">{exercises.length} · {totalDuration} min</p>
          </div>
        </div>
        {session.objectives && (
          <div className="mt-4 pt-4 border-t border-ink-100">
            <Label>Planned objectives</Label>
            <p className="text-sm text-ink-700">{session.objectives}</p>
          </div>
        )}
        {exercises.length > 0 && (
          <div className="mt-4 pt-4 border-t border-ink-100">
            <Label>Exercise list</Label>
            <div className="space-y-1.5">
              {exercises.map((ex, i) => {
                const cat = CATEGORY_CONFIG[ex.category];
                return (
                  <div key={ex.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-ink-300 font-bold w-5">{i + 1}.</span>
                    <span className="text-ink-700">{ex.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.bg} ${cat.color}`}>{cat.label}</span>
                    <span className="text-xs text-ink-400 ml-auto">{ex.duration_minutes} min</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ratings */}
      <div className="bg-white rounded-xl border border-ink-100 p-5">
        <h2 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-4">Coach Ratings</h2>
        <div className="space-y-5">
          <RatingRow label="Intensity" value={intensity} onChange={setIntensity} description="How demanding was the session?" />
          <RatingRow label="Objectives Met" value={objectives} onChange={setObjectivesRating} description="Were the planned objectives achieved?" />
          <RatingRow label="Overall Quality" value={quality} onChange={setQuality} description="How would you rate the session overall?" />
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-ink-100 p-5 space-y-4">
        <h2 className="text-xs font-medium text-ink-500 uppercase tracking-wide">Reflection</h2>
        <div>
          <Label>What went well</Label>
          <Textarea rows={2} value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="Highlights and positives from the session…" />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="General observations, player response, tactical notes…" />
        </div>
        <div>
          <Label>Actions for next session</Label>
          <Textarea rows={2} value={nextActions} onChange={(e) => setNextActions(e.target.value)} placeholder="What to adjust, focus on, or change next time…" />
        </div>
      </div>
    </div>
  );
}

function RatingRow({ label, value, onChange, description }: { label: string; value: number; onChange: (v: number) => void; description: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-semibold text-ink-900">{label}</span>
          <span className="text-xs text-ink-400 ml-2">{description}</span>
        </div>
        <span className="text-sm font-bold text-ink-700">{value}/5</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-9 rounded-lg border transition-all flex items-center justify-center ${
              n <= value
                ? 'bg-ink-900 border-ink-900 text-white'
                : 'bg-white border-ink-200 text-ink-300 hover:border-ink-300'
            }`}
          >
            <Star size={14} fill={n <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </div>
  );
}
