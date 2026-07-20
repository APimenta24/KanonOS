import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type Season, type Macrocycle, type Mesocycle, type Microcycle, type WorkDay, type TrainingSession } from '../lib/supabase';
import { useWorkingContext } from '../lib/working-context';
import { Plus, ChevronRight, Calendar, X, Pencil, Trash2, Dumbbell, Trophy, Activity, Video, Clock } from 'lucide-react';

type TimeScale = 'season' | 'macrocycle' | 'mesocycle' | 'microcycle' | 'week' | 'day';

const SCALE_LABELS: Record<TimeScale, string> = {
  season: 'Season',
  macrocycle: 'Macrocycle',
  mesocycle: 'Mesocycle',
  microcycle: 'Microcycle',
  week: 'Week',
  day: 'Day',
};

const SCALES: TimeScale[] = ['season', 'macrocycle', 'mesocycle', 'microcycle', 'week', 'day'];

type EditTarget = {
  level: 'season' | 'macrocycle' | 'mesocycle' | 'microcycle' | 'workday' | 'session';
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  objective: string;
  notes: string;
};

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

export function PlanningPage() {
  const { team, seasons, setSeasonId, refresh } = useWorkingContext();
  const navigate = useNavigate();
  const [scale, setScale] = useState<TimeScale>('season');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [selectedMesoId, setSelectedMesoId] = useState<string | null>(null);
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [selectedMicroId, setSelectedMicroId] = useState<string | null>(null);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [showCreate, setShowCreate] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formObjective, setFormObjective] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    const current = seasons.find((s) => s.id === selectedSeasonId);
    if (!current && seasons.length > 0) {
      setSelectedSeasonId(seasons[0].id);
      setSeasonId(seasons[0].id);
    } else if (current) {
      setSeasonId(current.id);
    }
  }, [seasons, selectedSeasonId, setSeasonId]);

  const loadMacrocycles = useCallback(async (seasonId: string) => {
    const { data } = await supabase.from('macrocycles').select('*').eq('season_id', seasonId).order('order_index');
    setMacrocycles((data as Macrocycle[]) || []);
    setSelectedMacroId(null);
    setMesocycles([]);
    setSelectedMesoId(null);
    setMicrocycles([]);
    setSelectedMicroId(null);
    setWorkDays([]);
    setSessions([]);
  }, []);

  useEffect(() => {
    if (selectedSeasonId) loadMacrocycles(selectedSeasonId);
    else { setMacrocycles([]); setSelectedMacroId(null); }
  }, [selectedSeasonId, loadMacrocycles]);

  const loadMesocycles = useCallback(async (macroId: string) => {
    const { data } = await supabase.from('mesocycles').select('*').eq('macrocycle_id', macroId).order('order_index');
    setMesocycles((data as Mesocycle[]) || []);
    setSelectedMesoId(null);
    setMicrocycles([]);
    setSelectedMicroId(null);
    setWorkDays([]);
    setSessions([]);
  }, []);

  useEffect(() => {
    if (selectedMacroId) loadMesocycles(selectedMacroId);
    else { setMesocycles([]); setSelectedMesoId(null); }
  }, [selectedMacroId, loadMesocycles]);

  const loadMicrocycles = useCallback(async (mesoId: string) => {
    const { data } = await supabase.from('microcycles').select('*').eq('mesocycle_id', mesoId).order('order_index');
    setMicrocycles((data as Microcycle[]) || []);
    setSelectedMicroId(null);
    setWorkDays([]);
    setSessions([]);
  }, []);

  useEffect(() => {
    if (selectedMesoId) loadMicrocycles(selectedMesoId);
    else { setMicrocycles([]); setSelectedMicroId(null); }
  }, [selectedMesoId, loadMicrocycles]);

  const loadWorkDays = useCallback(async (microId: string | null) => {
    if (!team) { setWorkDays([]); return; }
    let query = supabase.from('work_days').select('*').eq('team_id', team.id).order('date', { ascending: true });
    if (microId) query = query.eq('microcycle_id', microId);
    const { data } = await query;
    setWorkDays((data as WorkDay[]) || []);
    setSessions([]);
  }, [team]);

  useEffect(() => {
    loadWorkDays(selectedMicroId);
  }, [selectedMicroId, loadWorkDays]);

  const loadAllSessions = useCallback(async () => {
    if (!team) { setSessions([]); return; }
    const { data } = await supabase.from('training_sessions').select('*').eq('team_id', team.id).order('date', { ascending: true }).order('time');
    setSessions((data as TrainingSession[]) || []);
  }, [team]);

  useEffect(() => {
    if (scale === 'week' || scale === 'day') loadAllSessions();
  }, [scale, loadAllSessions]);

  const resetForm = () => {
    setFormName(''); setFormStart(''); setFormEnd(''); setFormObjective(''); setFormNotes(''); setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setCreating(true); setError(null);
    try {
      if (showCreate === 'season') {
        const { data, error } = await supabase.from('seasons').insert({
          team_id: team.id, name: formName, start_date: formStart, end_date: formEnd,
          objective: formObjective || null, notes: formNotes || null, training_days: [],
        }).select().single();
        if (error) throw error;
        await refresh();
        setSelectedSeasonId((data as Season).id);
        setSeasonId((data as Season).id);
      } else if (showCreate === 'macrocycle' && selectedSeasonId) {
        const { data, error } = await supabase.from('macrocycles').insert({
          season_id: selectedSeasonId, name: formName, start_date: formStart, end_date: formEnd,
          objective: formObjective || null, order_index: macrocycles.length,
        }).select().single();
        if (error) throw error;
        setSelectedMacroId((data as Macrocycle).id);
        await loadMacrocycles(selectedSeasonId);
      } else if (showCreate === 'mesocycle' && selectedMacroId) {
        const { data, error } = await supabase.from('mesocycles').insert({
          macrocycle_id: selectedMacroId, name: formName, start_date: formStart, end_date: formEnd,
          objective: formObjective || null, order_index: mesocycles.length,
        }).select().single();
        if (error) throw error;
        setSelectedMesoId((data as Mesocycle).id);
        await loadMesocycles(selectedMacroId);
      } else if (showCreate === 'microcycle' && selectedMesoId) {
        const { data, error } = await supabase.from('microcycles').insert({
          mesocycle_id: selectedMesoId, name: formName, start_date: formStart, end_date: formEnd,
          objective: formObjective || null, order_index: microcycles.length,
        }).select().single();
        if (error) throw error;
        setSelectedMicroId((data as Microcycle).id);
        await loadMicrocycles(selectedMesoId);
      } else if (showCreate === 'workday' && team) {
        const insertData: Record<string, unknown> = {
          team_id: team.id, date: formStart, objective: formObjective || null,
          notes: formNotes || null, status: 'planned',
        };
        if (selectedMicroId) insertData.microcycle_id = selectedMicroId;
        const { data, error } = await supabase.from('work_days').insert(insertData).select().single();
        if (error) throw error;
        await loadWorkDays(selectedMicroId);
      }
    } catch (err) {
      setError((err as Error).message); setCreating(false); return;
    }
    setCreating(false); setShowCreate(null); resetForm();
  };

  const openEdit = (level: EditTarget['level'], item: { id: string; name?: string; start_date?: string; end_date?: string; date?: string; objective?: string | null; notes?: string | null }) => {
    setEditTarget({ level, id: item.id, name: item.name || '', start_date: item.start_date || item.date || '', end_date: item.end_date || '', objective: item.objective || '', notes: item.notes || '' });
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true); setError(null);
    const tableMap: Record<string, string> = { season: 'seasons', macrocycle: 'macrocycles', mesocycle: 'mesocycles', microcycle: 'microcycles', workday: 'work_days', session: 'training_sessions' };
    const updateData: Record<string, unknown> = { name: editTarget.name, objective: editTarget.objective || null };
    if (editTarget.level === 'workday') { updateData.date = editTarget.start_date; updateData.notes = editTarget.notes || null; }
    else { updateData.start_date = editTarget.start_date; updateData.end_date = editTarget.end_date || null; if (editTarget.level === 'season') updateData.notes = editTarget.notes || null; }
    const { error } = await supabase.from(tableMap[editTarget.level]).update(updateData).eq('id', editTarget.id);
    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false); setEditTarget(null);
    if (editTarget.level === 'season') await refresh();
    else if (editTarget.level === 'macrocycle' && selectedSeasonId) await loadMacrocycles(selectedSeasonId);
    else if (editTarget.level === 'mesocycle' && selectedMacroId) await loadMesocycles(selectedMacroId);
    else if (editTarget.level === 'microcycle' && selectedMesoId) await loadMicrocycles(selectedMesoId);
    else if (editTarget.level === 'workday') await loadWorkDays(selectedMicroId);
  };

  const handleDelete = async (level: string, id: string) => {
    const tableMap: Record<string, string> = { season: 'seasons', macrocycle: 'macrocycles', mesocycle: 'mesocycles', microcycle: 'microcycles', workday: 'work_days', session: 'training_sessions' };
    const { error } = await supabase.from(tableMap[level]).delete().eq('id', id);
    if (error) { setError(error.message); return; }
    if (level === 'season') { if (selectedSeasonId === id) { setSelectedSeasonId(null); setSeasonId(null); } await refresh(); }
    else if (level === 'macrocycle') { if (selectedMacroId === id) setSelectedMacroId(null); if (selectedSeasonId) await loadMacrocycles(selectedSeasonId); }
    else if (level === 'mesocycle') { if (selectedMesoId === id) setSelectedMesoId(null); if (selectedMacroId) await loadMesocycles(selectedMacroId); }
    else if (level === 'microcycle') { if (selectedMicroId === id) setSelectedMicroId(null); if (selectedMesoId) await loadMicrocycles(selectedMesoId); }
    else if (level === 'workday') await loadWorkDays(selectedMicroId);
  };

  // Auto-navigate scale: when selecting an item, drill into next scale
  const handleSeasonClick = (id: string) => { setSelectedSeasonId(id); setScale('macrocycle'); };
  const handleMacroClick = (id: string) => { setSelectedMacroId(id); setScale('mesocycle'); };
  const handleMesoClick = (id: string) => { setSelectedMesoId(id); setScale('microcycle'); };
  const handleMicroClick = (id: string) => { setSelectedMicroId(id); setScale('day'); };

  if (!team) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink-800 mb-2">Planning</h1>
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">Select a team to start planning your season.</p>
        </div>
      </div>
    );
  }

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
  const selectedMacro = macrocycles.find((m) => m.id === selectedMacroId);
  const selectedMeso = mesocycles.find((m) => m.id === selectedMesoId);
  const selectedMicro = microcycles.find((m) => m.id === selectedMicroId);

  // Breadcrumb from hierarchy
  const crumbs: { label: string; onClick: () => void }[] = [];
  if (selectedSeason) crumbs.push({ label: selectedSeason.name, onClick: () => { setSelectedMacroId(null); setSelectedMesoId(null); setSelectedMicroId(null); setScale('season'); } });
  if (selectedMacro) crumbs.push({ label: selectedMacro.name, onClick: () => { setSelectedMesoId(null); setSelectedMicroId(null); setScale('macrocycle'); } });
  if (selectedMeso) crumbs.push({ label: selectedMeso.name, onClick: () => { setSelectedMicroId(null); setScale('mesocycle'); } });
  if (selectedMicro) crumbs.push({ label: selectedMicro.name, onClick: () => { setScale('microcycle'); } });

  // ── Timeline rendering by scale ──────────────────────────────

  const renderTimeline = () => {
    switch (scale) {
      case 'season':
        return (
          <div className="space-y-3">
            {seasons.length === 0 && <EmptyState label="seasons" onCreate={() => { setShowCreate('season'); resetForm(); }} />}
            {seasons.map((s) => (
              <TimelineBlock key={s.id} title={s.name} subtitle={`${s.start_date} → ${s.end_date}`} objective={s.objective}
                onClick={() => handleSeasonClick(s.id)} onEdit={() => openEdit('season', s)} onDelete={() => handleDelete('season', s.id)} />
            ))}
          </div>
        );
      case 'macrocycle':
        return (
          <div className="space-y-3">
            <SectionHeader label="Macrocycles" onCreate={() => { setShowCreate('macrocycle'); resetForm(); }} />
            {macrocycles.length === 0 && <EmptyState label="macrocycles" onCreate={() => { setShowCreate('macrocycle'); resetForm(); }} />}
            {macrocycles.map((m) => (
              <TimelineBlock key={m.id} title={m.name} subtitle={`${m.start_date} → ${m.end_date}`} objective={m.objective}
                onClick={() => handleMacroClick(m.id)} onEdit={() => openEdit('macrocycle', m)} onDelete={() => handleDelete('macrocycle', m.id)} />
            ))}
          </div>
        );
      case 'mesocycle':
        return (
          <div className="space-y-3">
            <SectionHeader label="Mesocycles" onCreate={() => { setShowCreate('mesocycle'); resetForm(); }} />
            {mesocycles.length === 0 && <EmptyState label="mesocycles" onCreate={() => { setShowCreate('mesocycle'); resetForm(); }} />}
            {mesocycles.map((m) => (
              <TimelineBlock key={m.id} title={m.name} subtitle={`${m.start_date} → ${m.end_date}`} objective={m.objective}
                onClick={() => handleMesoClick(m.id)} onEdit={() => openEdit('mesocycle', m)} onDelete={() => handleDelete('mesocycle', m.id)} />
            ))}
          </div>
        );
      case 'microcycle':
        return (
          <div className="space-y-3">
            <SectionHeader label="Microcycles" onCreate={() => { setShowCreate('microcycle'); resetForm(); }} />
            {microcycles.length === 0 && <EmptyState label="microcycles" onCreate={() => { setShowCreate('microcycle'); resetForm(); }} />}
            {microcycles.map((m) => (
              <TimelineBlock key={m.id} title={m.name} subtitle={`${m.start_date} → ${m.end_date}`} objective={m.objective}
                onClick={() => handleMicroClick(m.id)} onEdit={() => openEdit('microcycle', m)} onDelete={() => handleDelete('microcycle', m.id)} />
            ))}
          </div>
        );
      case 'week': {
        // Group sessions by week
        const weekGroups: Record<string, TrainingSession[]> = {};
        sessions.forEach((s) => {
          const key = `${s.week_year}-W${s.week_number}`;
          if (!weekGroups[key]) weekGroups[key] = [];
          weekGroups[key].push(s);
        });
        const weekKeys = Object.keys(weekGroups).sort();
        return (
          <div className="space-y-4">
            {weekKeys.length === 0 && <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">No sessions to display.</div>}
            {weekKeys.map((wk) => (
              <div key={wk} className="rounded-xl border border-ink-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-ink-700 uppercase tracking-wider mb-3">{wk}</h3>
                <div className="space-y-1">
                  {weekGroups[wk].map((s) => (
                    <SessionRow key={s.id} session={s} onClick={() => navigate(`/sessions/${s.id}`)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }
      case 'day': {
        // Group work days + sessions by date
        const dayGroups: Record<string, { workDay?: WorkDay; sessions: TrainingSession[] }> = {};
        workDays.forEach((wd) => {
          if (!dayGroups[wd.date]) dayGroups[wd.date] = { sessions: [] };
          dayGroups[wd.date].workDay = wd;
        });
        sessions.forEach((s) => {
          if (!dayGroups[s.date]) dayGroups[s.date] = { sessions: [] };
          dayGroups[s.date].sessions.push(s);
        });
        const dayKeys = Object.keys(dayGroups).sort();
        return (
          <div className="space-y-3">
            <SectionHeader label="Working Days" onCreate={() => { setShowCreate('workday'); resetForm(); }} />
            {dayKeys.length === 0 && <EmptyState label="working days" onCreate={() => { setShowCreate('workday'); resetForm(); }} />}
            {dayKeys.map((d) => {
              const group = dayGroups[d];
              const date = new Date(d);
              return (
                <div key={d} className="rounded-xl border border-ink-200 bg-white p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-accent-50 text-accent-700">
                      <span className="text-xs font-medium uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink-800">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                      {group.workDay?.objective && <p className="text-xs text-ink-500 mt-0.5">{group.workDay.objective}</p>}
                    </div>
                    {group.workDay && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit('workday', group.workDay!)} className="text-ink-400 hover:text-accent-600 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete('workday', group.workDay!.id)} className="text-ink-400 hover:text-red-500 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                  {group.sessions.length > 0 && (
                    <div className="ml-15 space-y-1 pl-2">
                      {group.sessions.map((s) => (
                        <SessionRow key={s.id} session={s} onClick={() => navigate(`/sessions/${s.id}`)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-800">Planning</h1>
        <p className="mt-1 text-sm text-ink-500">Season → Macrocycle → Mesocycle → Microcycle → Working Day → Session</p>
      </div>

      {/* Breadcrumb */}
      {crumbs.length > 0 && (
        <div className="mb-4 flex items-center gap-1 text-sm text-ink-500 flex-wrap">
          {crumbs.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-ink-300" />}
              <button onClick={item.onClick} className="hover:text-accent-600 transition-colors">{item.label}</button>
            </div>
          ))}
        </div>
      )}

      {/* Time scale switcher */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border border-ink-200 bg-white p-1">
        {SCALES.map((s) => (
          <button key={s} onClick={() => setScale(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${scale === s ? 'bg-accent-600 text-white' : 'text-ink-600 hover:bg-ink-100'}`}>
            {SCALE_LABELS[s]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {renderTimeline()}

      {/* Create modal */}
      {showCreate && (
        <Modal title={`New ${showCreate.charAt(0).toUpperCase() + showCreate.slice(1)}`} onClose={() => setShowCreate(null)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Name"><input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required className={inputClass} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date"><input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} required className={inputClass} /></FormField>
              <FormField label="End Date"><input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className={inputClass} /></FormField>
            </div>
            <FormField label="Objective"><textarea value={formObjective} onChange={(e) => setFormObjective(e.target.value)} rows={2} className={inputClass} /></FormField>
            <FormField label="Notes"><textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className={inputClass} /></FormField>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <ModalButtons onCancel={() => setShowCreate(null)} submitting={creating} submitLabel="Create" />
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal title={`Edit ${editTarget.level.charAt(0).toUpperCase() + editTarget.level.slice(1)}`} onClose={() => setEditTarget(null)}>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <FormField label="Name"><input type="text" value={editTarget.name} onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })} required className={inputClass} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={editTarget.level === 'workday' ? 'Date' : 'Start Date'}>
                <input type="date" value={editTarget.start_date} onChange={(e) => setEditTarget({ ...editTarget, start_date: e.target.value })} required className={inputClass} />
              </FormField>
              {editTarget.level !== 'workday' && (
                <FormField label="End Date"><input type="date" value={editTarget.end_date} onChange={(e) => setEditTarget({ ...editTarget, end_date: e.target.value })} className={inputClass} /></FormField>
              )}
            </div>
            <FormField label="Objective"><textarea value={editTarget.objective} onChange={(e) => setEditTarget({ ...editTarget, objective: e.target.value })} rows={2} className={inputClass} /></FormField>
            <FormField label="Notes"><textarea value={editTarget.notes} onChange={(e) => setEditTarget({ ...editTarget, notes: e.target.value })} rows={2} className={inputClass} /></FormField>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <ModalButtons onCancel={() => setEditTarget(null)} submitting={saving} submitLabel="Save" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Shared UI helpers ──────────────────────────────────────────

const inputClass = 'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none';

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink-800">{title}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-ink-700 mb-1">{label}</label>{children}</div>;
}

function ModalButtons({ onCancel, submitting, submitLabel }: { onCancel: () => void; submitting: boolean; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">Cancel</button>
      <button type="submit" disabled={submitting} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

function SectionHeader({ label, onCreate }: { label: string; onCreate: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wider">{label}</h2>
      <button onClick={onCreate} className="flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 font-medium">
        <Plus className="h-3 w-3" /> New
      </button>
    </div>
  );
}

function EmptyState({ label, onCreate }: { label: string; onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
      <p className="text-sm text-ink-500 mb-3">No {label} yet.</p>
      <button onClick={onCreate} className="text-sm text-accent-600 hover:text-accent-700 font-medium">Create one now</button>
    </div>
  );
}

function TimelineBlock({ title, subtitle, objective, onClick, onEdit, onDelete }: {
  title: string; subtitle: string; objective: string | null;
  onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-ink-200 bg-white p-4 hover:border-accent-300 transition-colors cursor-pointer" onClick={onClick}>
      <div className="h-full w-1.5 rounded-full bg-accent-400" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink-800">{title}</p>
        <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>
        {objective && <p className="text-xs text-ink-400 mt-1">{objective}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-ink-400 hover:text-accent-600 p-1"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-ink-400 hover:text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>
      </div>
      <ChevronRight className="h-4 w-4 text-ink-300" />
    </div>
  );
}

function SessionRow({ session, onClick }: { session: TrainingSession; onClick: () => void }) {
  const Icon = EVENT_ICONS[session.event_type] || Dumbbell;
  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50 cursor-pointer transition-colors" onClick={onClick}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink-800">{session.title}</p>
        <p className="text-xs text-ink-500 flex items-center gap-1"><Clock className="h-3 w-3" />{session.time}{session.location && ` · ${session.location}`}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[session.status] || ''}`}>{session.status.replace('_', ' ')}</span>
    </div>
  );
}
