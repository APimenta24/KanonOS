import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, ArrowRight } from 'lucide-react';
import { supabase, type Team, type SessionWithTeam } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { getISOWeek, getWeekDates, weekRangeString, DAYS_OF_WEEK, formatDate, addWeeks, formatDateInput } from '../lib/date';
import { STATUS_CONFIG } from '../lib/constants';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea, Select, Label } from '../components/ui/Form';

export function PlanningPage() {
  const navigate = useNavigate();
  const { week: currentWeek, year: currentYear } = getISOWeek(new Date());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [weeks, setWeeks] = useState<{ year: number; week: number; sessionCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('training_sessions')
        .select('week_year, week_number');
      
      const weekMap = new Map<string, number>();
      (data || []).forEach((s: { week_year: number; week_number: number }) => {
        const key = `${s.week_year}-${s.week_number}`;
        weekMap.set(key, (weekMap.get(key) || 0) + 1);
      });

      const weekList: { year: number; week: number; sessionCount: number }[] = [];
      for (let w = currentWeek - 4; w <= currentWeek + 8; w++) {
        let y = currentYear;
        let adjustedW = w;
        if (w < 1) { y--; adjustedW = 52 + w; }
        if (w > 52) { y++; adjustedW = w - 52; }
        const key = `${y}-${adjustedW}`;
        weekList.push({ year: y, week: adjustedW, sessionCount: weekMap.get(key) || 0 });
      }
      setWeeks(weekList);
      setLoading(false);
    })();
  }, [currentWeek, currentYear]);

  const goPrev = () => {
    const prev = addWeeks(selectedYear, selectedWeek, -1);
    setSelectedYear(prev.year);
    setSelectedWeek(prev.week);
  };

  const goNext = () => {
    const next = addWeeks(selectedYear, selectedWeek, 1);
    setSelectedYear(next.year);
    setSelectedWeek(next.week);
  };

  const isCurrentWeek = selectedYear === currentYear && selectedWeek === currentWeek;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Weekly Planning</h1>
        <p className="text-sm text-ink-500 mt-1">Select a week to plan your training sessions.</p>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Week selector */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-ink-100 p-4">
            <div className="flex items-center gap-3">
              <IconButton onClick={goPrev} aria-label="Previous week">
                <ChevronLeft size={18} />
              </IconButton>
              <div className="text-center min-w-[160px]">
                <div className="text-sm font-semibold text-ink-900">
                  Week {selectedWeek} · {selectedYear}
                </div>
                <div className="text-xs text-ink-400">
                  {weekRangeString(selectedYear, selectedWeek)}
                </div>
              </div>
              <IconButton onClick={goNext} aria-label="Next week">
                <ChevronRight size={18} />
              </IconButton>
            </div>
            <div className="flex items-center gap-2">
              {isCurrentWeek && (
                <span className="text-xs text-accent-600 font-medium px-2 py-1 bg-accent-50 rounded-full">Current</span>
              )}
              <Button size="sm" onClick={() => navigate({ name: 'planning-week', year: selectedYear, week: selectedWeek })}>
                Open week <ArrowRight size={14} />
              </Button>
            </div>
          </div>

          {/* Week grid overview */}
          <div className="grid grid-cols-7 gap-2">
            {weeks.map((w) => {
              const isSelected = w.year === selectedYear && w.week === selectedWeek;
              const isCurrent = w.year === currentYear && w.week === currentWeek;
              return (
                <button
                  key={`${w.year}-${w.week}`}
                  onClick={() => { setSelectedYear(w.year); setSelectedWeek(w.week); }}
                  className={`relative p-3 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-ink-900 bg-ink-900 text-white'
                      : 'border-ink-100 bg-white hover:border-ink-300'
                  }`}
                >
                  <div className={`text-xs font-medium ${isSelected ? 'text-ink-300' : 'text-ink-400'}`}>
                    W{w.week}
                  </div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-ink-400' : 'text-ink-500'}`}>
                    {w.sessionCount > 0 ? `${w.sessionCount} sessions` : '—'}
                  </div>
                  {isCurrent && !isSelected && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Day-by-day preview */}
          <WeekPreview year={selectedYear} week={selectedWeek} />
        </>
      )}
    </div>
  );
}

function WeekPreview({ year, week }: { year: number; week: number }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDay, setAddDay] = useState<number | null>(null);

  const weekDates = getWeekDates(year, week);

  useEffect(() => {
    (async () => {
      const [{ data: sessionsData }, { data: teamsData }] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('*, team:teams(id, name, color)')
          .eq('week_year', year)
          .eq('week_number', week)
          .order('time', { ascending: true }),
        supabase.from('teams').select('*'),
      ]);
      setSessions((sessionsData as unknown as SessionWithTeam[]) || []);
      setTeams(teamsData || []);
      setLoading(false);
    })();
  }, [year, week]);

  const handleAdd = (dayIndex: number) => {
    setAddDay(dayIndex);
    setShowAddModal(true);
  };

  if (loading) return <LoadingState />;

  return (
    <>
      <div className="grid grid-cols-7 gap-3">
        {weekDates.map((date, i) => {
          const daySessions = sessions.filter((s) => {
            const sDate = new Date(s.date);
            return sDate.toDateString() === date.toDateString();
          });
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div
              key={i}
              className={`bg-white rounded-xl border p-3 min-h-[140px] flex flex-col ${
                isToday ? 'border-accent-300 bg-accent-50/30' : 'border-ink-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-medium text-ink-400">{DAYS_OF_WEEK[i]}</span>
                  <span className={`ml-1.5 text-sm font-bold ${isToday ? 'text-accent-600' : 'text-ink-900'}`}>
                    {date.getDate()}
                  </span>
                </div>
                <button
                  onClick={() => handleAdd(i)}
                  className="w-5 h-5 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-400 hover:text-ink-700 transition-colors"
                >
                  <Plus size={13} />
                </button>
              </div>

              <div className="flex-1 space-y-1.5">
                {daySessions.map((s) => {
                  const status = STATUS_CONFIG[s.status];
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate({ name: 'session', sessionId: s.id })}
                      className="w-full text-left p-2 rounded-lg hover:bg-ink-50 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: s.team?.color || '#D4D4D8' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-ink-900 truncate">{s.title}</p>
                          <p className="text-[10px] text-ink-400">{s.time}</p>
                          <div className={`inline-flex items-center gap-1 mt-0.5 ${status.color}`}>
                            <span className={`w-1 h-1 rounded-full ${status.dot}`} />
                          </div>
                        </div>
                      </div>
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
          icon={<CalendarDays size={36} />}
          title="No sessions planned this week"
          description="Click the + on any day to add a training session."
        />
      )}

      {showAddModal && addDay !== null && (
        <AddSessionModal
          onClose={() => setShowAddModal(false)}
          date={weekDates[addDay]}
          week={week}
          year={year}
          teams={teams}
          onSaved={() => {
            setShowAddModal(false);
            setLoading(true);
            // reload
            (async () => {
              const { data } = await supabase
                .from('training_sessions')
                .select('*, team:teams(id, name, color)')
                .eq('week_year', year)
                .eq('week_number', week)
                .order('time', { ascending: true });
              setSessions((data as unknown as SessionWithTeam[]) || []);
              setLoading(false);
            })();
          }}
        />
      )}
    </>
  );
}

function AddSessionModal({
  onClose,
  date,
  week,
  year,
  teams,
  onSaved,
}: {
  onClose: () => void;
  date: Date;
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
      title={`New Session — ${formatDate(date)}`}
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
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => (
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
      </div>
    </Modal>
  );
}
