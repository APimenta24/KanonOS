import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, type Team, type Season } from './supabase';
import { useAuth } from './auth';

type WorkingContextState = {
  team: Team | null;
  season: Season | null;
  teams: Team[];
  seasons: Season[];
  setTeamId: (id: string | null) => void;
  setSeasonId: (id: string | null) => void;
  refresh: () => Promise<void>;
  loading: boolean;
};

const WorkingContext = createContext<WorkingContextState | null>(null);

const STORAGE_KEY = 'kanonos_working_context';

export function WorkingContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teamId, setTeamIdState] = useState<string | null>(null);
  const [seasonId, setSeasonIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeams = useCallback(async () => {
    const { data } = await supabase.from('teams').select('*').order('name', { ascending: true });
    return (data as Team[]) || [];
  }, []);

  const loadSeasons = useCallback(async (tId: string) => {
    const { data } = await supabase.from('seasons').select('*').eq('team_id', tId).order('start_date', { ascending: false });
    return (data as Season[]) || [];
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setTeams([]);
      setSeasons([]);
      setTeamIdState(null);
      setSeasonIdState(null);
      setLoading(false);
      return;
    }
    const loadedTeams = await loadTeams();
    setTeams(loadedTeams);

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    })();

    let currentTeamId = stored.teamId;
    if (currentTeamId && !loadedTeams.find((t) => t.id === currentTeamId)) {
      currentTeamId = null;
    }
    if (!currentTeamId && loadedTeams.length > 0) {
      currentTeamId = loadedTeams[0].id;
    }

    setTeamIdState(currentTeamId);

    if (currentTeamId) {
      const loadedSeasons = await loadSeasons(currentTeamId);
      setSeasons(loadedSeasons);

      let currentSeasonId = stored.seasonId;
      if (currentSeasonId && !loadedSeasons.find((s) => s.id === currentSeasonId)) {
        currentSeasonId = null;
      }
      if (!currentSeasonId && loadedSeasons.length > 0) {
        currentSeasonId = loadedSeasons[0].id;
      }
      setSeasonIdState(currentSeasonId);
    } else {
      setSeasons([]);
      setSeasonIdState(null);
    }

    setLoading(false);
  }, [user, loadTeams, loadSeasons]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setTeamId = useCallback((id: string | null) => {
    setTeamIdState(id);
    setSeasonIdState(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ teamId: id, seasonId: null }));
    if (id) {
      loadSeasons(id).then((loaded) => {
        setSeasons(loaded);
        if (loaded.length > 0) {
          setSeasonIdState(loaded[0].id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ teamId: id, seasonId: loaded[0].id }));
        }
      });
    } else {
      setSeasons([]);
    }
  }, [loadSeasons]);

  const setSeasonId = useCallback((id: string | null) => {
    setSeasonIdState(id);
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    })();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, seasonId: id }));
  }, []);

  const team = teams.find((t) => t.id === teamId) || null;
  const season = seasons.find((s) => s.id === seasonId) || null;

  return (
    <WorkingContext.Provider value={{ team, season, teams, seasons, setTeamId, setSeasonId, refresh, loading }}>
      {children}
    </WorkingContext.Provider>
  );
}

export function useWorkingContext() {
  const ctx = useContext(WorkingContext);
  if (!ctx) throw new Error('useWorkingContext must be used within WorkingContextProvider');
  return ctx;
}
