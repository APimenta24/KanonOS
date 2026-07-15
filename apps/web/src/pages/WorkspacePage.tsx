import { useState, useEffect } from 'react';
import { CalendarDays, Users, History, ArrowRight, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';
import { supabase, type Team, type SessionWithTeam } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { getISOWeek, weekRangeString, formatDateLong } from '../lib/date';
import { STATUS_CONFIG, EVENT_TYPE_CONFIG, EVENT_TYPES } from '../lib/constants';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Button } from '../components/ui/Button';

export function WorkspacePage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<SessionWithTeam[]>([]);
  const [pendingReviews, setPendingReviews] = useState<SessionWithTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: teamsData }, { data: sessionsData }, { data: reviewsData }] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('training_sessions').select('*, team:teams(id, name, color)').order('date', { ascending: true }),
        supabase.from('session_reviews').select('session_id'),
      ]);
      setTeams(teamsData || []);
      setSessions((sessionsData as unknown as SessionWithTeam[]) || []);

      const reviewedIds = new Set((reviewsData || []).map((r: { session_id: string }) => r.session_id));
      const pending = (sessionsData as unknown as SessionWithTeam[] || [])
        .filter((s) => s.status === 'completed' && !reviewedIds.has(s.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPendingReviews(pending);

      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState />;

  const { week, year } = getISOWeek(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeekSessions = sessions
    .filter((s) => s.week_number === week && s.week_year === year)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextEvent = sessions
    .filter((s) => new Date(s.date) >= today && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const completedCount = sessions.filter((s) => s.status === 'completed').length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{greeting}, Coach</h1>
        <p className="text-sm text-ink-500 mt-1">Here's your coaching overview for this week.</p>
      </div>

      {/* Welcome state for empty app */}
      {teams.length === 0 && sessions.length === 0 ? (
        <EmptyState
          icon={<AlertCircle size={40} />}
          title="Welcome to KanonOS"
          description="Start by creating your first team, then plan your training week."
          action={<Button onClick={() => navigate({ name: 'teams' })}>Create a team</Button>}
        />
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Left column — Next event + Weekly summary */}
          <div className="col-span-2 space-y-6">
            {/* Next event */}
            <div>
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Next Event</h2>
              {nextEvent ? (
                <NextEventCard event={nextEvent} onClick={() => navigate({ name: 'session', sessionId: nextEvent.id })} />
              ) : (
                <div className="bg-white rounded-xl border border-ink-100 p-6 text-center">
                  <p className="text-sm text-ink-400 mb-4">No upcoming events scheduled.</p>
                  <Button size="sm" onClick={() => navigate({ name: 'planning', year, week })}>
                    Plan this week
                  </Button>
                </div>
              )}
            </div>

            {/* Weekly summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-ink-900">This Week</h2>
                <button
                  onClick={() => navigate({ name: 'planning', year, week })}
                  className="text-xs text-ink-500 hover:text-ink-900 flex items-center gap-1 transition-colors"
                >
                  Open week plan <ArrowRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <StatCard label="Total" value={thisWeekSessions.length} icon={<CalendarDays size={16} />} />
                {EVENT_TYPES.map((t) => {
                  const cfg = EVENT_TYPE_CONFIG[t];
                  const Icon = cfg.icon;
                  const count = thisWeekSessions.filter((s) => s.event_type === t).length;
                  return <StatCard key={t} label={cfg.label} value={count} icon={<Icon size={16} />} />;
                })}
              </div>
              {thisWeekSessions.length > 0 && (
                <div className="space-y-2 mt-3">
                  {thisWeekSessions.map((session) => (
                    <SessionRow key={session.id} session={session} onClick={() => navigate({ name: 'session', sessionId: session.id })} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — Quick actions + Pending review */}
          <div className="space-y-6">
            {/* Quick actions */}
            <div>
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <QuickAction
                  title="Plan this week"
                  description={weekRangeString(year, week)}
                  icon={<CalendarDays size={18} />}
                  onClick={() => navigate({ name: 'planning', year, week })}
                />
                <QuickAction
                  title="Teams"
                  description={`${teams.length} team${teams.length !== 1 ? 's' : ''}`}
                  icon={<Users size={18} />}
                  onClick={() => navigate({ name: 'teams' })}
                />
                <QuickAction
                  title="Athletes"
                  description="Manage your roster"
                  icon={<Users size={18} />}
                  onClick={() => navigate({ name: 'athletes' })}
                />
                <QuickAction
                  title="History"
                  description={`${completedCount} completed sessions`}
                  icon={<History size={18} />}
                  onClick={() => navigate({ name: 'history' })}
                />
              </div>
            </div>

            {/* Pending review */}
            <div>
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Pending Close</h2>
              {pendingReviews.length === 0 ? (
                <div className="bg-white rounded-xl border border-ink-100 p-4 text-center">
                  <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-ink-400">All caught up — no pending reviews.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReviews.slice(0, 4).map((session) => (
                    <button
                      key={session.id}
                      onClick={() => navigate({ name: 'review', sessionId: session.id })}
                      className="w-full bg-white rounded-xl border border-ink-100 p-3 text-left hover:border-ink-300 hover:shadow-card-hover transition-all group flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={14} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-900 truncate">{session.title}</p>
                        <p className="text-xs text-ink-400 truncate">{session.team?.name} · {formatDateLong(session.date)}</p>
                      </div>
                      <ArrowRight size={14} className="text-ink-300 group-hover:text-ink-600 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-ink-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-ink-400 font-medium">{label}</span>
        <span className="text-ink-300">{icon}</span>
      </div>
      <span className="text-2xl font-bold text-ink-900">{value}</span>
    </div>
  );
}

function QuickAction({ title, description, icon, onClick }: { title: string; description: string; icon: React.ReactNode; onClick: () => void }) {
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

function NextEventCard({ event, onClick }: { event: SessionWithTeam; onClick: () => void }) {
  const evType = EVENT_TYPE_CONFIG[event.event_type];
  const status = STATUS_CONFIG[event.status];
  const TypeIcon = evType.icon;
  const eventDate = new Date(event.date);
  const isToday = eventDate.toDateString() === new Date().toDateString();
  const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

  const relativeDay = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : eventDate.toLocaleDateString('en-GB', { weekday: 'long' });

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-ink-100 p-5 text-left hover:border-ink-300 hover:shadow-card-hover transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${evType.bg}`}>
          <TypeIcon size={22} className={evType.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${evType.bg} ${evType.color}`}>
              {evType.label}
            </span>
            <span className="text-xs text-ink-400">{relativeDay} · {event.time}</span>
          </div>
          <h3 className="text-base font-semibold text-ink-900 truncate">{event.title}</h3>
          <p className="text-xs text-ink-400 mt-0.5">
            {event.team?.name}
            {event.event_type === 'match' && event.opponent ? ` · vs ${event.opponent}` : ''}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} flex-shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>
    </button>
  );
}

function SessionRow({ session, onClick }: { session: SessionWithTeam; onClick: () => void }) {
  const status = STATUS_CONFIG[session.status];
  const evType = EVENT_TYPE_CONFIG[session.event_type];
  const TypeIcon = evType.icon;
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
      <div className={`w-1 h-10 rounded-full ${evType.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TypeIcon size={12} className={`${evType.color} flex-shrink-0`} />
          <h3 className="text-sm font-semibold text-ink-900 truncate">{session.title}</h3>
        </div>
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
