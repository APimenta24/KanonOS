import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, type UserProfile, type UserRole, type Workspace } from './supabase';

type AuthState = {
  user: UserProfile | null;
  workspace: Workspace | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { full_name?: string | null; role?: UserRole; active_workspace_id?: string | null }) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
    return data as UserProfile | null;
  }, []);

  const loadWorkspace = useCallback(async (workspaceId: string | null) => {
    if (!workspaceId) { setWorkspace(null); return; }
    const { data } = await supabase.from('workspaces').select('*').eq('id', workspaceId).maybeSingle();
    setWorkspace(data as Workspace | null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          let profile = await loadProfile(session.user.id);
          if (!profile && event === 'SIGNED_IN') {
            await new Promise((r) => setTimeout(r, 500));
            profile = await loadProfile(session.user.id);
          }
          if (mounted) {
            setUser(profile);
            await loadWorkspace(profile?.active_workspace_id ?? null);
            setLoading(false);
          }
        } else {
          if (mounted) {
            setUser(null);
            setWorkspace(null);
            setLoading(false);
          }
        }
      })();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id).then(async (profile) => {
          if (mounted) {
            setUser(profile);
            await loadWorkspace(profile?.active_workspace_id ?? null);
            setLoading(false);
          }
        });
      } else {
        if (mounted) setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [loadProfile, loadWorkspace]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message || null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setWorkspace(null);
  }, []);

  const updateProfile = useCallback(async (updates: { full_name?: string | null; role?: UserRole; active_workspace_id?: string | null }) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('user_profiles').update(updates).eq('id', user.id);
    if (!error) {
      setUser({ ...user, ...updates });
      if ('active_workspace_id' in updates) {
        await loadWorkspace(updates.active_workspace_id ?? null);
      }
    }
    return { error: error?.message || null };
  }, [user, loadWorkspace]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await loadProfile(user.id);
    if (profile) {
      setUser(profile);
      await loadWorkspace(profile.active_workspace_id);
    }
  }, [user, loadProfile, loadWorkspace]);

  const setActiveWorkspace = useCallback(async (workspaceId: string) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('user_profiles').update({ active_workspace_id: workspaceId }).eq('id', user.id);
    if (!error) {
      setUser({ ...user, active_workspace_id: workspaceId });
      await loadWorkspace(workspaceId);
    }
    return { error: error?.message || null };
  }, [user, loadWorkspace]);

  return (
    <AuthContext.Provider value={{ user, workspace, loading, signIn, signUp, signOut, updateProfile, refreshProfile, setActiveWorkspace }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
