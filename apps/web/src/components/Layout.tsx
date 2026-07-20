import { NavLink, useNavigate } from 'react-router-dom';
import { type ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useWorkingContext } from '../lib/working-context';
import { supabase, type Organization } from '../lib/supabase';
import { LayoutDashboard, Users, Calendar, Dumbbell, ClipboardList, LogOut } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Workspace', icon: LayoutDashboard },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/athletes', label: 'Athletes', icon: Dumbbell },
  { to: '/planning', label: 'Planning', icon: Calendar },
  { to: '/sessions', label: 'Sessions', icon: ClipboardList },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, workspace, signOut } = useAuth();
  const { team, season, teams, seasons, setTeamId, setSeasonId } = useWorkingContext();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!workspace || workspace.type !== 'organization') {
      setOrganization(null);
      return;
    }
    supabase
      .from('organizations')
      .select('*')
      .eq('workspace_id', workspace.id)
      .maybeSingle()
      .then(({ data }) => setOrganization(data as Organization | null));
  }, [workspace]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <div className="flex h-screen bg-ink-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-ink-200 bg-white">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-ink-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white font-bold text-sm">
            K
          </div>
          <span className="text-lg font-semibold text-ink-800">KanonOS</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-50 text-accent-700'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-800'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User Context Bar */}
        <div className="border-t border-ink-200 p-4 space-y-3">
          {/* User info */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-200 text-ink-600 text-xs font-semibold">
              {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-800 truncate">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-ink-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-ink-400 hover:text-ink-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Workspace */}
          <div className="text-xs">
            <span className="text-ink-400">Workspace</span>
            <p className="font-medium text-ink-700 truncate">{workspace?.name || '—'}</p>
          </div>

          {/* Active Organization (if any) */}
          {organization && (
            <div className="text-xs">
              <span className="text-ink-400">Organization</span>
              <p className="font-medium text-ink-700 truncate">{organization.name}</p>
            </div>
          )}

          {/* Active Team */}
          <div className="text-xs">
            <span className="text-ink-400">Team</span>
            {teams.length > 0 ? (
              <select
                value={team?.id || ''}
                onChange={(e) => setTeamId(e.target.value)}
                className="mt-0.5 w-full rounded border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-700 focus:border-accent-400 focus:outline-none"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            ) : (
              <p className="font-medium text-ink-700">—</p>
            )}
          </div>

          {/* Active Season */}
          {team && (
            <div className="text-xs">
              <span className="text-ink-400">Season</span>
              {seasons.length > 0 ? (
                <select
                  value={season?.id || ''}
                  onChange={(e) => setSeasonId(e.target.value)}
                  className="mt-0.5 w-full rounded border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-700 focus:border-accent-400 focus:outline-none"
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="font-medium text-ink-700">—</p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
