import { useRoutes } from 'react-router-dom';
import { routeTable } from './app/router';

export default function App() {
  return useRoutes(routeTable);
}
