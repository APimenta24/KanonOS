import { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, Star, ArrowRight, Filter, History as HistoryIcon } from 'lucide-react';
import { supabase, type SessionWithTeam, type SessionReview, type Team } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { STATUS_CONFIG } from '../lib/constants';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Select } from '../components/ui/Form';

export function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionWithTeam[]>([]);
  const [reviews, setReviews] = useState<Map<string, SessionReview>>(new Map());
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadAll = useCallback(async () => {
    const [{ data: sessionsData }, { data: reviewsData }, { data: teamsData }] = await Promise.all([
      supabase.from('training_sessions').select('*, team:teams(id, name, color)').order('date', { ascending: false }),
      supabase.from('session_reviews').select('*'),
      supabase.from('teams').select('*'),
    ]);

    setSessions((sessionsData as unknown as SessionWithTeam[]) || []);
    const reviewMap = new Map<string, SessionReview>();
    (reviewsData as SessionReview[] || []).forEach((r) => reviewMap.set(r.session_id, r));
    setReviews(reviewMap);
    setTeams(teamsData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = sessions.filter((s) => {
    if (filterTeam !== 'all' && s.team_id !== filterTeam) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const reviewedCount = reviews.size;
  const avgQuality = reviews.size > 0
    ? (Array.from(reviews.values()).reduce((sum, r) => sum + r.quality_rating, 0) / reviews.size).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">History</h1>
        <p className="text-sm text-ink-500 mt-1">All your training sessions, chronologically.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-ink-100 p-4">
          <p className="text-xs text-ink-400 mb-1">Total sessions</p>
          <p className="text-2xl font-bold text-ink-900">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-100 p-4">
          <p className="text-xs text-ink-400 mb-1">Reviewed</p>
          <p className="text-2xl font-bold text-ink-900">{reviewedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-100 p-4">
          <p className="text-xs text-ink-400 mb-1">Avg. quality</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-ink-900">{avgQuality}</p>
            {avgQuality !== '—' && <span className="text-xs text-ink-400">/ 5</span>}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-ink-400" />
        <Select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="w-auto">
          <option value="all">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Session list */}
      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={40} />}
          title="No sessions found"
          description={sessions.length === 0 ? "Plan your first session to see it here." : "Try adjusting your filters."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => {
            const status = STATUS_CONFIG[session.status];
            const review = reviews.get(session.id);
            return (
              <button
                key={session.id}
                onClick={() => navigate({ name: 'session', sessionId: session.id })}
                className="w-full bg-white rounded-xl border border-ink-100 p-4 text-left hover:border-ink-300 hover:shadow-card-hover transition-all group flex items-center gap-4"
              >
                <div className="flex flex-col items-center justify-center w-12 flex-shrink-0">
                  <span className="text-xs text-ink-400 capitalize">
                    {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-ink-900">{new Date(session.date).getDate()}</span>
                  <span className="text-[10px] text-ink-400 uppercase">
                    {new Date(session.date).toLocaleDateString('en-GB', { month: 'short' })}
                  </span>
                </div>
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: session.team?.color || '#D4D4D8' }} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-ink-900 truncate">{session.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-ink-400">
                    <span>{session.team?.name}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {session.time}</span>
                    {session.location && <span className="flex items-center gap-1"><MapPin size={11} /> {session.location}</span>}
                  </div>
                </div>
                {review && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-full">
                    <Star size={12} className="text-amber-500" fill="currentColor" />
                    <span className="text-xs font-medium text-amber-700">{review.quality_rating}</span>
                  </div>
                )}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </div>
                <ArrowRight size={14} className="text-ink-300 group-hover:text-ink-600 transition-colors" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
