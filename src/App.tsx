import { Routes, Route } from 'react-router-dom';
import { screenRoutes } from './screens/routes';
import { DevHarness } from './dev/DevHarness';

export function App() {
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
