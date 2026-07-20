import { useState, useEffect, useCallback } from 'react';
import { supabase, type TrainingSession, type SessionReview, type Athlete, type ObjectiveAchieved, type AttendanceStatus } from '../lib/supabase';
import { X, ClipboardCheck, Star, Users } from 'lucide-react';

const inputClass = 'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none';

type AthleteAttendance = {
  athlete: Athlete;
  status: AttendanceStatus;
  rating: number;
  note: string;
};

export function CloseSessionModal({ session, existingReview, onClose, onSaved }: {
  session: TrainingSession;
  existingReview: SessionReview | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [intensity, setIntensity] = useState(existingReview?.intensity_rating || 3);
  const [objectivesRating, setObjectivesRating] = useState(existingReview?.objectives_rating || 3);
  const [quality, setQuality] = useState(existingReview?.quality_rating || 3);
  const [notes, setNotes] = useState(existingReview?.notes || '');
  const [highlights, setHighlights] = useState(existingReview?.highlights || '');
  const [nextActions, setNextActions] = useState(existingReview?.next_actions || '');
  const [objectiveAchieved, setObjectiveAchieved] = useState<ObjectiveAchieved | ''>(existingReview?.objective_achieved || '');
  const [athletes, setAthletes] = useState<AthleteAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAthletes = useCallback(async () => {
    const { data: sessionAthletes } = await supabase
      .from('session_athletes')
      .select('athlete_id, athletes(*)')
      .eq('session_id', session.id);
    const athleteRows = (sessionAthletes as unknown as { athlete_id: string; athletes: Athlete }[]) || [];
    const athleteList = athleteRows.map((r) => r.athletes).filter(Boolean);
    if (athleteList.length === 0) { setAthletes([]); setLoading(false); return; }

    const ids = athleteList.map((a) => a.id);
    const [attRes, reviewRes] = await Promise.all([
      supabase.from('session_attendance').select('athlete_id, status').eq('session_id', session.id).in('athlete_id', ids),
      supabase.from('athlete_session_reviews').select('athlete_id, rating, note').eq('session_id', session.id).in('athlete_id', ids),
    ]);

    const attMap = new Map<string, AttendanceStatus>(
      ((attRes.data as { athlete_id: string; status: AttendanceStatus }[]) || []).map((r) => [r.athlete_id, r.status])
    );
    const revMap = new Map<string, { rating: number; note: string }>(
      ((reviewRes.data as { athlete_id: string; rating: number; note: string | null }[]) || []).map((r) => [r.athlete_id, { rating: r.rating, note: r.note || '' }])
    );

    setAthletes(athleteList.map((a) => ({
      athlete: a,
      status: attMap.get(a.id) || 'present',
      rating: revMap.get(a.id)?.rating || 3,
      note: revMap.get(a.id)?.note || '',
    })));
    setLoading(false);
  }, [session.id]);

  useEffect(() => { loadAthletes(); }, [loadAthletes]);

  const updateAthlete = (idx: number, updates: Partial<AthleteAttendance>) => {
    setAthletes((prev) => prev.map((a, i) => (i === idx ? { ...a, ...updates } : a)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      // Upsert session review
      const reviewPayload = {
        session_id: session.id,
        intensity_rating: intensity,
        objectives_rating: objectivesRating,
        quality_rating: quality,
        notes: notes || null,
        highlights: highlights || null,
        next_actions: nextActions || null,
        objective_achieved: objectiveAchieved || null,
      };
      if (existingReview) {
        const { error } = await supabase.from('session_reviews').update(reviewPayload).eq('id', existingReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('session_reviews').insert(reviewPayload);
        if (error) throw error;
      }

      // Mark session completed
      if (session.status !== 'completed') {
        const { error } = await supabase.from('training_sessions').update({ status: 'completed' }).eq('id', session.id);
        if (error) throw error;
      }

      // Upsert attendance + athlete reviews
      for (const a of athletes) {
        const attPayload = { session_id: session.id, athlete_id: a.athlete.id, status: a.status };
        const { data: existingAtt } = await supabase
          .from('session_attendance')
          .select('id')
          .eq('session_id', session.id)
          .eq('athlete_id', a.athlete.id)
          .maybeSingle();
        if (existingAtt) {
          await supabase.from('session_attendance').update(attPayload).eq('id', (existingAtt as { id: string }).id);
        } else {
          await supabase.from('session_attendance').insert(attPayload);
        }

        const revPayload = { session_id: session.id, athlete_id: a.athlete.id, rating: a.rating, note: a.note || null };
        const { data: existingRev } = await supabase
          .from('athlete_session_reviews')
          .select('id')
          .eq('session_id', session.id)
          .eq('athlete_id', a.athlete.id)
          .maybeSingle();
        if (existingRev) {
          await supabase.from('athlete_session_reviews').update(revPayload).eq('id', (existingRev as { id: string }).id);
        } else {
          await supabase.from('athlete_session_reviews').insert(revPayload);
        }
      }

      setSaving(false);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-accent-600" />
            <h3 className="text-lg font-semibold text-ink-800">{existingReview ? 'Edit Session Review' : 'Close Session'}</h3>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Session Ratings */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink-700">Session Ratings</h4>
            <div className="grid grid-cols-3 gap-4">
              <RatingInput label="Intensity" value={intensity} onChange={setIntensity} />
              <RatingInput label="Objectives" value={objectivesRating} onChange={setObjectivesRating} />
              <RatingInput label="Quality" value={quality} onChange={setQuality} />
            </div>
          </div>

          {/* Objective Achieved */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Objective Achieved</label>
            <div className="flex gap-2">
              {(['yes', 'partial', 'no'] as ObjectiveAchieved[]).map((v) => (
                <button key={v} type="button" onClick={() => setObjectiveAchieved(v)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${objectiveAchieved === v ? 'border-accent-400 bg-accent-50 text-accent-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Highlights / Next Actions */}
          <div className="grid grid-cols-1 gap-3">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Highlights</label><textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={2} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Next Actions</label><textarea value={nextActions} onChange={(e) => setNextActions(e.target.value)} rows={2} className={inputClass} /></div>
          </div>

          {/* Athlete Attendance + Ratings */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-600" />
              <h4 className="text-sm font-semibold text-ink-700">Athlete Attendance &amp; Ratings</h4>
            </div>
            {loading ? (
              <p className="text-sm text-ink-400">Loading athletes...</p>
            ) : athletes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink-200 p-4 text-center">
                <p className="text-sm text-ink-500">No athletes assigned to this session. Add athletes in the session detail page first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {athletes.map((a, idx) => (
                  <div key={a.athlete.id} className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-ink-800">{a.athlete.name}</p>
                      <div className="flex items-center gap-1">
                        {(['present', 'absent', 'justified'] as AttendanceStatus[]).map((st) => (
                          <button key={st} type="button" onClick={() => updateAthlete(idx, { status: st })}
                            className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors ${a.status === st ? 'bg-accent-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" onClick={() => updateAthlete(idx, { rating: n })}
                            className={n <= a.rating ? 'text-amber-400' : 'text-ink-200 hover:text-ink-300'}>
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        ))}
                      </div>
                      <input type="text" placeholder="Note..." value={a.note}
                        onChange={(e) => updateAthlete(idx, { note: e.target.value })}
                        className="flex-1 rounded-md border border-ink-200 px-2 py-1 text-xs focus:border-accent-400 focus:outline-none" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">Cancel</button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
              {saving ? 'Saving...' : existingReview ? 'Update Review' : 'Close Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-lg bg-ink-50 p-3 text-center">
      <p className="text-xs text-ink-500 mb-1">{label}</p>
      <div className="flex items-center justify-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={n <= value ? 'text-amber-400' : 'text-ink-200 hover:text-ink-300'}>
            <Star className="h-4 w-4 fill-current" />
          </button>
        ))}
      </div>
      <p className="text-xs font-medium text-ink-700 mt-1">{value}/5</p>
    </div>
  );
}
