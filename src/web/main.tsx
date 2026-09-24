import { FleetProvider } from '../context/FleetContext';
import { Dashboard } from './pages/Dashboard';

/**
 * Single-screen root for the app. Acts as the only route for now.
 * See decisions.md for the plan to split this into routed pages later.
 */
export const Main = () => {
  return (
    <FleetProvider>
      <Dashboard />
    </FleetProvider>
  );
};
