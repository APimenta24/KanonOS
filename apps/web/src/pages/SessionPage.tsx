import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Clock, MapPin, Target, Plus, GripVertical, Trash2,
  ChevronRight, ClipboardList, CheckCircle2, Pencil
} from 'lucide-react';
import { supabase, type TrainingSession, type Exercise, type ExerciseCategory, type Team, type SessionReview, type SessionStatus } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { formatDateLong, getISOWeek } from '../lib/date';
import { STATUS_CONFIG, CATEGORY_CONFIG, STATUS_ORDER, statusToIndex } from '../lib/constants';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/States';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea, Select, Label } from '../components/ui/Form';

export function SessionPage({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [review, setReview] = useState<SessionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingSession, setEditingSession] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setReview(reviewData as SessionReview | null);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateStatus = async (newStatus: SessionStatus) => {
    if (!session) return;
    await supabase.from('training_sessions').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', session.id);
    setSession({ ...session, status: newStatus });
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    await supabase.from('exercises').delete().eq('id', exerciseId);
    setExercises(exercises.filter((e) => e.id !== exerciseId));
  };

  const handleDeleteSession = async () => {
    if (!session) return;
    await supabase.from('training_sessions').delete().eq('id', session.id);
    const { week, year } = getISOWeek(new Date(session.date));
    navigate({ name: 'planning-week', year, week });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!session) return <ErrorState message="Session not found" />;

  const totalDuration = exercises.reduce((sum, e) => sum + e.duration_minutes, 0);
  const hasReview = review !== null;
  const currentStatusIdx = statusToIndex(session.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <IconButton onClick={() => {
            const { week, year } = getISOWeek(new Date(session.date));
            navigate({ name: 'planning-week', year, week });
          }} aria-label="Back">
            <ArrowLeft size={18} />
          </IconButton>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team?.color || '#D4D4D8' }} />
              <span className="text-xs text-ink-400">{team?.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">{session.title}</h1>
            <p className="text-sm text-ink-400 mt-0.5">{formatDateLong(session.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditingSession(true)}>
            <Pencil size={13} /> Edit
          </Button>
          {hasReview ? (
            <Button size="sm" onClick={() => navigate({ name: 'review', sessionId: session.id })}>
              <ClipboardList size={14} /> View review
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate({ name: 'review', sessionId: session.id })}>
              <Plus size={14} /> Add review
            </Button>
          )}
        </div>
      </div>

      {/* Status progression */}
      <div className="bg-white rounded-xl border border-ink-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-ink-500 uppercase tracking-wide">Status</span>
          <span className="text-xs text-ink-400">{totalDuration} min total</span>
        </div>
        <div className="flex items-center gap-1">
          {STATUS_ORDER.map((s, i) => {
            const config = STATUS_CONFIG[s];
            const isPast = i < currentStatusIdx;
            const isCurrent = i === currentStatusIdx;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => updateStatus(s)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent ? `${config.bg} ${config.color} ring-1 ring-current ring-opacity-20` :
                    isPast ? 'text-ink-500' : 'text-ink-300 hover:text-ink-500'
                  }`}
                >
                  {isPast ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                   isCurrent ? <span className={`w-2 h-2 rounded-full ${config.dot}`} /> :
                   <span className="w-2 h-2 rounded-full bg-ink-200" />}
                  {config.label}
                </button>
                {i < STATUS_ORDER.length - 1 && (
                  <ChevronRight size={14} className="text-ink-200 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Session info */}
      <div className="bg-white rounded-xl border border-ink-100 p-5 space-y-4">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <Label>Time</Label>
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <Clock size={14} className="text-ink-400" /> {session.time}
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <MapPin size={14} className="text-ink-400" /> {session.location || '—'}
            </div>
          </div>
          <div>
            <Label>Duration</Label>
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <Clock size={14} className="text-ink-400" /> {totalDuration} min
            </div>
          </div>
        </div>
        {session.objectives && (
          <div>
            <Label>Objectives</Label>
            <div className="flex items-start gap-2 text-sm text-ink-700">
              <Target size={14} className="text-ink-400 mt-0.5 flex-shrink-0" />
              <p>{session.objectives}</p>
            </div>
          </div>
        )}
      </div>

      {/* Exercises */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-900">Exercises</h2>
          <Button size="sm" variant="secondary" onClick={() => setShowAddExercise(true)}>
            <Plus size={14} /> Add exercise
          </Button>
        </div>

        {exercises.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={36} />}
            title="No exercises yet"
            description="Add exercises to structure your training session."
            action={<Button size="sm" onClick={() => setShowAddExercise(true)}><Plus size={14} /> Add exercise</Button>}
          />
        ) : (
          <div className="space-y-2">
            {exercises.map((ex, i) => {
              const cat = CATEGORY_CONFIG[ex.category];
              return (
                <div key={ex.id} className="group bg-white rounded-xl border border-ink-100 p-4 hover:border-ink-200 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <GripVertical size={14} className="text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-xs font-bold text-ink-300">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-ink-900">{ex.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.bg} ${cat.color}`}>
                          {cat.label}
                        </span>
                      </div>
                      {ex.description && <p className="text-xs text-ink-500 mt-1">{ex.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-ink-400">
                        <span className="flex items-center gap-1"><Clock size={11} /> {ex.duration_minutes} min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconButton onClick={() => setEditingExercise(ex)} className="w-7 h-7" aria-label="Edit exercise">
                        <Pencil size={13} />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteExercise(ex.id)} className="w-7 h-7" aria-label="Delete exercise">
                        <Trash2 size={13} className="text-red-500" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddExercise && (
        <ExerciseModal
          onClose={() => setShowAddExercise(false)}
          sessionId={session.id}
          orderIndex={exercises.length}
          onSaved={() => { setShowAddExercise(false); loadAll(); }}
        />
      )}

      {editingExercise && (
        <ExerciseModal
          onClose={() => setEditingExercise(null)}
          sessionId={session.id}
          orderIndex={editingExercise.order_index}
          existing={editingExercise}
          onSaved={() => { setEditingExercise(null); loadAll(); }}
        />
      )}

      {editingSession && (
        <EditSessionModal
          onClose={() => setEditingSession(false)}
          session={session}
          onSaved={() => { setEditingSession(false); loadAll(); }}
        />
      )}

      {showDeleteConfirm && (
        <Modal
          open
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete session?"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleDeleteSession} className="bg-red-500 hover:bg-red-600">Delete</Button>
            </>
          }
        >
          <p className="text-sm text-ink-600">This will permanently delete the session and all its exercises. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

function ExerciseModal({
  onClose,
  sessionId,
  orderIndex,
  existing,
  onSaved,
}: {
  onClose: () => void;
  sessionId: string;
  orderIndex: number;
  existing?: Exercise;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [duration, setDuration] = useState(existing?.duration_minutes || 15);
  const [category, setCategory] = useState<ExerciseCategory>(existing?.category || 'main');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (existing) {
      await supabase.from('exercises').update({
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: duration,
        category,
      }).eq('id', existing.id);
    } else {
      await supabase.from('exercises').insert({
        session_id: sessionId,
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: duration,
        category,
        order_index: orderIndex,
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit Exercise' : 'Add Exercise'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Add exercise'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Exercise name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rondo 5v2" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)}>
              <option value="warmup">Warm-up</option>
              <option value="main">Main</option>
              <option value="cooldown">Cool-down</option>
              <option value="game">Game</option>
            </Select>
          </div>
          <div>
            <Label>Duration (min)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 15)} />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes on setup, coaching points, progression…" />
        </div>
      </div>
    </Modal>
  );
}

function EditSessionModal({
  onClose,
  session,
  onSaved,
}: {
  onClose: () => void;
  session: TrainingSession;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(session.time);
  const [location, setLocation] = useState(session.location || '');
  const [objectives, setObjectives] = useState(session.objectives || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const sessionDate = new Date(date);
    const isoWeek = getISOWeek(sessionDate);
    await supabase.from('training_sessions').update({
      title: title.trim(),
      date,
      time,
      location: location.trim() || null,
      objectives: objectives.trim() || null,
      week_number: isoWeek.week,
      week_year: isoWeek.year,
      updated_at: new Date().toISOString(),
    }).eq('id', session.id);
    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Session"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Session title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Campo Principal" />
        </div>
        <div>
          <Label>Objectives</Label>
          <Textarea rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder="What should this session achieve?" />
        </div>
      </div>
    </Modal>
  );
}
