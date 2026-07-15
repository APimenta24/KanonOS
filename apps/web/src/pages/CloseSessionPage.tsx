import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Star, Check, X, CheckCircle2, Users, ClipboardList, Save } from 'lucide-react';
import { supabase, type TrainingSession, type Team, type Athlete, type SessionReview, type AttendanceStatus, type ObjectiveAchieved } from '../lib/supabase';
import { useNavigate } from '../lib/router';
import { formatDateLong } from '../lib/date';
import { EVENT_TYPE_CONFIG } from '../lib/constants';
import { LoadingState, ErrorState } from '../components/ui/States';
import { Button, IconButton } from '../components/ui/Button';
import { Textarea, Label } from '../components/ui/Form';

const STEPS = ['Attendance', 'Session Review', 'Athlete Ratings', 'Review & Save'] as const;

export function CloseSessionPage({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [existingReview, setExistingReview] = useState<SessionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(0);

  // Step 1: Attendance
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

  // Step 2: Session Review
  const [intensity, setIntensity] = useState(3);
  const [objectiveAchieved, setObjectiveAchieved] = useState<ObjectiveAchieved>('yes');
  const [notes, setNotes] = useState('');

  // Step 3: Athlete Ratings
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [athleteNotes, setAthleteNotes] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    const { data: sessionData, error: sessionErr } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr || !sessionData) {
      setError('Session not found');
      setLoading(false);
      return;
    }

    const s = sessionData as TrainingSession;
    setSession(s);

    const [{ data: teamData }, { data: rosterData }, { data: reviewData }, { data: attendanceData }, { data: athleteReviewData }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', s.team_id).maybeSingle(),
      supabase.from('team_athletes').select('athlete:athletes(*)').eq('team_id', s.team_id).order('athlete(name)', { ascending: true }),
      supabase.from('session_reviews').select('*').eq('session_id', sessionId).maybeSingle(),
      supabase.from('session_attendance').select('*').eq('session_id', sessionId),
      supabase.from('athlete_session_reviews').select('*').eq('session_id', sessionId),
    ]);

    setTeam(teamData as Team | null);
    const roster = (rosterData as unknown as { athlete: Athlete }[])?.map((r) => r.athlete) || [];
    setAthletes(roster);

    // Pre-fill attendance — default all to 'present'
    const attMap: Record<string, AttendanceStatus> = {};
    roster.forEach((a) => {
      const existing = (attendanceData as { athlete_id: string; status: AttendanceStatus }[])?.find((r) => r.athlete_id === a.id);
      attMap[a.id] = existing?.status || 'present';
    });
    setAttendance(attMap);

    // Pre-fill athlete ratings
    const ratingMap: Record<string, number> = {};
    const noteMap: Record<string, string> = {};
    roster.forEach((a) => {
      const existing = (athleteReviewData as { athlete_id: string; rating: number; note: string | null }[])?.find((r) => r.athlete_id === a.id);
      ratingMap[a.id] = existing?.rating || 0;
      noteMap[a.id] = existing?.note || '';
    });
    setRatings(ratingMap);
    setAthleteNotes(noteMap);

    // Pre-fill session review
    const r = reviewData as SessionReview | null;
    setExistingReview(r);
    if (r) {
      setIntensity(r.intensity_rating);
      setObjectiveAchieved(r.objective_achieved || 'yes');
      setNotes(r.notes || '');
    }

    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);

    // 1. Save/update session review
    const reviewPayload = {
      session_id: session.id,
      intensity_rating: intensity,
      objectives_rating: intensity, // keep legacy field in sync
      quality_rating: intensity, // keep legacy field in sync
      objective_achieved: objectiveAchieved,
      notes: notes.trim() || null,
    };

    if (existingReview) {
      await supabase.from('session_reviews').update({
        ...reviewPayload,
        updated_at: new Date().toISOString(),
      }).eq('id', existingReview.id);
    } else {
      await supabase.from('session_reviews').insert(reviewPayload);
    }

    // 2. Save attendance
    const attendanceRows = athletes.map((a) => ({
      session_id: session.id,
      athlete_id: a.id,
      status: attendance[a.id] || 'present',
    }));

    // Delete existing then insert (upsert pattern)
    await supabase.from('session_attendance').delete().eq('session_id', session.id);
    if (attendanceRows.length > 0) {
      await supabase.from('session_attendance').insert(attendanceRows);
    }

    // 3. Save athlete ratings (only for athletes with a rating > 0)
    const ratingRows = athletes
      .filter((a) => ratings[a.id] > 0)
      .map((a) => ({
        session_id: session.id,
        athlete_id: a.id,
        rating: ratings[a.id],
        note: athleteNotes[a.id]?.trim() || null,
      }));

    await supabase.from('athlete_session_reviews').delete().eq('session_id', session.id);
    if (ratingRows.length > 0) {
      await supabase.from('athlete_session_reviews').insert(ratingRows);
    }

    // 4. Mark session as completed
    await supabase.from('training_sessions').update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    }).eq('id', session.id);

    setSaving(false);
    navigate({ name: 'session', sessionId: session.id });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!session) return <ErrorState message="Session not found" />;

  const evType = EVENT_TYPE_CONFIG[session.event_type];
  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'absent').length;
  const ratedCount = Object.values(ratings).filter((r) => r > 0).length;

  const canProceed = step < 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <IconButton onClick={() => navigate({ name: 'session', sessionId: session.id })} aria-label="Back to session">
            <ArrowLeft size={18} />
          </IconButton>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team?.color || '#D4D4D8' }} />
              <span className="text-xs text-ink-500">{team?.name}</span>
              <span className="text-ink-200">·</span>
              <span className="text-xs text-ink-500">{formatDateLong(session.date)}</span>
              <span className="text-ink-200">·</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${evType.bg} ${evType.color}`}>
                {evType.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">Close Session: {session.title}</h1>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const isCurrent = step === i;
          const isDone = step > i;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isCurrent ? 'bg-ink-900 text-white' :
                  isDone ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer' :
                  'text-ink-300'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent ? 'bg-white/20' :
                  isDone ? 'bg-emerald-500 text-white' : 'bg-ink-100'
                }`}>
                  {isDone ? <Check size={11} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-1 ${step > i ? 'bg-emerald-300' : 'bg-ink-100'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Attendance</h2>
              <p className="text-xs text-ink-400 mt-0.5">Tap to mark each athlete.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 size={13} /> {presentCount} present
              </span>
              <span className="flex items-center gap-1.5 text-red-500 font-medium">
                <X size={13} /> {absentCount} absent
              </span>
            </div>
          </div>

          {athletes.length === 0 ? (
            <div className="bg-white rounded-xl border border-ink-100 p-6 text-center">
              <Users size={32} className="text-ink-300 mx-auto mb-3" />
              <p className="text-sm text-ink-400">No athletes in this team. You can still close the session.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {athletes.map((a) => {
                const status = attendance[a.id] || 'present';
                return (
                  <div key={a.id} className="bg-white rounded-xl border border-ink-100 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center text-ink-500 font-semibold text-sm flex-shrink-0">
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-ink-900 truncate">{a.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-ink-400">
                        {a.jersey_number !== null && <span>#{a.jersey_number}</span>}
                        {a.position && <span>{a.position}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AttendanceButton
                        active={status === 'present'}
                        onClick={() => setAttendance({ ...attendance, [a.id]: 'present' })}
                        activeClass="bg-emerald-500 text-white border-emerald-500"
                        icon={<Check size={14} />}
                        label="Present"
                      />
                      <AttendanceButton
                        active={status === 'absent'}
                        onClick={() => setAttendance({ ...attendance, [a.id]: 'absent' })}
                        activeClass="bg-red-500 text-white border-red-500"
                        icon={<X size={14} />}
                        label="Absent"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Session Review</h2>
            <p className="text-xs text-ink-400 mt-0.5">Rate the session and note outcomes.</p>
          </div>

          <div className="bg-white rounded-xl border border-ink-100 p-5 space-y-6">
            {/* Intensity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-ink-900">Session Intensity</span>
                  <span className="text-xs text-ink-400 ml-2">How demanding was it?</span>
                </div>
                <span className="text-sm font-bold text-ink-700">{intensity}/5</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setIntensity(n)}
                    className={`flex-1 h-9 rounded-lg border transition-all flex items-center justify-center ${
                      n <= intensity
                        ? 'bg-ink-900 border-ink-900 text-white'
                        : 'bg-white border-ink-200 text-ink-300 hover:border-ink-300'
                    }`}
                  >
                    <Star size={14} fill={n <= intensity ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Objective Achieved */}
            <div>
              <span className="text-sm font-semibold text-ink-900">Objective Achieved</span>
              <p className="text-xs text-ink-400 mt-0.5 mb-3">Was the session objective met?</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'yes', label: 'Yes', color: 'bg-emerald-500 text-white border-emerald-500' },
                  { value: 'partial', label: 'Partially', color: 'bg-amber-500 text-white border-amber-500' },
                  { value: 'no', label: 'No', color: 'bg-red-500 text-white border-red-500' },
                ] as { value: ObjectiveAchieved; label: string; color: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setObjectiveAchieved(opt.value)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      objectiveAchieved === opt.value
                        ? opt.color
                        : 'bg-white border-ink-200 text-ink-500 hover:border-ink-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>General Notes (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Overall observations, team response, tactical notes…"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Quick Athlete Ratings</h2>
              <p className="text-xs text-ink-400 mt-0.5">Tap stars to rate. Skip athletes you don't rate.</p>
            </div>
            <span className="text-xs text-ink-400">{ratedCount} rated</span>
          </div>

          {athletes.length === 0 ? (
            <div className="bg-white rounded-xl border border-ink-100 p-6 text-center">
              <Users size={32} className="text-ink-300 mx-auto mb-3" />
              <p className="text-sm text-ink-400">No athletes to rate.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {athletes.map((a) => {
                const rating = ratings[a.id] || 0;
                const isAbsent = attendance[a.id] === 'absent';
                return (
                  <div key={a.id} className={`bg-white rounded-xl border p-3 ${isAbsent ? 'border-ink-100 opacity-50' : 'border-ink-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center text-ink-500 font-semibold text-xs flex-shrink-0">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-ink-900 truncate">{a.name}</h3>
                        {isAbsent && <span className="text-[10px] text-red-400">Absent</span>}
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setRatings({ ...ratings, [a.id]: rating === n ? 0 : n })}
                            className={`p-1 transition-all ${n <= rating ? 'text-amber-500' : 'text-ink-200 hover:text-ink-300'}`}
                          >
                            <Star size={16} fill={n <= rating ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    {rating > 0 && (
                      <input
                        type="text"
                        value={athleteNotes[a.id] || ''}
                        onChange={(e) => setAthleteNotes({ ...athleteNotes, [a.id]: e.target.value })}
                        placeholder="Quick note (optional)…"
                        className="w-full mt-2 px-2 py-1.5 text-xs text-ink-700 bg-ink-50 rounded-lg border-0 focus:ring-1 focus:ring-ink-200 outline-none placeholder:text-ink-300"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Review & Save</h2>
            <p className="text-xs text-ink-400 mt-0.5">Confirm the summary and close this session.</p>
          </div>

          <div className="bg-white rounded-xl border border-ink-100 p-5 space-y-4">
            <SummaryRow icon={<Users size={16} />} label="Attendance">
              <span className="text-emerald-600 font-medium">{presentCount} present</span>
              {absentCount > 0 && <span className="text-red-500 font-medium ml-2">{absentCount} absent</span>}
            </SummaryRow>
            <SummaryRow icon={<Star size={16} />} label="Intensity">
              <span className="font-medium text-ink-700">{intensity}/5</span>
            </SummaryRow>
            <SummaryRow icon={<CheckCircle2 size={16} />} label="Objective">
              <span className={`font-medium ${
                objectiveAchieved === 'yes' ? 'text-emerald-600' :
                objectiveAchieved === 'partial' ? 'text-amber-600' : 'text-red-500'
              }`}>
                {objectiveAchieved === 'yes' ? 'Yes' : objectiveAchieved === 'partial' ? 'Partially' : 'No'}
              </span>
            </SummaryRow>
            <SummaryRow icon={<ClipboardList size={16} />} label="Athlete Ratings">
              <span className="font-medium text-ink-700">{ratedCount} rated</span>
            </SummaryRow>
            {notes.trim() && (
              <div className="pt-3 border-t border-ink-100">
                <Label>Notes</Label>
                <p className="text-sm text-ink-600 mt-1">{notes}</p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 flex items-start gap-3">
            <ClipboardList size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Closing this session will mark it as completed.</p>
              <p className="text-xs text-amber-600 mt-0.5">Attendance, ratings, and review will be saved. You can still edit them later.</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-ink-100">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => step === 0 ? navigate({ name: 'session', sessionId: session.id }) : setStep(step - 1)}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {canProceed ? (
          <Button size="sm" onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Close Session'}
          </Button>
        )}
      </div>
    </div>
  );
}

function AttendanceButton({
  active,
  onClick,
  activeClass,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  activeClass: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
        active ? activeClass : 'bg-white border-ink-200 text-ink-400 hover:border-ink-300'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function SummaryRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <span className="text-ink-400">{icon}</span>
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
