import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, CalendarDays, MapPin, Clock, UserPlus, Search, Users } from 'lucide-react';
import { supabase, type Team, type Athlete, type SessionWithTeam } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { formatDateInput, getISOWeek } from '../lib/date';
import { STATUS_CONFIG } from '../lib/constants';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea, Label } from '../components/ui/Form';

export function TeamDetailPage({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [sessions, setSessions] = useState<SessionWithTeam[]>([]);
  const [roster, setRoster] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);

  const loadTeam = useCallback(async () => {
    const [{ data: teamData }, { data: sessionsData }, { data: rosterData }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).maybeSingle(),
      supabase.from('training_sessions').select('*, team:teams(id, name, color)').eq('team_id', teamId).order('date', { ascending: false }),
      supabase.from('team_athletes').select('athlete:athletes(*)').eq('team_id', teamId).order('athlete(name)', { ascending: true }),
    ]);
    setTeam(teamData as Team | null);
    setSessions((sessionsData as unknown as SessionWithTeam[]) || []);
    setRoster((rosterData as unknown as { athlete: Athlete }[])?.map((r) => r.athlete) || []);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  if (loading) return <LoadingState />;

  if (!team) {
    return <EmptyState title="Team not found" description="This team may have been deleted." />;
  }

  const completed = sessions.filter((s) => s.status === 'completed').length;
  const planned = sessions.filter((s) => s.status === 'planned').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <IconButton onClick={() => navigate({ name: 'teams' })} aria-label="Back to teams">
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: team.color }}>
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink-900">{team.name}</h1>
              <p className="text-sm text-ink-400">
                {team.age_category || '—'}
                {team.season ? ` · ${team.season}` : ''}
                {' · '}{roster.length} athletes
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowRosterModal(true)}>
            <UserPlus size={14} /> Manage roster
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> New session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-ink-100 p-4">
          <p className="text-xs text-ink-400 mb-1">Total sessions</p>
          <p className="text-2xl font-bold text-ink-900">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-100 p-4">
          <p className="text-xs text-ink-400 mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{completed}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-100 p-4">
          <p className="text-xs text-ink-400 mb-1">Planned</p>
          <p className="text-2xl font-bold text-ink-900">{planned}</p>
        </div>
      </div>

      {/* Roster */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-900">Roster</h2>
          <button onClick={() => setShowRosterModal(true)} className="text-xs text-ink-500 hover:text-ink-900 transition-colors">
            Manage
          </button>
        </div>
        {roster.length === 0 ? (
          <EmptyState
            icon={<Users size={36} />}
            title="No athletes in this team"
            description="Add athletes to build your team roster."
            action={<Button size="sm" variant="secondary" onClick={() => setShowRosterModal(true)}><UserPlus size={14} /> Add athletes</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {roster.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-ink-100 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center text-ink-500 font-semibold text-xs flex-shrink-0">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-ink-900 truncate">{a.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    {a.jersey_number !== null && <span>#{a.jersey_number}</span>}
                    {a.position && <span>{a.position}</span>}
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${a.status === 'active' ? 'bg-emerald-500' : 'bg-ink-300'}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div>
        <h2 className="text-sm font-semibold text-ink-900 mb-4">Sessions</h2>
        {sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={36} />}
            title="No sessions yet"
            description="Plan your first training session for this team."
            action={<Button size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> New session</Button>}
          />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const status = STATUS_CONFIG[s.status];
              return (
                <button
                  key={s.id}
                  onClick={() => navigate({ name: 'session', sessionId: s.id })}
                  className="w-full bg-white rounded-xl border border-ink-100 p-4 text-left hover:border-ink-300 hover:shadow-card-hover transition-all group flex items-center gap-4"
                >
                  <div className="flex flex-col items-center justify-center w-12 flex-shrink-0">
                    <span className="text-xs text-ink-400 capitalize">
                      {new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-ink-900">{new Date(s.date).getDate()}</span>
                  </div>
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: team.color }} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-ink-900 truncate">{s.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-ink-400">
                      <span className="flex items-center gap-1"><Clock size={11} /> {s.time}</span>
                      {s.location && <span className="flex items-center gap-1"><MapPin size={11} /> {s.location}</span>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddSessionModal
          onClose={() => setShowAddModal(false)}
          teamId={teamId}
          onSaved={() => { setShowAddModal(false); loadTeam(); }}
        />
      )}

      {showRosterModal && (
        <RosterModal
          teamId={teamId}
          currentRoster={roster}
          onClose={() => setShowRosterModal(false)}
          onSaved={() => { setShowRosterModal(false); loadTeam(); }}
        />
      )}
    </div>
  );
}

function RosterModal({
  teamId,
  currentRoster,
  onClose,
  onSaved,
}: {
  teamId: string;
  currentRoster: Athlete[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [teamAthleteIds, setTeamAthleteIds] = useState<Set<string>>(new Set(currentRoster.map((a) => a.id)));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('athletes').select('*').order('name', { ascending: true });
      setAllAthletes((data as Athlete[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = allAthletes.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const toggleAthlete = (id: string) => {
    setTeamAthleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const currentIds = new Set(currentRoster.map((a) => a.id));
    const toAdd = Array.from(teamAthleteIds).filter((id) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter((id) => !teamAthleteIds.has(id));

    if (toAdd.length > 0) {
      await supabase.from('team_athletes').insert(toAdd.map((athlete_id) => ({ team_id: teamId, athlete_id })));
    }
    if (toRemove.length > 0) {
      await supabase.from('team_athletes').delete().eq('team_id', teamId).in('athlete_id', toRemove);
    }

    await supabase.from('teams').update({ athlete_count: teamAthleteIds.size }).eq('id', teamId);

    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Manage Roster"
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save roster'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-400">{teamAthleteIds.size} athletes selected</span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search athletes…"
            className="pl-9"
          />
        </div>
        <div className="max-h-72 overflow-y-auto scrollbar-thin border border-ink-100 rounded-lg">
          {loading ? (
            <div className="p-4 text-center text-xs text-ink-400">Loading athletes…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-ink-400">No matches.</div>
          ) : (
            filtered.map((a) => {
              const selected = teamAthleteIds.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleAthlete(a.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    selected ? 'bg-accent-50' : 'hover:bg-ink-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    selected ? 'bg-ink-900 border-ink-900' : 'border-ink-300'
                  }`}>
                    {selected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-ink-700 flex-1">{a.name}</span>
                  {a.jersey_number !== null && <span className="text-xs text-ink-400">#{a.jersey_number}</span>}
                  {a.position && <span className="text-xs text-ink-400">{a.position}</span>}
                  {a.status === 'inactive' && <span className="text-xs text-ink-400">Inactive</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

function AddSessionModal({
  onClose,
  teamId,
  onSaved,
}: {
  onClose: () => void;
  teamId: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [time, setTime] = useState('18:30');
  const [location, setLocation] = useState('');
  const [objectives, setObjectives] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const sessionDate = new Date(date);
    const isoWeek = getISOWeek(sessionDate);
    await supabase.from('training_sessions').insert({
      title: title.trim(),
      team_id: teamId,
      date,
      time,
      location: location.trim() || null,
      objectives: objectives.trim() || null,
      status: 'planned',
      week_number: isoWeek.week,
      week_year: isoWeek.year,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Training Session"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? 'Saving…' : 'Create session'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Session title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tática Ofensiva" autoFocus />
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
