import { type ReactNode } from 'react';
import { LayoutGrid, CalendarDays, Users, UserCircle, History, Activity } from 'lucide-react';
import { useRoute, useNavigate, type Route } from '../lib/router';

interface NavItem {
  label: string;
  icon: typeof LayoutGrid;
  route: Route;
  match: (r: Route) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Workspace', icon: LayoutGrid, route: { name: 'workspace' }, match: (r) => r.name === 'workspace' },
  { label: 'Planning', icon: CalendarDays, route: { name: 'planning' }, match: (r) => r.name === 'planning' || r.name === 'planning-week' },
  { label: 'Athletes', icon: UserCircle, route: { name: 'athletes' }, match: (r) => r.name === 'athletes' },
  { label: 'Teams', icon: Users, route: { name: 'teams' }, match: (r) => r.name === 'teams' || r.name === 'team' },
  { label: 'History', icon: History, route: { name: 'history' }, match: (r) => r.name === 'history' },
];

export function Layout({ children }: { children: ReactNode }) {
  const route = useRoute();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-ink-100 flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ink-900 flex items-center justify-center">
            <Activity size={18} className="text-accent-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-ink-900 leading-none">KanonOS</h1>
            <p className="text-[10px] text-ink-400 mt-0.5 leading-none">Coach Operating System</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = item.match(route);
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-ink-900 text-white'
                    : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-ink-100">
          <p className="text-[10px] text-ink-400 leading-relaxed">
            Plan. Execute. Review. Improve.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto px-8 py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
