import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Trash2, MoreHorizontal } from 'lucide-react';
import { supabase, type Team } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Form';

const TEAM_COLORS = ['#3B82F6', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981', '#F97316'];

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
                    <p className="text-xs text-ink-400">{team.sport} · {team.season}</p>
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
  const [sport, setSport] = useState('Futebol');
  const [season, setSeason] = useState('2024/25');
  const [athleteCount, setAthleteCount] = useState(0);
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('teams').insert({
      name: name.trim(),
      sport,
      season,
      athlete_count: athleteCount,
      color,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Team"
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
            <Label>Sport</Label>
            <Input value={sport} onChange={(e) => setSport(e.target.value)} placeholder="e.g. Futebol" />
          </div>
          <div>
            <Label>Season</Label>
            <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. 2024/25" />
          </div>
        </div>
        <div>
          <Label>Athlete count</Label>
          <Input type="number" min={0} value={athleteCount} onChange={(e) => setAthleteCount(parseInt(e.target.value) || 0)} />
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
      </div>
    </Modal>
  );
}
