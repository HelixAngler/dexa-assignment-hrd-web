import { useRoutes } from 'react-router-dom';
import { routeTable, SessionGate } from './app/router';

/** The route table itself; a component so hooks run unconditionally. */
function RouteViews() {
  return useRoutes(routeTable);
}

export default function App() {
  return (
    <SessionGate>
      <RouteViews />
    </SessionGate>
  );
}
