import { useRoute } from './lib/router';
import { Layout } from './components/Layout';
import { WorkspacePage } from './pages/WorkspacePage';
import { PlanningWeekPage } from './pages/PlanningWeekPage';
import { TeamsPage } from './pages/TeamsPage';
import { AthletesPage } from './pages/AthletesPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { SessionPage } from './pages/SessionPage';
import { CloseSessionPage } from './pages/CloseSessionPage';
import { HistoryPage } from './pages/HistoryPage';

function App() {
  const route = useRoute();

  return (
    <Layout>
      {route.name === 'workspace' && <WorkspacePage />}
      {route.name === 'planning' && <PlanningWeekPage year={route.year} week={route.week} />}
      {route.name === 'athletes' && <AthletesPage />}
      {route.name === 'teams' && <TeamsPage />}
      {route.name === 'team' && <TeamDetailPage teamId={route.teamId} />}
      {route.name === 'session' && <SessionPage sessionId={route.sessionId} />}
      {route.name === 'review' && <CloseSessionPage sessionId={route.sessionId} />}
      {route.name === 'history' && <HistoryPage />}
    </Layout>
  );
}

export default App;
