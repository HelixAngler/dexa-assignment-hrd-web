import type { ReactNode } from 'react';
import { Navigate, useLocation, type RouteObject } from 'react-router-dom';
import HrdLayout from '../HrdLayout';
import { AccessDeniedState, LoadingState } from '../components';
import { LanguageToggle, useI18n } from '../i18n/provider';
import AbsensiPage from '../pages/AbsensiPage';
import FirstLoginPage from '../pages/FirstLoginPage';
import KaryawanAddPage from '../pages/KaryawanAddPage';
import KaryawanEditPage from '../pages/KaryawanEditPage';
import KaryawanListPage from '../pages/KaryawanListPage';
import LoginPage from '../pages/LoginPage';
import { useSession } from '../services/session';

/** Routes reachable without a session, e.g. the sign-in screen. */
export const publicRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/first-login', element: <FirstLoginPage /> },
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

/** Centres full-viewport states on the page background, without app chrome. */
function FullPage({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      {children}
    </div>
  );
}

/**
 * Shown to a session that is signed in but does not belong to this console:
 * the view explains the denial and the sign-out button lets the visitor
 * leave, so nobody is stranded on a screen they cannot use.
 */
function EmployeeDeniedPage() {
  const { t } = useI18n();
  const { logout } = useSession();

  return (
    <FullPage>
      <AccessDeniedState
        title={t('route.denied.employeeTitle')}
        description={t('route.denied.employeeDescription')}
        onSignOut={() => void logout()}
      />
    </FullPage>
  );
}

/**
 * Route guard around the whole route tree. It resolves one decision per
 * session state: still probing shows the loading state, anonymous visitors
 * may only open the sign-in screen, a session that is not HRD is denied
 * every address (this console never renders its chrome for it), a pending
 * forced password change owns every address until it is done, and a signed-in
 * HRD session is routed away from the auth screens towards Karyawan.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { status, session } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <FullPage>
        <LoadingState />
      </FullPage>
    );
  }

  if (status === 'anon') {
    return location.pathname === '/login' ? (
      <>{children}</>
    ) : (
      <Navigate to="/login" replace />
    );
  }

  if (session?.role !== 'hrd') {
    return <EmployeeDeniedPage />;
  }

  if (session.mustChangePassword) {
    return location.pathname === '/first-login' ? (
      <>{children}</>
    ) : (
      <Navigate to="/first-login" replace />
    );
  }

  if (location.pathname === '/login' || location.pathname === '/first-login') {
    return <Navigate to="/karyawan" replace />;
  }

  return <>{children}</>;
}
