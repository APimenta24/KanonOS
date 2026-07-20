import { useState, useEffect, useCallback } from 'react';
import { supabase, type Team } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useWorkingContext } from '../lib/working-context';
import { Plus, Users, X, Pencil, Trash2 } from 'lucide-react';

const SPORTS = ['Futebol', 'Basketball', 'Volleyball', 'Handball', 'Rugby', 'Athletics', 'Other'];
const AGE_CATEGORIES = ['Sub-13', 'Sub-15', 'Sub-17', 'Sub-19', 'Senior', 'Other'];
const TEAM_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export function TeamsPage() {
  const { user, workspace } = useAuth();
  const { teams, setTeamId, refresh } = useWorkingContext();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [sport, setSport] = useState('Futebol');
  const [ageCategory, setAgeCategory] = useState('Sub-17');
  const [color, setColor] = useState('#3B82F6');
  const [season, setSeason] = useState('2024/25');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    await refresh();
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName('');
    setSport('Futebol');
    setAgeCategory('Sub-17');
    setColor('#3B82F6');
    setSeason('2024/25');
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setCreating(true);
    const { error } = await supabase.from('teams').insert({
      name,
      sport,
      age_category: ageCategory,
      color,
      season,
      head_coach_id: user.id,
      workspace_id: workspace?.id || null,
      athlete_count: 0,
    });
    setCreating(false);
    if (error) {
      setError(error.message);
    } else {
      setShowCreate(false);
      resetForm();
      await refresh();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeam) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from('teams').update({
      name,
      sport,
      age_category: ageCategory,
      color,
      season,
    }).eq('id', editTeam.id);

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    setSaving(false);
    setEditTeam(null);
    resetForm();
    await refresh();
  };

  const handleDelete = async (teamToDelete: Team) => {
    const { error } = await supabase.from('teams').delete().eq('id', teamToDelete.id);
    if (error) { setError(error.message); return; }
    await refresh();
  };

  const openEdit = (t: Team) => {
    setEditTeam(t);
    setName(t.name);
    setSport(t.sport);
    setAgeCategory(t.age_category || 'Sub-17');
    setColor(t.color);
    setSeason(t.season);
    setError(null);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-800">Teams</h1>
          <p className="mt-1 text-sm text-ink-500">Manage your teams within the active workspace.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); resetForm(); }}
          className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Team
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading && <div className="text-sm text-ink-400">Loading teams...</div>}

      {!loading && teams.length === 0 && (
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">No teams yet. Create your first team to get started.</p>
        </div>
      )}

      {!loading && teams.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <div
              key={t.id}
              className="group rounded-xl border border-ink-200 bg-white p-4 hover:border-ink-300 transition-colors cursor-pointer"
              onClick={() => setTeamId(t.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm font-bold" style={{ backgroundColor: t.color }}>
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate">{t.name}</p>
                  <p className="text-xs text-ink-500">{t.sport} · {t.age_category || '—'}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="text-ink-400 hover:text-accent-600 p-1">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(t); }} className="text-ink-400 hover:text-red-500 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-ink-400">
                <span>{t.athlete_count} athletes</span>
                <span>{t.season}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared form fields used by both create and edit modals */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-800">New Team</h3>
              <button onClick={() => setShowCreate(false)} className="text-ink-400 hover:text-ink-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <TeamFormFields name={name} setName={setName} sport={sport} setSport={setSport}
                ageCategory={ageCategory} setAgeCategory={setAgeCategory} season={season} setSeason={setSeason}
                color={color} setColor={setColor} />
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditTeam(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-800">Edit Team</h3>
              <button onClick={() => setEditTeam(null)} className="text-ink-400 hover:text-ink-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <TeamFormFields name={name} setName={setName} sport={sport} setSport={setSport}
                ageCategory={ageCategory} setAgeCategory={setAgeCategory} season={season} setSeason={setSeason}
                color={color} setColor={setColor} />
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditTeam(null)} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamFormFields({ name, setName, sport, setSport, ageCategory, setAgeCategory, season, setSeason, color, setColor }: {
  name: string; setName: (v: string) => void;
  sport: string; setSport: (v: string) => void;
  ageCategory: string; setAgeCategory: (v: string) => void;
  season: string; setSeason: (v: string) => void;
  color: string; setColor: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1">Team Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Sport</label>
          <select value={sport} onChange={(e) => setSport(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none">
            {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Age Category</label>
          <select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none">
            {AGE_CATEGORIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1">Season</label>
        <input type="text" value={season} onChange={(e) => setSeason(e.target.value)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1">Color</label>
        <div className="flex gap-2">
          {TEAM_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-ink-400 scale-110' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </>
  );
}
