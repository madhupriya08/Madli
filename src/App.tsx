import { Routes, Route } from 'react-router-dom';
import { screenRoutes } from './screens/routes';
import { DevHarness } from './dev/DevHarness';
import { usePageViews } from './lib/usePageViews';

export function App() {
  usePageViews();

  return (
    <DevHarness>
      <Routes>
        {screenRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </DevHarness>
  );
}
