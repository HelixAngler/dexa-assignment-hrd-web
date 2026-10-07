import { Navigate, type RouteObject } from 'react-router-dom';
import HrdLayout from '../HrdLayout';
import AbsensiPage from '../pages/AbsensiPage';
import KaryawanAddPage from '../pages/KaryawanAddPage';
import KaryawanEditPage from '../pages/KaryawanEditPage';
import KaryawanListPage from '../pages/KaryawanListPage';
import LoginPage from '../pages/LoginPage';

/** Routes reachable without a session, e.g. the sign-in screen. */
export const publicRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
];

/** Routes that render inside the HRD shell and require a signed-in user. */
export const protectedRoutes: RouteObject[] = [
  { path: '/karyawan', element: <KaryawanListPage /> },
  { path: '/karyawan/add', element: <KaryawanAddPage /> },
  { path: '/karyawan/:id/edit', element: <KaryawanEditPage /> },
  { path: '/absensi', element: <AbsensiPage /> },
];

/**
 * Route table consumed by App via useRoutes.
 *
 * Entries are grouped so access control can be added by wrapping a group (or a
 * single entry) with a guard element, without reordering the matching rules:
 * unknown paths and the site root fall through to the Karyawan list.
 */
export const routeTable: RouteObject[] = [
  ...publicRoutes,
  {
    element: <HrdLayout />,
    children: [
      { index: true, element: <Navigate to="/karyawan" replace /> },
      ...protectedRoutes,
      { path: '*', element: <Navigate to="/karyawan" replace /> },
    ],
  },
];
