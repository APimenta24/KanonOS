import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type TrainingSession, type Exercise, type ExerciseCategory, type SessionStatus, type EventType, type SessionReview, type Team } from '../lib/supabase';
import { CloseSessionModal } from '../components/CloseSessionModal';
import { SessionAthletesSection } from '../components/SessionAthletesSection';
import { ArrowLeft, Dumbbell, Trophy, Activity, Video, MapPin, Clock, Calendar, Pencil, Trash2, Plus, X, FileDown, Users, ClipboardCheck, Target, CheckCircle } from 'lucide-react';

const EVENT_ICONS: Record<EventType, typeof Dumbbell> = {
  training: Dumbbell,
  match: Trophy,
  gym: Activity,
  video: Video,
};

const EVENT_LABELS: Record<EventType, string> = {
  training: 'Training',
  match: 'Match',
  gym: 'Gym',
  video: 'Video',
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  planned: 'bg-ink-100 text-ink-600',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
};

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Warm-up',
  main: 'Main',
  cooldown: 'Cool-down',
  game: 'Game',
};

const CATEGORY_ORDER: ExerciseCategory[] = ['warmup', 'main', 'cooldown', 'game'];

const inputClass = 'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [review, setReview] = useState<SessionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [showExercise, setShowExercise] = useState(false);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: sess } = await supabase.from('training_sessions').select('*').eq('id', id).maybeSingle();
    if (!sess) { setSession(null); setLoading(false); return; }
    const s = sess as TrainingSession;
    setSession(s);
    if (s.team_id) {
      const { data: t } = await supabase.from('teams').select('*').eq('id', s.team_id).maybeSingle();
      setTeam((t as Team) || null);
    }
    const { data: exs } = await supabase.from('exercises').select('*').eq('session_id', id).order('order_index');
    setExercises((exs as Exercise[]) || []);
    const { data: rev } = await supabase.from('session_reviews').select('*').eq('session_id', id).maybeSingle();
    setReview((rev as SessionReview) || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const handleDeleteSession = async () => {
    if (!session || !confirm('Delete this session? This cannot be undone.')) return;
    const { error } = await supabase.from('training_sessions').delete().eq('id', session.id);
    if (error) { setError(error.message); return; }
    navigate('/sessions');
  };

  const handleDeleteExercise = async (exId: string) => {
    const { error } = await supabase.from('exercises').delete().eq('id', exId);
    if (error) { setError(error.message); return; }
    loadSession();
  };

  const totalDuration = exercises.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  if (loading) {
    return <div className="text-sm text-ink-400">Loading session...</div>;
  }

  if (!session) {
    return (
      <div>
        <p className="text-sm text-ink-500">Session not found.</p>
        <button onClick={() => navigate('/sessions')} className="mt-2 text-sm text-accent-600 hover:text-accent-700">Back to sessions</button>
      </div>
    );
  }

  const Icon = EVENT_ICONS[session.event_type];
  const sessionDate = new Date(session.date);

  return (
    <div>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate('/sessions')} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-accent-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Sessions
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCloseSession(true)} className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors">
            <CheckCircle className="h-4 w-4" /> {review ? 'Edit Review' : 'Close Session'}
          </button>
          <button onClick={() => exportPDF(session, team, exercises, review)} className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50 transition-colors">
            <FileDown className="h-4 w-4" /> Export PDF
          </button>
          <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50 transition-colors">
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button onClick={handleDeleteSession} className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Header card */}
      <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink-800">{session.title}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[session.status]}`}>{session.status.replace('_', ' ')}</span>
            </div>
            <p className="mt-1 text-sm text-ink-500">{EVENT_LABELS[session.event_type]}{team && ` · ${team.name}`}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoItem icon={Calendar} label="Date" value={sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} />
          <InfoItem icon={Clock} label="Time" value={session.time} />
          <InfoItem icon={MapPin} label="Location" value={session.location || '—'} />
          <InfoItem icon={Dumbbell} label="Duration" value={session.duration_minutes ? `${session.duration_minutes} min` : `${totalDuration} min`} />
        </div>

        {session.event_type === 'match' && (session.opponent || session.competition) && (
          <div className="mt-4 flex gap-4 rounded-lg bg-accent-50 px-4 py-3">
            {session.opponent && <div><p className="text-xs text-ink-500">Opponent</p><p className="text-sm font-medium text-ink-800">{session.opponent}</p></div>}
            {session.competition && <div><p className="text-xs text-ink-500">Competition</p><p className="text-sm font-medium text-ink-800">{session.competition}</p></div>}
          </div>
        )}

        {session.objectives && (
          <div className="mt-4">
            <p className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-1">Objectives</p>
            <p className="text-sm text-ink-700">{session.objectives}</p>
          </div>
        )}
      </div>

      {/* Exercises */}
      <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-800">Exercises</h2>
            <p className="text-xs text-ink-500">{exercises.length} exercises · {totalDuration} min total</p>
          </div>
          <button onClick={() => { setEditExercise(null); setShowExercise(true); }} className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors">
            <Plus className="h-4 w-4" /> Add Exercise
          </button>
        </div>

        {exercises.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-200 p-8 text-center">
            <Dumbbell className="mx-auto mb-2 h-6 w-6 text-ink-300" />
            <p className="text-sm text-ink-500">No exercises yet. Add the first one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {CATEGORY_ORDER.map((cat) => {
              const catExercises = exercises.filter((e) => e.category === cat);
              if (catExercises.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="mb-2 text-xs font-semibold text-ink-500 uppercase tracking-wider">{CATEGORY_LABELS[cat]}</h3>
                  <div className="space-y-2">
                    {catExercises.map((ex, idx) => {
                      const globalIdx = exercises.indexOf(ex);
                      return (
                        <div key={ex.id} className="group flex items-start gap-3 rounded-lg border border-ink-100 bg-ink-50/50 p-3 hover:border-accent-200 transition-colors">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-100 text-xs font-semibold text-accent-700">{globalIdx + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-ink-800">{ex.name}</p>
                              <span className="text-xs text-ink-400">{ex.duration_minutes} min</span>
                            </div>
                            {ex.description && <p className="mt-0.5 text-xs text-ink-600">{ex.description}</p>}
                            <div className="mt-1 flex flex-wrap gap-2">
                              {ex.objective && <Tag label={ex.objective} />}
                              {ex.training_type && <Tag label={ex.training_type} />}
                              {ex.equipment && <Tag label={ex.equipment} />}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditExercise(ex); setShowExercise(true); }} className="text-ink-400 hover:text-accent-600 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteExercise(ex.id)} className="text-ink-400 hover:text-red-500 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Session Athletes */}
      {session.event_type !== 'video' && team && (
        <SessionAthletesSection sessionId={session.id} teamId={team.id} />
      )}

      {/* Notes */}
      {session.notes && (
        <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold text-ink-800">Notes</h2>
          <p className="text-sm text-ink-600 whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}

      {/* Session Review (read-only display) */}
      {review && (
        <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-accent-600" />
            <h2 className="text-lg font-semibold text-ink-800">Session Review</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <RatingCard label="Intensity" value={review.intensity_rating} />
            <RatingCard label="Objectives" value={review.objectives_rating} />
            <RatingCard label="Quality" value={review.quality_rating} />
          </div>
          {review.objective_achieved && (
            <div className="mt-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-ink-400" />
              <span className="text-sm text-ink-600">Objective achieved: <span className="font-medium text-ink-800 capitalize">{review.objective_achieved}</span></span>
            </div>
          )}
          {review.notes && <p className="mt-3 text-sm text-ink-600">{review.notes}</p>}
          {review.highlights && <p className="mt-2 text-sm text-ink-600"><span className="font-medium text-ink-700">Highlights:</span> {review.highlights}</p>}
          {review.next_actions && <p className="mt-2 text-sm text-ink-600"><span className="font-medium text-ink-700">Next actions:</span> {review.next_actions}</p>}
        </div>
      )}

      {/* Close session modal */}
      {showCloseSession && (
        <CloseSessionModal session={session} existingReview={review} onClose={() => setShowCloseSession(false)} onSaved={() => { setShowCloseSession(false); loadSession(); }} />
      )}

      {/* Edit session modal */}
      {showEdit && session && (
        <SessionEditModal session={session} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); loadSession(); }} />
      )}

      {/* Exercise modal */}
      {showExercise && (
        <ExerciseModal sessionId={session.id} exercise={editExercise} orderIndex={exercises.length} onClose={() => setShowExercise(false)} onSaved={() => { setShowExercise(false); loadSession(); }} />
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-ink-400" />
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-sm font-medium text-ink-800">{value}</p>
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return <span className="inline-block rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-600">{label}</span>;
}

function RatingCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-50 p-3 text-center">
      <p className="text-2xl font-bold text-accent-700">{value}/5</p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Session Edit Modal ─────────────────────────────────────────

function SessionEditModal({ session, onClose, onSaved }: { session: TrainingSession; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(session.time);
  const [eventType, setEventType] = useState<EventType>(session.event_type);
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [location, setLocation] = useState(session.location || '');
  const [objectives, setObjectives] = useState(session.objectives || '');
  const [notes, setNotes] = useState(session.notes || '');
  const [duration, setDuration] = useState(session.duration_minutes?.toString() || '');
  const [opponent, setOpponent] = useState(session.opponent || '');
  const [competition, setCompetition] = useState(session.competition || '');
  const [trainingType, setTrainingType] = useState(session.training_type || '');
  const [topic, setTopic] = useState(session.topic || '');
  const [microcycle, setMicrocycle] = useState(session.microcycle || '');
  const [trainingUnit, setTrainingUnit] = useState(session.training_unit || '');
  const [material, setMaterial] = useState(session.material || '');
  const [logistics, setLogistics] = useState(session.logistics || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const sessionDate = new Date(date);
    const weekNumber = getISOWeek(sessionDate);
    const { error } = await supabase.from('training_sessions').update({
      title, date, time, event_type: eventType, status,
      location: location || null, objectives: objectives || null, notes: notes || null,
      duration_minutes: duration ? parseInt(duration) : null,
      opponent: opponent || null, competition: competition || null,
      training_type: trainingType || null, topic: topic || null, microcycle: microcycle || null,
      training_unit: trainingUnit || null, material: material || null, logistics: logistics || null,
      week_number: weekNumber, week_year: sessionDate.getFullYear(),
    }).eq('id', session.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-800">Edit Session</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Event Type</label><select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} className={inputClass}><option value="training">Training</option><option value="match">Match</option><option value="gym">Gym</option><option value="video">Video</option></select></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Status</label><select value={status} onChange={(e) => setStatus(e.target.value as SessionStatus)} className={inputClass}><option value="planned">Planned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Location</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Duration (min)</label><input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} /></div>
          </div>
          {eventType === 'match' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Opponent</label><input type="text" value={opponent} onChange={(e) => setOpponent(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Competition</label><input type="text" value={competition} onChange={(e) => setCompetition(e.target.value)} className={inputClass} /></div>
            </div>
          )}
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Training Type</label><input type="text" value={trainingType} onChange={(e) => setTrainingType(e.target.value)} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Topic</label><input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Microcycle</label><input type="text" value={microcycle} onChange={(e) => setMicrocycle(e.target.value)} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Training Unit</label><input type="text" value={trainingUnit} onChange={(e) => setTrainingUnit(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Material</label><input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className={inputClass} /></div>
          </div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Logistics</label><input type="text" value={logistics} onChange={(e) => setLogistics(e.target.value)} className={inputClass} /></div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Objectives</label><textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={2} className={inputClass} /></div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} /></div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Exercise Modal ─────────────────────────────────────────────

function ExerciseModal({ sessionId, exercise, orderIndex, onClose, onSaved }: {
  sessionId: string; exercise: Exercise | null; orderIndex: number; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(exercise?.name || '');
  const [description, setDescription] = useState(exercise?.description || '');
  const [duration, setDuration] = useState(exercise?.duration_minutes?.toString() || '15');
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category || 'main');
  const [objective, setObjective] = useState(exercise?.objective || '');
  const [trainingType, setTrainingType] = useState(exercise?.training_type || '');
  const [equipment, setEquipment] = useState(exercise?.equipment || '');
  const [logistics, setLogistics] = useState(exercise?.logistics || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      session_id: sessionId, name, description: description || null,
      duration_minutes: parseInt(duration) || 0, category,
      objective: objective || null, training_type: trainingType || null,
      equipment: equipment || null, logistics: logistics || null,
      order_index: exercise?.order_index ?? orderIndex,
    };
    const { error } = exercise
      ? await supabase.from('exercises').update(payload).eq('id', exercise.id)
      : await supabase.from('exercises').insert(payload);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-800">{exercise ? 'Edit Exercise' : 'New Exercise'}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} /></div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Duration (min)</label><input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} required className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Category</label><select value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)} className={inputClass}><option value="warmup">Warm-up</option><option value="main">Main</option><option value="cooldown">Cool-down</option><option value="game">Game</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Objective</label><input type="text" value={objective} onChange={(e) => setObjective(e.target.value)} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Training Type</label><input type="text" value={trainingType} onChange={(e) => setTrainingType(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Equipment</label><input type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputClass} /></div>
          </div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Logistics</label><input type="text" value={logistics} onChange={(e) => setLogistics(e.target.value)} className={inputClass} /></div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PDF Export ─────────────────────────────────────────────────

function exportPDF(session: TrainingSession, team: Team | null, exercises: Exercise[], review: SessionReview | null) {
  const exerciseByCat = (cat: ExerciseCategory) => exercises.filter((e) => e.category === cat);
  const exerciseHTML = (ex: Exercise, i: number) => `
    <tr>
      <td>${i}</td>
      <td><strong>${escapeHtml(ex.name)}</strong>${ex.description ? `<br/><span class="desc">${escapeHtml(ex.description)}</span>` : ''}</td>
      <td>${ex.duration_minutes}</td>
      <td>${ex.objective ? escapeHtml(ex.objective) : ''}</td>
      <td>${ex.training_type ? escapeHtml(ex.training_type) : ''}</td>
      <td>${ex.equipment ? escapeHtml(ex.equipment) : ''}</td>
    </tr>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(session.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 2px solid #0d7664; padding-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 16px; }
    .info { display: flex; gap: 24px; margin: 12px 0; font-size: 13px; }
    .info span { color: #666; }
    .objective { background: #f0fdfa; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 8px; background: #f5f5f4; border-bottom: 2px solid #e7e5e4; }
    td { padding: 8px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
    .desc { color: #666; font-size: 11px; }
    .notes { font-size: 13px; margin-top: 12px; white-space: pre-wrap; }
    .review { background: #f5f5f4; padding: 16px; border-radius: 8px; margin-top: 16px; }
    .ratings { display: flex; gap: 32px; margin: 8px 0; }
    .rating { text-align: center; }
    .rating .num { font-size: 28px; font-weight: bold; color: #0d7664; }
    @media print { body { padding: 20px; } }
  </style></head><body>
    <h1>${escapeHtml(session.title)}</h1>
    <div class="meta">${escapeHtml(EVENT_LABELS[session.event_type])}${team ? ' · ' + escapeHtml(team.name) : ''} · ${session.status.replace('_', ' ')}</div>
    <div class="info">
      <div><span>Date: </span>${new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
      <div><span>Time: </span>${session.time}</div>
      ${session.location ? `<div><span>Location: </span>${escapeHtml(session.location)}</div>` : ''}
      <div><span>Duration: </span>${session.duration_minutes || exercises.reduce((s, e) => s + e.duration_minutes, 0)} min</div>
    </div>
    ${session.event_type === 'match' && session.opponent ? `<div class="info"><div><span>Opponent: </span>${escapeHtml(session.opponent)}</div>${session.competition ? `<div><span>Competition: </span>${escapeHtml(session.competition)}</div>` : ''}</div>` : ''}
    ${session.objectives ? `<div class="objective"><strong>Objectives:</strong> ${escapeHtml(session.objectives)}</div>` : ''}
    <h2>Exercises</h2>
    ${CATEGORY_ORDER.map((cat) => {
      const items = exerciseByCat(cat);
      if (items.length === 0) return '';
      return `<h3 style="font-size:13px;margin:12px 0 4px;color:#666;text-transform:uppercase">${CATEGORY_LABELS[cat]}</h3>
      <table><thead><tr><th>#</th><th>Exercise</th><th>Min</th><th>Objective</th><th>Type</th><th>Equipment</th></tr></thead>
      <tbody>${items.map((ex, i) => exerciseHTML(ex, i + 1)).join('')}</tbody></table>`;
    }).join('')}
    ${session.notes ? `<h2>Notes</h2><div class="notes">${escapeHtml(session.notes)}</div>` : ''}
    ${review ? `<div class="review"><h2>Session Review</h2><div class="ratings">
      <div class="rating"><div class="num">${review.intensity_rating}/5</div>Intensity</div>
      <div class="rating"><div class="num">${review.objectives_rating}/5</div>Objectives</div>
      <div class="rating"><div class="num">${review.quality_rating}/5</div>Quality</div>
    </div>${review.objective_achieved ? `<p><strong>Objective achieved:</strong> ${review.objective_achieved}</p>` : ''}
    ${review.notes ? `<p style="margin-top:8px">${escapeHtml(review.notes)}</p>` : ''}
    ${review.highlights ? `<p style="margin-top:4px"><strong>Highlights:</strong> ${escapeHtml(review.highlights)}</p>` : ''}
    ${review.next_actions ? `<p style="margin-top:4px"><strong>Next actions:</strong> ${escapeHtml(review.next_actions)}</p>` : ''}</div>` : ''}
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
