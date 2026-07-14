import { useState, useEffect } from 'react';
import { CalendarDays, Users, History, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, type Team, type SessionWithTeam } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { getISOWeek, weekRangeString } from '../lib/date';
import { STATUS_CONFIG } from '../lib/constants';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Button } from '../components/ui/Button';

export function WorkspacePage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<SessionWithTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: teamsData }, { data: sessionsData }] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('training_sessions').select('*, team:teams(id, name, color)').order('date', { ascending: true }),
      ]);
      setTeams(teamsData || []);
      setSessions((sessionsData as unknown as SessionWithTeam[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState />;

  const { week, year } = getISOWeek(new Date());
  const thisWeekSessions = sessions.filter((s) => s.week_number === week && s.week_year === year);
  const upcomingSessions = sessions.filter((s) => new Date(s.date) >= new Date(new Date().toDateString())).slice(0, 5);
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const plannedCount = sessions.filter((s) => s.status === 'planned').length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{greeting}, Coach</h1>
        <p className="text-sm text-ink-500 mt-1">Here's your training overview for this week.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="This week" value={thisWeekSessions.length} sub="sessions planned" icon={<CalendarDays size={16} />} />
        <StatCard label="Teams" value={teams.length} sub="active" icon={<Users size={16} />} />
        <StatCard label="Completed" value={completedCount} sub="all-time" icon={<CheckCircle2 size={16} />} />
        <StatCard label="Planned" value={plannedCount} sub="upcoming" icon={<Clock size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* This week's sessions */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink-900">This Week</h2>
            <button
              onClick={() => navigate({ name: 'planning-week', year, week })}
              className="text-xs text-ink-500 hover:text-ink-900 flex items-center gap-1 transition-colors"
            >
              Open week plan <ArrowRight size={12} />
            </button>
          </div>

          {thisWeekSessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-ink-100 p-8 text-center">
              <p className="text-sm text-ink-400 mb-4">No sessions planned for this week yet.</p>
              <Button size="sm" onClick={() => navigate({ name: 'planning-week', year, week })}>
                Plan this week
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {thisWeekSessions.map((session) => (
                <SessionRow key={session.id} session={session} onClick={() => navigate({ name: 'session', sessionId: session.id })} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: quick links */}
        <div className="space-y-4">
          <QuickLink
            title="Weekly Planning"
            description={`Week ${week} · ${weekRangeString(year, week)}`}
            icon={<CalendarDays size={18} />}
            onClick={() => navigate({ name: 'planning' })}
          />
          <QuickLink
            title="Teams"
            description={`${teams.length} team${teams.length !== 1 ? 's' : ''} active`}
            icon={<Users size={18} />}
            onClick={() => navigate({ name: 'teams' })}
          />
          <QuickLink
            title="History"
            description={`${completedCount} completed sessions`}
            icon={<History size={18} />}
            onClick={() => navigate({ name: 'history' })}
          />
        </div>
      </div>

      {/* Upcoming sessions */}
      {upcomingSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-ink-900 mb-4">Upcoming</h2>
          <div className="space-y-2">
            {upcomingSessions.map((session) => (
              <SessionRow key={session.id} session={session} onClick={() => navigate({ name: 'session', sessionId: session.id })} />
            ))}
          </div>
        </div>
      )}

      {teams.length === 0 && sessions.length === 0 && (
        <EmptyState
          icon={<AlertCircle size={40} />}
          title="Welcome to KanonOS"
          description="Start by creating your first team, then plan your training week."
          action={<Button onClick={() => navigate({ name: 'teams' })}>Create a team</Button>}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-ink-100 p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-ink-400 font-medium">{label}</span>
        <span className="text-ink-300">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-ink-900">{value}</span>
        <span className="text-xs text-ink-400">{sub}</span>
      </div>
    </div>
  );
}

function QuickLink({ title, description, icon, onClick }: { title: string; description: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-ink-100 p-4 text-left hover:border-ink-300 hover:shadow-card-hover transition-all duration-200 group"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-ink-50 flex items-center justify-center text-ink-500 group-hover:bg-ink-900 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          <p className="text-xs text-ink-400 truncate">{description}</p>
        </div>
        <ArrowRight size={14} className="text-ink-300 group-hover:text-ink-600 transition-colors" />
      </div>
    </button>
  );
}

function SessionRow({ session, onClick }: { session: SessionWithTeam; onClick: () => void }) {
  const status = STATUS_CONFIG[session.status];
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-ink-100 p-4 text-left hover:border-ink-300 hover:shadow-card-hover transition-all duration-200 group flex items-center gap-4"
    >
      <div className="flex flex-col items-center justify-center w-12 flex-shrink-0">
        <span className="text-xs text-ink-400 capitalize">
          {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short' })}
        </span>
        <span className="text-lg font-bold text-ink-900">
          {new Date(session.date).getDate()}
        </span>
      </div>
      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: session.team?.color || '#D4D4D8' }} />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-ink-900 truncate">{session.title}</h3>
        <p className="text-xs text-ink-400 mt-0.5">
          {session.team?.name} · {session.time}
          {session.location ? ` · ${session.location}` : ''}
        </p>
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        {status.label}
      </div>
    </button>
  );
}
