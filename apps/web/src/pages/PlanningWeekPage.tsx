import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ArrowLeft, MoreHorizontal, Trash2, CalendarDays } from 'lucide-react';
import { supabase, type Team, type SessionWithTeam, type EventType } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { getWeekDates, weekRangeString, DAYS_OF_WEEK, DAYS_OF_WEEK_FULL, formatDate, formatDateInput, addWeeks, getISOWeek } from '../lib/date';
import { EVENT_TYPE_CONFIG, EVENT_TYPES } from '../lib/constants';
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
  const [addType, setAddType] = useState<EventType>('training');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const weekDates = getWeekDates(year, week);
  const prevWeek = addWeeks(year, week, -1);
  const nextWeek = addWeeks(year, week, 1);
  const currentWeek = getISOWeek(new Date());
  const isCurrentWeek = year === currentWeek.year && week === currentWeek.week;

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

  const handleAdd = (dayIndex: number, type: EventType) => {
    setAddDay(dayIndex);
    setAddType(type);
    setShowAddModal(true);
  };

  const handleDelete = async (sessionId: string) => {
    await supabase.from('training_sessions').delete().eq('id', sessionId);
    setMenuOpen(null);
    loadSessions();
  };

  if (loading) return <LoadingState />;

  const typeCounts = EVENT_TYPES.reduce((acc, t) => {
    acc[t] = sessions.filter((s) => s.event_type === t).length;
    return acc;
  }, {} as Record<EventType, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <IconButton onClick={() => navigate({ name: 'workspace' })} aria-label="Back to workspace">
            <ArrowLeft size={18} />
          </IconButton>
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Week {week} · {year}</h1>
            <p className="text-sm text-ink-500 mt-1">
              {weekRangeString(year, week)}
              {isCurrentWeek && <span className="ml-2 text-accent-600 font-medium">· This week</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate({ name: 'planning', year: prevWeek.year, week: prevWeek.week })}>
            <ChevronLeft size={14} /> Prev
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate({ name: 'planning', year: nextWeek.year, week: nextWeek.week })}>
            Next <ChevronLeft size={14} className="rotate-180" />
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {EVENT_TYPES.map((t) => {
          const cfg = EVENT_TYPE_CONFIG[t];
          const Icon = cfg.icon;
          if (typeCounts[t] === 0) return null;
          return (
            <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-ink-100">
              <Icon size={14} className={cfg.color} />
              <span className="text-xs font-medium text-ink-700">{typeCounts[t]} {cfg.label.toLowerCase()}</span>
            </div>
          );
        })}
      </div>

      {/* Week grid — Monday to Sunday */}
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
                  const evType = EVENT_TYPE_CONFIG[s.event_type];
                  const Icon = evType.icon;
                  return (
                    <div key={s.id} className="relative group">
                      <button
                        onClick={() => navigate({ name: 'session', sessionId: s.id })}
                        className="w-full text-left bg-white rounded-lg border border-ink-100 p-3 hover:border-ink-300 hover:shadow-card-hover transition-all"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-0.5 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: evType.dot.replace('bg-', '#').replace('-500', '') || '#D4D4D8' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon size={10} className={`${evType.color} flex-shrink-0`} />
                              <span className="text-[10px] text-ink-400">{s.time}</span>
                              <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium ${evType.bg} ${evType.color}`}>
                                {evType.label}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-ink-900 truncate">{s.title}</p>
                            <p className="text-[10px] text-ink-400 truncate mt-0.5">
                              {s.event_type === 'match' && s.opponent ? `vs ${s.opponent}` : s.team?.name}
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id); }}
                        className="absolute top-3 right-3 w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-400 opacity-0 group-hover:opacity-100 transition-opacity"
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

                {EVENT_TYPES.map((t) => {
                  const cfg = EVENT_TYPE_CONFIG[t];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => handleAdd(i, t)}
                      className="w-full py-2 rounded-lg border border-dashed border-ink-200 text-ink-400 hover:border-ink-300 hover:text-ink-600 transition-colors flex items-center justify-center gap-1 text-xs"
                    >
                      <Icon size={12} /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <EmptyState
          icon={<CalendarDays size={40} />}
          title="Empty week"
          description="Add a session to any day to start planning your week."
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
          eventType={addType}
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
  eventType,
  onSaved,
}: {
  onClose: () => void;
  date: Date;
  dayName: string;
  week: number;
  year: number;
  teams: Team[];
  eventType: EventType;
  onSaved: () => void;
}) {
  const [type, setType] = useState<EventType>(eventType);
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [time, setTime] = useState('18:30');
  const [location, setLocation] = useState('');
  const [objectives, setObjectives] = useState('');
  const [opponent, setOpponent] = useState('');
  const [competition, setCompetition] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);

  const cfg = EVENT_TYPE_CONFIG[type];

  const handleSave = async () => {
    if (!title.trim() || !teamId) return;
    setSaving(true);
    await supabase.from('training_sessions').insert({
      title: title.trim(),
      team_id: teamId,
      date: formatDateInput(date),
      time,
      location: location.trim() || null,
      objectives: type === 'training' || type === 'gym' || type === 'video' ? (objectives.trim() || null) : null,
      status: 'planned',
      event_type: type,
      opponent: type === 'match' ? (opponent.trim() || null) : null,
      competition: type === 'match' ? (competition.trim() || null) : null,
      training_type: type === 'training' ? (trainingType.trim() || null) : null,
      duration_minutes: (type === 'training' || type === 'gym' || type === 'video') && duration ? parseInt(duration) : null,
      notes: type === 'gym' ? (notes.trim() || null) : null,
      topic: type === 'video' ? (topic.trim() || null) : null,
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
      title={`New ${cfg.label} — ${dayName}, ${formatDate(date)}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim() || !teamId || saving}>
            {saving ? 'Saving…' : `Create ${cfg.label.toLowerCase()}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Event type selector */}
        <div className="grid grid-cols-4 gap-2">
          {EVENT_TYPES.map((t) => {
            const c = EVENT_TYPE_CONFIG[t];
            const Icon = c.icon;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                  type === t
                    ? `border-ink-300 ${c.bg} ${c.color}`
                    : 'border-ink-200 text-ink-500 hover:border-ink-300'
                }`}
              >
                <Icon size={16} />
                {c.label}
              </button>
            );
          })}
        </div>

        <div>
          <Label>Session title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Tática Ofensiva"
            autoFocus
          />
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

        {/* Type-specific fields */}
        {(type === 'training' || type === 'gym' || type === 'video') && (
          <div>
            <Label>Objective</Label>
            <Textarea rows={2} value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder="What should this session achieve?" />
          </div>
        )}

        {type === 'training' && (
          <>
            <div>
              <Label>Training Type</Label>
              <Input value={trainingType} onChange={(e) => setTrainingType(e.target.value)} placeholder="e.g. Tactical, Physical, Technical" />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 90" />
            </div>
          </>
        )}

        {type === 'match' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Opponent</Label>
                <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. FC Rivals" />
              </div>
              <div>
                <Label>Competition</Label>
                <Input value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="e.g. League, Cup" />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Campo Principal" />
            </div>
          </>
        )}

        {type === 'gym' && (
          <>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 60" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Strength focus, exercises, loads…" />
            </div>
          </>
        )}

        {type === 'video' && (
          <>
            <div>
              <Label>Topic</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Opponent analysis, Set pieces" />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 45" />
            </div>
          </>
        )}

        {/* Location for non-match types */}
        {type !== 'match' && (
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Campo Principal" />
          </div>
        )}

        {teams.length === 0 && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2.5">
            You need to create a team first before planning sessions.
          </p>
        )}
      </div>
    </Modal>
  );
}
