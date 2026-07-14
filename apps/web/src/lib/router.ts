import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { name: 'workspace' }
  | { name: 'planning' }
  | { name: 'planning-week'; year: number; week: number }
  | { name: 'athletes' }
  | { name: 'teams' }
  | { name: 'team'; teamId: string }
  | { name: 'session'; sessionId: string }
  | { name: 'review'; sessionId: string }
  | { name: 'history' };

export function parseHash(): Route {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'workspace' };
  if (parts[0] === 'planning' && parts.length === 1) return { name: 'planning' };
  if (parts[0] === 'planning' && parts.length === 3) return { name: 'planning-week', year: parseInt(parts[1]), week: parseInt(parts[2]) };
  if (parts[0] === 'athletes') return { name: 'athletes' };
  if (parts[0] === 'teams' && parts.length === 1) return { name: 'teams' };
  if (parts[0] === 'teams' && parts.length === 2) return { name: 'team', teamId: parts[1] };
  if (parts[0] === 'session' && parts.length === 2) return { name: 'session', sessionId: parts[1] };
  if (parts[0] === 'review' && parts.length === 2) return { name: 'review', sessionId: parts[1] };
  if (parts[0] === 'history') return { name: 'history' };

  return { name: 'workspace' };
}

export function navigate(route: Route) {
  let hash = '#/';
  switch (route.name) {
    case 'workspace': hash = '#/'; break;
    case 'planning': hash = '#/planning'; break;
    case 'planning-week': hash = `#/planning/${route.year}/${route.week}`; break;
    case 'athletes': hash = '#/athletes'; break;
    case 'teams': hash = '#/teams'; break;
    case 'team': hash = `#/teams/${route.teamId}`; break;
    case 'session': hash = `#/session/${route.sessionId}`; break;
    case 'review': hash = `#/review/${route.sessionId}`; break;
    case 'history': hash = '#/history'; break;
  }
  window.location.hash = hash;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return route;
}

export function useNavigate() {
  return useCallback((route: Route) => navigate(route), []);
}
