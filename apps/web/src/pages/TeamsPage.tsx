import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Trash2, MoreHorizontal, Search, Check } from 'lucide-react';
import { supabase, type Team, type Athlete } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Form';

const TEAM_COLORS = ['#3B82F6', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981', '#F97316'];

const AGE_CATEGORIES = ['U-13', 'U-15', 'U-17', 'U-19', 'U-21', 'Senior'];

export function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
    setTeams(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleDelete = async (teamId: string) => {
    await supabase.from('teams').delete().eq('id', teamId);
    setMenuOpen(null);
    loadTeams();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Teams</h1>
          <p className="text-sm text-ink-500 mt-1">Manage your training groups.</p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus size={15} /> New team
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No teams yet"
          description="Create your first team to start planning training sessions."
          action={<Button onClick={() => setShowAddModal(true)}><Plus size={15} /> Create team</Button>}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="relative group bg-white rounded-xl border border-ink-100 p-5 hover:border-ink-300 hover:shadow-card-hover transition-all">
              <button onClick={() => navigate({ name: 'team', teamId: team.id })} className="text-left w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: team.color }}>
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-ink-900 truncate">{team.name}</h3>
                    <p className="text-xs text-ink-400">
                      {team.age_category || '—'}
                      {team.season ? ` · ${team.season}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-400">
                  <span>{team.athlete_count} athletes</span>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === team.id ? null : team.id); }}
                className="absolute top-3 right-3 w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal size={15} />
              </button>
              {menuOpen === team.id && (
                <div className="absolute top-11 right-3 z-10 bg-white rounded-lg shadow-floating border border-ink-100 py-1 animate-scale-in">
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={12} /> Delete team
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddTeamModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadTeams(); }} />
      )}
    </div>
  );
}

function AddTeamModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [ageCategory, setAgeCategory] = useState(AGE_CATEGORIES[2]);
  const [season, setSeason] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [athletesLoaded, setAthletesLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('athletes').select('*').eq('status', 'active').order('name', { ascending: true });
      setAthletes((data as Athlete[]) || []);
      setAthletesLoaded(true);
    })();
  }, []);

  const filtered = athletes.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const toggleAthlete = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data: teamData } = await supabase.from('teams').insert({
      name: name.trim(),
      age_category: ageCategory,
      season: season.trim() || null,
      color,
      sport: 'Futebol',
      athlete_count: selectedIds.size,
    }).select('*').single();

    if (teamData && selectedIds.size > 0) {
      const inserts = Array.from(selectedIds).map((athleteId) => ({
        team_id: (teamData as Team).id,
        athlete_id: athleteId,
      }));
      await supabase.from('team_athletes').insert(inserts);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Team"
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : 'Create team'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Team name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HCT Sub-17" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Age category</Label>
            <select
              value={ageCategory}
              onChange={(e) => setAgeCategory(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-ink-400 focus:ring-2 focus:ring-ink-100 focus:outline-none transition-all"
            >
              {AGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Season (optional)</Label>
            <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. 2024/25" />
          </div>
        </div>
        <div>
          <Label>Team color</Label>
          <div className="flex gap-2">
            {TEAM_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-ink-900 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Athlete selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Select athletes</Label>
            <span className="text-xs text-ink-400">{selectedIds.size} selected</span>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search athletes…"
              className="pl-9"
            />
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin border border-ink-100 rounded-lg">
            {!athletesLoaded ? (
              <div className="p-4 text-center text-xs text-ink-400">Loading athletes…</div>
            ) : athletes.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-400">No active athletes. Create athletes first.</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-400">No matches.</div>
            ) : (
              filtered.map((a) => {
                const selected = selectedIds.has(a.id);
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
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-sm text-ink-700 flex-1">{a.name}</span>
                    {a.jersey_number !== null && <span className="text-xs text-ink-400">#{a.jersey_number}</span>}
                    {a.position && <span className="text-xs text-ink-400">{a.position}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
