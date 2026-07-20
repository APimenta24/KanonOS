import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type TrainingSession, type SessionStatus, type EventType } from '../lib/supabase';
import { useWorkingContext } from '../lib/working-context';
import { Plus, ClipboardList, X, Dumbbell, Trophy, Activity, Video, Clock, ChevronRight, Filter } from 'lucide-react';

const EVENT_ICONS: Record<EventType, typeof Dumbbell> = {
  training: Dumbbell,
  match: Trophy,
  gym: Activity,
  video: Video,
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  planned: 'bg-ink-100 text-ink-600',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
};

const EVENT_LABELS: Record<EventType, string> = {
  training: 'Training',
  match: 'Match',
  gym: 'Gym',
  video: 'Video',
};

type FilterType = 'all' | SessionStatus | EventType;

export function SessionsPage() {
  const { team } = useWorkingContext();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:30');
  const [eventType, setEventType] = useState<EventType>('training');
  const [location, setLocation] = useState('');
  const [objectives, setObjectives] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!team) { setSessions([]); setLoading(false); return; }
    const { data } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('team_id', team.id)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    setSessions((data as TrainingSession[]) || []);
    setLoading(false);
  }, [team]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const resetForm = () => {
    setTitle(''); setDate(''); setTime('18:30'); setEventType('training');
    setLocation(''); setObjectives(''); setNotes(''); setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setCreating(true); setError(null);
    const sessionDate = new Date(date);
    const weekNumber = getISOWeek(sessionDate);
    const { error } = await supabase.from('training_sessions').insert({
      team_id: team.id, title, date, time, event_type: eventType,
      location: location || null, objectives: objectives || null, notes: notes || null,
      status: 'planned', week_number: weekNumber, week_year: sessionDate.getFullYear(),
    });
    setCreating(false);
    if (error) { setError(error.message); return; }
    setShowCreate(false); resetForm(); loadSessions();
  };

  const filtered = sessions.filter((s) => {
    if (filter === 'all') return true;
    if (['planned', 'in_progress', 'completed', 'cancelled'].includes(filter)) return s.status === filter;
    return s.event_type === filter;
  });

  // Group by upcoming / past
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = filtered.filter((s) => s.date >= today);
  const past = filtered.filter((s) => s.date < today).reverse();

  if (!team) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink-800 mb-2">Sessions</h1>
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">Select a team to view and create sessions.</p>
        </div>
      </div>
    );
  }

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Planned', value: 'planned' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Training', value: 'training' },
    { label: 'Match', value: 'match' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-800">Sessions</h1>
          <p className="mt-1 text-sm text-ink-500">{team.name} · {filtered.length} sessions</p>
        </div>
        <button onClick={() => { setShowCreate(true); resetForm(); }}
          className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors">
          <Plus className="h-4 w-4" /> New Session
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        <Filter className="h-4 w-4 text-ink-400 shrink-0" />
        {filters.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f.value ? 'bg-accent-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading && <div className="text-sm text-ink-400">Loading sessions...</div>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">No sessions found. Create your first session.</p>
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-ink-700 uppercase tracking-wider">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map((s) => <SessionCard key={s.id} session={s} onClick={() => navigate(`/sessions/${s.id}`)} />)}
          </div>
        </div>
      )}

      {!loading && past.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-700 uppercase tracking-wider">Past</h2>
          <div className="space-y-2">
            {past.map((s) => <SessionCard key={s.id} session={s} onClick={() => navigate(`/sessions/${s.id}`)} />)}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-800">New Session</h3>
              <button onClick={() => setShowCreate(false)} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-ink-700 mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" /></div>
                <div><label className="block text-sm font-medium text-ink-700 mb-1">Time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Event Type</label><select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none"><option value="training">Training</option><option value="match">Match</option><option value="gym">Gym</option><option value="video">Video</option></select></div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Location</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Objectives</label><textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={2} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" /></div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">Cancel</button>
                <button type="submit" disabled={creating} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, onClick }: { session: TrainingSession; onClick: () => void }) {
  const Icon = EVENT_ICONS[session.event_type];
  const date = new Date(session.date);
  return (
    <div className="group flex items-center gap-4 rounded-lg border border-ink-200 bg-white px-4 py-3 hover:border-accent-300 transition-colors cursor-pointer" onClick={onClick}>
      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-accent-50 text-accent-700">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink-800">{session.title}</p>
        <p className="text-xs text-ink-500 mt-0.5 flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {session.time}
          {session.location && ` · ${session.location}`}
        </p>
      </div>
      <span className="text-xs text-ink-400">{EVENT_LABELS[session.event_type]}</span>
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[session.status]}`}>{session.status.replace('_', ' ')}</span>
      <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-accent-500 transition-colors" />
    </div>
  );
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
