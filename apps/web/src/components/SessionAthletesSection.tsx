import { useState, useEffect, useCallback } from 'react';
import { supabase, type Athlete, type SessionAthlete } from '../lib/supabase';
import { X, Users, UserPlus, Trash2, Star } from 'lucide-react';

type SessionAthleteRow = SessionAthlete & { athletes: Athlete };

export function SessionAthletesSection({ sessionId, teamId }: { sessionId: string; teamId: string }) {
  const [sessionAthletes, setSessionAthletes] = useState<SessionAthleteRow[]>([]);
  const [teamAthletes, setTeamAthletes] = useState<Athlete[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [athleteReviews, setAthleteReviews] = useState<Record<string, { rating: number; note: string }>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [saRes, taRes, attRes, revRes] = await Promise.all([
      supabase.from('session_athletes').select('*, athletes(*)').eq('session_id', sessionId).order('created_at'),
      supabase.from('team_athletes').select('athlete_id, athletes(*)').eq('team_id', teamId).order('created_at'),
      supabase.from('session_attendance').select('athlete_id, status').eq('session_id', sessionId),
      supabase.from('athlete_session_reviews').select('athlete_id, rating, note').eq('session_id', sessionId),
    ]);

    const saRows = (saRes.data as unknown as SessionAthleteRow[]) || [];
    setSessionAthletes(saRows);

    const taList = ((taRes.data as unknown as { athlete_id: string; athletes: Athlete }[]) || [])
      .map((r) => r.athletes)
      .filter(Boolean);
    setTeamAthletes(taList);

    setAttendance(Object.fromEntries(
      ((attRes.data as { athlete_id: string; status: string }[]) || []).map((r) => [r.athlete_id, r.status])
    ));
    setAthleteReviews(Object.fromEntries(
      ((revRes.data as { athlete_id: string; rating: number; note: string | null }[]) || []).map((r) => [r.athlete_id, { rating: r.rating, note: r.note || '' }])
    ));

    setLoading(false);
  }, [sessionId, teamId]);

  useEffect(() => { load(); }, [load]);

  const assignedIds = new Set(sessionAthletes.map((sa) => sa.athlete_id));
  const availableAthletes = teamAthletes.filter((a) => !assignedIds.has(a.id));

  const handleAddAthlete = async (athleteId: string, isGuest = false) => {
    const { error } = await supabase.from('session_athletes').insert({
      session_id: sessionId, athlete_id: athleteId, is_guest: isGuest,
    });
    if (error) { setError(error.message); return; }
    await load();
  };

  const handleRemoveAthlete = async (saId: string) => {
    const { error } = await supabase.from('session_athletes').delete().eq('id', saId);
    if (error) { setError(error.message); return; }
    await load();
  };

  if (loading) return <div className="text-sm text-ink-400">Loading athletes...</div>;

  return (
    <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-accent-600" />
          <h2 className="text-lg font-semibold text-ink-800">Expected Athletes</h2>
          <span className="text-xs text-ink-400">{sessionAthletes.length}</span>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50 transition-colors">
          <UserPlus className="h-4 w-4" /> Add Athlete
        </button>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {sessionAthletes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-200 p-6 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-ink-300" />
          <p className="text-sm text-ink-500">No athletes assigned to this session yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessionAthletes.map((sa) => {
            const att = attendance[sa.athlete_id];
            const rev = athleteReviews[sa.athlete_id];
            return (
              <div key={sa.id} className="group flex items-center gap-3 rounded-lg border border-ink-100 bg-ink-50/50 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">
                  {sa.athletes.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-800">{sa.athletes.name}</p>
                    {sa.is_guest && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Guest</span>}
                    {sa.athletes.position && <span className="text-xs text-ink-400">{sa.athletes.position}</span>}
                  </div>
                  {att && (
                    <p className="text-xs text-ink-500 mt-0.5">
                      Attendance: <span className="font-medium capitalize">{att}</span>
                      {rev && <> · <Star className="inline h-3 w-3 text-amber-400 fill-current" /> {rev.rating}/5</>}
                    </p>
                  )}
                </div>
                <button onClick={() => handleRemoveAthlete(sa.id)}
                  className="text-ink-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add athlete modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-800">Add Athlete</h3>
              <button onClick={() => setShowAdd(false)} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
            </div>
            {availableAthletes.length === 0 ? (
              <p className="text-sm text-ink-500 py-4 text-center">All team athletes are already assigned to this session.</p>
            ) : (
              <div className="space-y-2">
                {availableAthletes.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2 hover:border-accent-200 hover:bg-accent-50/30 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-800">{a.name}</p>
                      <p className="text-xs text-ink-500">{a.position || '—'}{a.jersey_number ? ` · #${a.jersey_number}` : ''}</p>
                    </div>
                    <button onClick={() => { handleAddAthlete(a.id); setShowAdd(false); }}
                      className="rounded-md bg-accent-600 px-3 py-1 text-xs font-medium text-white hover:bg-accent-700 transition-colors">
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
