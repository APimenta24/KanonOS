import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type TrainingSession, type Team, type Season, type Microcycle } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useWorkingContext } from '../lib/working-context';
import { Dumbbell, Trophy, Activity, Video, Clock, MapPin, ArrowRight, Calendar, ClipboardCheck, AlertCircle } from 'lucide-react';

const EVENT_ICONS: Record<string, typeof Dumbbell> = {
  training: Dumbbell,
  match: Trophy,
  gym: Activity,
  video: Video,
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-ink-100 text-ink-600',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
};

type RecentItem = {
  id: string;
  type: 'session' | 'microcycle' | 'season';
  title: string;
  subtitle: string;
  created_at: string;
  session_id?: string;
};

export function WorkspacePage() {
  const { user, workspace } = useAuth();
  const { team, season } = useWorkingContext();
  const navigate = useNavigate();
  const [todaySessions, setTodaySessions] = useState<TrainingSession[]>([]);
  const [upcomingMatch, setUpcomingMatch] = useState<TrainingSession | null>(null);
  const [pendingReviews, setPendingReviews] = useState<TrainingSession[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!team) { setLoading(false); return; }
    const today = new Date().toISOString().slice(0, 10);

    // Today's sessions
    const { data: todayData } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('team_id', team.id)
      .eq('date', today)
      .order('time');
    setTodaySessions((todayData as TrainingSession[]) || []);

    // Upcoming match
    const { data: matchData } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('team_id', team.id)
      .eq('event_type', 'match')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1);
    setUpcomingMatch((matchData as TrainingSession[])?.[0] || null);

    // Pending reviews: completed sessions without a review
    const { data: completed } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('team_id', team.id)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(10);
    const completedSessions = (completed as TrainingSession[]) || [];
    if (completedSessions.length > 0) {
      const ids = completedSessions.map((s) => s.id);
      const { data: reviews } = await supabase
        .from('session_reviews')
        .select('session_id')
        .in('session_id', ids);
      const reviewedIds = new Set((reviews || []).map((r: { session_id: string }) => r.session_id));
      setPendingReviews(completedSessions.filter((s) => !reviewedIds.has(s.id)).slice(0, 5));
    } else {
      setPendingReviews([]);
    }

    // Recent activity: mix of recently created sessions, microcycles, seasons
    const [sessRes, microRes, seasonRes] = await Promise.all([
      supabase.from('training_sessions').select('id,title,date,created_at').eq('team_id', team.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('microcycles').select('id,name,created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('seasons').select('id,name,created_at').eq('team_id', team.id).order('created_at', { ascending: false }).limit(3),
    ]);

    const items: RecentItem[] = [];
    (sessRes.data as { id: string; title: string; date: string; created_at: string }[] | null)?.forEach((s) => {
      items.push({ id: s.id, type: 'session', title: s.title, subtitle: `Session · ${s.date}`, created_at: s.created_at, session_id: s.id });
    });
    (microRes.data as { id: string; name: string; created_at: string }[] | null)?.forEach((m) => {
      items.push({ id: m.id, type: 'microcycle', title: m.name, subtitle: 'Microcycle created', created_at: m.created_at });
    });
    (seasonRes.data as { id: string; name: string; created_at: string }[] | null)?.forEach((s) => {
      items.push({ id: s.id, type: 'season', title: s.name, subtitle: 'Season created', created_at: s.created_at });
    });
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    setRecent(items.slice(0, 8));

    // Team / season / microcycle counts
    const { data: teamsData } = await supabase.from('teams').select('*').order('name');
    setTeams((teamsData as Team[]) || []);
    const { data: seasonsData } = await supabase.from('seasons').select('*').eq('team_id', team.id).order('start_date', { ascending: false });
    setSeasons((seasonsData as Season[]) || []);
    const { data: microData } = await supabase.from('microcycles').select('*').order('created_at', { ascending: false }).limit(10);
    setMicrocycles((microData as Microcycle[]) || []);

    setLoading(false);
  }, [team]);

  useEffect(() => { loadData(); }, [loadData]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return <div className="text-sm text-ink-400">Loading workspace...</div>;
  }

  if (!team) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink-800 mb-2">{workspace?.name || 'Workspace'}</h1>
        <p className="text-sm text-ink-500 mb-6">{greeting}, {user?.full_name || user?.email}</p>
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">Select a team from the context bar to see your workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-800">{greeting}, {user?.full_name?.split(' ')[0] || 'Coach'}</h1>
        <p className="mt-1 text-sm text-ink-500">{team.name} · {workspace?.name}</p>
      </div>

      {/* Top row: Today + Upcoming Match */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Today's Sessions */}
        <div className="lg:col-span-2 rounded-xl border border-ink-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent-600" />
              <h2 className="text-lg font-semibold text-ink-800">Today's Sessions</h2>
            </div>
            <span className="text-xs text-ink-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          {todaySessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink-200 p-6 text-center">
              <p className="text-sm text-ink-500">No sessions scheduled today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((s) => {
                const Icon = EVENT_ICONS[s.event_type] || Dumbbell;
                return (
                  <div key={s.id} onClick={() => navigate(`/sessions/${s.id}`)}
                    className="group flex items-center gap-3 rounded-lg border border-ink-100 bg-ink-50/50 px-4 py-3 hover:border-accent-200 hover:bg-accent-50/30 transition-colors cursor-pointer">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-700"><Icon className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-800">{s.title}</p>
                      <p className="text-xs text-ink-500 flex items-center gap-1.5"><Clock className="h-3 w-3" />{s.time}{s.location && <>· <MapPin className="h-3 w-3" /> {s.location}</>}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[s.status]}`}>{s.status.replace('_', ' ')}</span>
                    <ArrowRight className="h-4 w-4 text-ink-300 group-hover:text-accent-500 transition-colors" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Match */}
        <div className="rounded-xl border border-ink-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent-600" />
            <h2 className="text-lg font-semibold text-ink-800">Next Match</h2>
          </div>
          {upcomingMatch ? (
            <div onClick={() => navigate(`/sessions/${upcomingMatch.id}`)} className="cursor-pointer group">
              <div className="rounded-lg bg-accent-50 p-4">
                <p className="text-xs font-medium text-accent-700 uppercase tracking-wider">Match Day</p>
                <p className="mt-1 text-2xl font-bold text-ink-800">{new Date(upcomingMatch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                <p className="text-sm text-ink-600">{new Date(upcomingMatch.date).toLocaleDateString('en-US', { weekday: 'long' })} · {upcomingMatch.time}</p>
              </div>
              {upcomingMatch.opponent && (
                <div className="mt-3">
                  <p className="text-xs text-ink-500">Opponent</p>
                  <p className="text-sm font-semibold text-ink-800">{upcomingMatch.opponent}</p>
                </div>
              )}
              {upcomingMatch.competition && (
                <div className="mt-2">
                  <p className="text-xs text-ink-500">Competition</p>
                  <p className="text-sm font-medium text-ink-700">{upcomingMatch.competition}</p>
                </div>
              )}
              {upcomingMatch.location && (
                <div className="mt-2 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-ink-400" />
                  <p className="text-sm text-ink-600">{upcomingMatch.location}</p>
                </div>
              )}
              <div className="mt-3 flex items-center gap-1 text-sm text-accent-600 group-hover:text-accent-700">
                View details <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-ink-200 p-6 text-center">
              <Trophy className="mx-auto mb-2 h-6 w-6 text-ink-300" />
              <p className="text-sm text-ink-500">No upcoming match.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Reviews */}
      <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-accent-600" />
          <h2 className="text-lg font-semibold text-ink-800">Pending Reviews</h2>
          {pendingReviews.length > 0 && <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">{pendingReviews.length}</span>}
        </div>
        {pendingReviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-200 p-6 text-center">
            <p className="text-sm text-ink-500">All completed sessions have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingReviews.map((s) => (
              <div key={s.id} onClick={() => navigate(`/sessions/${s.id}`)}
                className="group flex items-center gap-3 rounded-lg border border-ink-100 px-4 py-3 hover:border-accent-200 hover:bg-accent-50/30 transition-colors cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-4 w-4" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-800">{s.title}</p>
                  <p className="text-xs text-ink-500">Completed {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
                <span className="text-xs text-accent-600 group-hover:text-accent-700 font-medium">Review now</span>
                <ArrowRight className="h-4 w-4 text-ink-300 group-hover:text-accent-500 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink-800">Recent Activity</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-500">No recent activity.</p>
        ) : (
          <div className="space-y-1">
            {recent.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50 transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-100 text-ink-500 text-xs font-medium">
                  {item.type === 'session' ? <Dumbbell className="h-3.5 w-3.5" /> : item.type === 'microcycle' ? <Calendar className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-ink-700">{item.title}</p>
                  <p className="text-xs text-ink-400">{item.subtitle}</p>
                </div>
                {item.session_id && (
                  <button onClick={() => navigate(`/sessions/${item.session_id}`)} className="text-xs text-accent-600 hover:text-accent-700 font-medium">Open</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Teams" value={teams.length} onClick={() => navigate('/teams')} />
        <StatCard label="Seasons" value={seasons.length} onClick={() => navigate('/planning')} />
        <StatCard label="Microcycles" value={microcycles.length} onClick={() => navigate('/planning')} />
        <StatCard label="Active Season" value={season?.name || '—'} onClick={() => navigate('/planning')} />
      </div>
    </div>
  );
}

function StatCard({ label, value, onClick }: { label: string; value: string | number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-ink-200 bg-white p-4 text-left hover:border-accent-300 transition-colors">
      <p className="text-xs text-ink-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink-800 truncate">{value}</p>
    </button>
  );
}
