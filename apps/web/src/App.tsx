import { useRoute } from './lib/router';
import { Layout } from './components/Layout';
import { WorkspacePage } from './pages/WorkspacePage';
import { PlanningPage } from './pages/PlanningPage';
import { PlanningWeekPage } from './pages/PlanningWeekPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { SessionPage } from './pages/SessionPage';
import { ReviewPage } from './pages/ReviewPage';
import { HistoryPage } from './pages/HistoryPage';

function App() {
  const route = useRoute();

  return (
    <Layout>
      {route.name === 'workspace' && <WorkspacePage />}
      {route.name === 'planning' && <PlanningPage />}
      {route.name === 'planning-week' && <PlanningWeekPage year={route.year} week={route.week} />}
      {route.name === 'teams' && <TeamsPage />}
      {route.name === 'team' && <TeamDetailPage teamId={route.teamId} />}
      {route.name === 'session' && <SessionPage sessionId={route.sessionId} />}
      {route.name === 'review' && <ReviewPage sessionId={route.sessionId} />}
      {route.name === 'history' && <HistoryPage />}
    </Layout>
  );
}

export default App;
