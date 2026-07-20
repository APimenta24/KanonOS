import { useState, useEffect, useCallback } from 'react';
import { supabase, type Athlete } from '../lib/supabase';
import { useWorkingContext } from '../lib/working-context';
import { Plus, Dumbbell, X, Pencil, Trash2 } from 'lucide-react';

export function AthletesPage() {
  const { team, teams, refresh } = useWorkingContext();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAthlete, setEditAthlete] = useState<Athlete | null>(null);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAthletes = useCallback(async () => {
    if (!team) { setAthletes([]); setLoading(false); return; }
    const { data } = await supabase
      .from('team_athletes')
      .select('athlete_id, athletes(*)')
      .eq('team_id', team.id)
      .order('created_at', { ascending: true });
    const mapped = ((data as unknown as { athlete_id: string; athletes: Athlete }[]) || [])
      .map((row) => row.athletes)
      .filter(Boolean);
    setAthletes(mapped);
    setLoading(false);
  }, [team]);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  const resetForm = () => {
    setName('');
    setDateOfBirth('');
    setGender('male');
    setJerseyNumber('');
    setPosition('');
    setStatus('active');
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) { setError('Select a team first.'); return; }
    setError(null);
    setCreating(true);

    const { data: athleteData, error: athleteError } = await supabase
      .from('athletes')
      .insert({
        name,
        date_of_birth: dateOfBirth || null,
        gender,
        jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
        position: position || null,
        status,
      })
      .select()
      .single();

    if (athleteError) {
      setCreating(false);
      setError(athleteError.message);
      return;
    }

    const athlete = athleteData as Athlete;

    const { error: linkError } = await supabase
      .from('team_athletes')
      .insert({
        team_id: team.id,
        athlete_id: athlete.id,
      });

    if (linkError) {
      setCreating(false);
      setError(linkError.message);
      return;
    }

    await supabase
      .from('teams')
      .update({ athlete_count: (athletes.length + 1) })
      .eq('id', team.id);

    setCreating(false);
    setShowCreate(false);
    resetForm();
    await refresh();
    loadAthletes();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAthlete) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from('athletes').update({
      name,
      date_of_birth: dateOfBirth || null,
      gender,
      jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
      position: position || null,
      status,
    }).eq('id', editAthlete.id);

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    setSaving(false);
    setEditAthlete(null);
    resetForm();
    loadAthletes();
  };

  const handleDelete = async (athlete: Athlete) => {
    if (!team) return;

    const { error: linkError } = await supabase
      .from('team_athletes')
      .delete()
      .eq('team_id', team.id)
      .eq('athlete_id', athlete.id);

    if (linkError) { setError(linkError.message); return; }

    const { error: athleteError } = await supabase
      .from('athletes')
      .delete()
      .eq('id', athlete.id);

    if (athleteError) { setError(athleteError.message); return; }

    await supabase
      .from('teams')
      .update({ athlete_count: Math.max(0, athletes.length - 1) })
      .eq('id', team.id);

    await refresh();
    loadAthletes();
  };

  const openEdit = (athlete: Athlete) => {
    setEditAthlete(athlete);
    setName(athlete.name);
    setDateOfBirth(athlete.date_of_birth || '');
    setGender(athlete.gender || 'male');
    setJerseyNumber(athlete.jersey_number?.toString() || '');
    setPosition(athlete.position || '');
    setStatus(athlete.status);
    setError(null);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-800">Athletes</h1>
          <p className="mt-1 text-sm text-ink-500">
            {team ? `Athletes in ${team.name}` : 'Select a team to manage athletes.'}
          </p>
        </div>
        {team && (
          <button
            onClick={() => { setShowCreate(true); resetForm(); }}
            className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Athlete
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!team && teams.length === 0 && (
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">Create a team first, then add athletes to it.</p>
        </div>
      )}

      {team && loading && <div className="text-sm text-ink-400">Loading athletes...</div>}

      {team && !loading && athletes.length === 0 && (
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">No athletes yet. Add your first athlete to this team.</p>
        </div>
      )}

      {team && !loading && athletes.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">Position</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">Jersey</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-ink-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {athletes.map((a) => (
                <tr key={a.id} className="hover:bg-ink-50 group">
                  <td className="px-4 py-3 text-sm font-medium text-ink-800">{a.name}</td>
                  <td className="px-4 py-3 text-sm text-ink-600">{a.position || '—'}</td>
                  <td className="px-4 py-3 text-sm text-ink-600">{a.jersey_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      a.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(a)} className="text-ink-400 hover:text-accent-600 p-1">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(a)} className="text-ink-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-800">New Athlete</h3>
              <button onClick={() => setShowCreate(false)} className="text-ink-400 hover:text-ink-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Jersey Number</label>
                  <input type="number" value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Position</label>
                  <input type="text" value={position} onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Athlete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editAthlete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditAthlete(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-800">Edit Athlete</h3>
              <button onClick={() => setEditAthlete(null)} className="text-ink-400 hover:text-ink-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Jersey Number</label>
                  <input type="number" value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Position</label>
                  <input type="text" value={position} onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditAthlete(null)} className="rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-100">
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
