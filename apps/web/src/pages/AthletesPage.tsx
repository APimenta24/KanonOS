import { useState, useEffect, useCallback } from 'react';
import { Plus, UserCircle, Trash2, MoreHorizontal, Pencil, Search } from 'lucide-react';
import { supabase, type Athlete, type AthleteGender, type AthleteStatus } from '../lib/supabase';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Label } from '../components/ui/Form';

const GENDER_LABELS: Record<AthleteGender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const STATUS_LABELS: Record<AthleteStatus, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive', color: 'text-ink-500', bg: 'bg-ink-100', dot: 'bg-ink-400' },
};

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadAthletes = useCallback(async () => {
    const { data } = await supabase.from('athletes').select('*').order('name', { ascending: true });
    setAthletes((data as Athlete[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  const handleDelete = async (athlete: Athlete) => {
    await supabase.from('athletes').delete().eq('id', athlete.id);
    setMenuOpen(null);
    loadAthletes();
  };

  const filtered = athletes.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = athletes.filter((a) => a.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Athletes</h1>
          <p className="text-sm text-ink-500 mt-1">{athletes.length} total · {activeCount} active</p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus size={15} /> New athlete
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search athletes…"
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UserCircle size={40} />}
          title={athletes.length === 0 ? "No athletes yet" : "No matches found"}
          description={athletes.length === 0 ? "Create your first athlete to get started." : "Try adjusting your search or filters."}
          action={athletes.length === 0 ? <Button onClick={() => setShowAddModal(true)}><Plus size={15} /> Create athlete</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((athlete) => {
            const st = STATUS_LABELS[athlete.status];
            return (
              <div key={athlete.id} className="group relative bg-white rounded-xl border border-ink-100 p-4 hover:border-ink-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center text-ink-500 font-semibold text-sm flex-shrink-0">
                    {athlete.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink-900 truncate">{athlete.name}</h3>
                      {athlete.jersey_number !== null && (
                        <span className="text-xs text-ink-400 font-medium">#{athlete.jersey_number}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-400">
                      <span>{calcAge(athlete.date_of_birth)} yrs</span>
                      <span>·</span>
                      <span>{GENDER_LABELS[athlete.gender]}</span>
                      {athlete.position && (<><span>·</span><span>{athlete.position}</span></>)}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === athlete.id ? null : athlete.id); }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuOpen === athlete.id && (
                  <div className="absolute top-11 right-3 z-10 bg-white rounded-lg shadow-floating border border-ink-100 py-1 animate-scale-in">
                    <button
                      onClick={() => { setEditingAthlete(athlete); setMenuOpen(null); }}
                      className="w-full px-3 py-1.5 text-left text-xs text-ink-600 hover:bg-ink-50 flex items-center gap-2"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(athlete)}
                      className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AthleteModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadAthletes(); }} />
      )}
      {editingAthlete && (
        <AthleteModal onClose={() => setEditingAthlete(null)} existing={editingAthlete} onSaved={() => { setEditingAthlete(null); loadAthletes(); }} />
      )}
    </div>
  );
}

function AthleteModal({ onClose, existing, onSaved }: { onClose: () => void; existing?: Athlete; onSaved: () => void }) {
  const [name, setName] = useState(existing?.name || '');
  const [dateOfBirth, setDateOfBirth] = useState(existing?.date_of_birth || '');
  const [gender, setGender] = useState<AthleteGender>(existing?.gender || 'male');
  const [jerseyNumber, setJerseyNumber] = useState(existing?.jersey_number?.toString() || '');
  const [position, setPosition] = useState(existing?.position || '');
  const [status, setStatus] = useState<AthleteStatus>(existing?.status || 'active');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !dateOfBirth) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      date_of_birth: dateOfBirth,
      gender,
      jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
      position: position.trim() || null,
      status,
    };
    if (existing) {
      await supabase.from('athletes').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('athletes').insert(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit Athlete' : 'New Athlete'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || !dateOfBirth || saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create athlete'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Athlete name" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date of birth</Label>
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={gender} onChange={(e) => setGender(e.target.value as AthleteGender)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Jersey number (optional)</Label>
            <Input type="number" min={0} value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} placeholder="e.g. 10" />
          </div>
          <div>
            <Label>Position (optional)</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Defender" />
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as AthleteStatus)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>
    </Modal>
  );
}
