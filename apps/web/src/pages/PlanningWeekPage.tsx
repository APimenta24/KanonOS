import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Plus, ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase, type Team, type SessionWithTeam } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { getWeekDates, weekRangeString, DAYS_OF_WEEK, DAYS_OF_WEEK_FULL, formatDate, formatDateInput, addWeeks } from '../lib/date';
import { STATUS_CONFIG } from '../lib/constants';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea, Select, Label } from '../components/ui/Form';

export function PlanningWeekPage({ year, week }: { year: number; week: number }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDay, setAddDay] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const weekDates = getWeekDates(year, week);
  const prevWeek = addWeeks(year, week, -1);
  const nextWeek = addWeeks(year, week, 1);

  const loadSessions = useCallback(async () => {
    const [{ data: sessionsData }, { data: teamsData }] = await Promise.all([
      supabase
        .from('training_sessions')
        .select('*, team:teams(id, name, color)')
        .eq('week_year', year)
        .eq('week_number', week)
        .order('date', { ascending: true })
        .order('time', { ascending: true }),
      supabase.from('teams').select('*'),
    ]);
    setSessions((sessionsData as unknown as SessionWithTeam[]) || []);
    setTeams(teamsData || []);
    setLoading(false);
  }, [year, week]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleAdd = (dayIndex: number) => {
    setAddDay(dayIndex);
    setShowAddModal(true);
  };

  const handleDelete = async (sessionId: string) => {
    await supabase.from('training_sessions').delete().eq('id', sessionId);
    setMenuOpen(null);
    loadSessions();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <IconButton onClick={() => navigate({ name: 'planning' })} aria-label="Back to planning">
            <ArrowLeft size={18} />
          </IconButton>
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Week {week} · {year}</h1>
            <p className="text-sm text-ink-400">{weekRangeString(year, week)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate({ name: 'planning-week', year: prevWeek.year, week: prevWeek.week })}>
            <ChevronLeft size={14} /> Prev
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate({ name: 'planning-week', year: nextWeek.year, week: nextWeek.week })}>
            Next <ChevronLeft size={14} className="rotate-180" />
          </Button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3">
        {weekDates.map((date, i) => {
          const daySessions = sessions.filter((s) => new Date(s.date).toDateString() === date.toDateString());
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div key={i} className="flex flex-col">
              <div className={`text-center pb-3 mb-2 border-b ${isToday ? 'border-accent-400' : 'border-ink-100'}`}>
                <div className={`text-xs font-medium ${isToday ? 'text-accent-600' : 'text-ink-400'}`}>
                  {DAYS_OF_WEEK[i]}
                </div>
                <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-accent-600' : 'text-ink-900'}`}>
                  {date.getDate()}
                </div>
              </div>

              <div className="space-y-2 flex-1">
                {daySessions.map((s) => {
                  const status = STATUS_CONFIG[s.status];
                  return (
                    <div key={s.id} className="relative group">
                      <button
                        onClick={() => navigate({ name: 'session', sessionId: s.id })}
                        className="w-full text-left bg-white rounded-lg border border-ink-100 p-3 hover:border-ink-300 hover:shadow-card-hover transition-all"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-0.5 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: s.team?.color || '#D4D4D8' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              <span className="text-[10px] text-ink-400">{s.time}</span>
                            </div>
                            <p className="text-xs font-semibold text-ink-900 truncate">{s.title}</p>
                            <p className="text-[10px] text-ink-400 truncate mt-0.5">{s.team?.name}</p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id); }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {menuOpen === s.id && (
                        <div className="absolute top-8 right-1.5 z-10 bg-white rounded-lg shadow-floating border border-ink-100 py-1 animate-scale-in">
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => handleAdd(i)}
                  className="w-full py-2 rounded-lg border border-dashed border-ink-200 text-ink-400 hover:border-ink-300 hover:text-ink-600 transition-colors flex items-center justify-center gap-1 text-xs"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <EmptyState
          title="Empty week"
          description="Add sessions to any day to start planning your training week."
        />
      )}

      {showAddModal && addDay !== null && (
        <AddSessionModal
          onClose={() => setShowAddModal(false)}
          date={weekDates[addDay]}
          dayName={DAYS_OF_WEEK_FULL[addDay]}
          week={week}
          year={year}
          teams={teams}
          onSaved={() => { setShowAddModal(false); loadSessions(); }}
        />
      )}
    </div>
  );
}

function AddSessionModal({
  onClose,
  date,
  dayName,
  week,
  year,
  teams,
  onSaved,
}: {
  onClose: () => void;
  date: Date;
  dayName: string;
  week: number;
  year: number;
  teams: Team[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [time, setTime] = useState('18:30');
  const [location, setLocation] = useState('');
  const [objectives, setObjectives] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !teamId) return;
    setSaving(true);
    await supabase.from('training_sessions').insert({
      title: title.trim(),
      team_id: teamId,
      date: formatDateInput(date),
      time,
      location: location.trim() || null,
      objectives: objectives.trim() || null,
      status: 'planned',
      week_number: week,
      week_year: year,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`New Session — ${dayName}, ${formatDate(date)}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim() || !teamId || saving}>
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
            <Label>Team</Label>
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={teams.length === 0}>
              {teams.length === 0 ? <option>No teams yet</option> : teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
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
        {teams.length === 0 && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2.5">
            You need to create a team first before planning sessions.
          </p>
        )}
      </div>
    </Modal>
  );
}
