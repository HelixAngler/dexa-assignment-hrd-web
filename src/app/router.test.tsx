import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { protectedRoutes } from './router';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import * as attendanceService from '../services/attendance';
import * as authService from '../services/auth';
import * as employeesService from '../services/employees';
import { SessionProvider } from '../services/session';

vi.mock('../services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/auth')>();
  return {
    ...actual,
    fetchSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setFirstPassword: vi.fn(),
  };
});

vi.mock('../services/attendance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/attendance')>();
  return { ...actual, fetchAttendance: vi.fn() };
});

vi.mock('../services/employees', () => ({
  IDENTITY_BASE: '/api/identity',
  listEmployees: vi.fn(),
  fetchEmployeeById: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  setEmployeeStatus: vi.fn(),
  resetEmployeePassword: vi.fn(),
}));

const hrdSession: authService.Session = {
  role: 'hrd',
  mustChangePassword: false,
  name: 'Sari',
  email: 'admin@corp.test',
};

const employeeSession: authService.Session = {
  role: 'employee',
  mustChangePassword: false,
  name: 'Budi',
  email: 'budi@corp.test',
};

function renderAt(path: string) {
  return render(
    <I18nProvider>
      <SessionProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </SessionProvider>
    </I18nProvider>,
  );
}

describe('route table', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.mocked(authService.fetchSession).mockReset();
    vi.mocked(authService.logout).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    vi.mocked(employeesService.listEmployees).mockReset();
    vi.mocked(employeesService.listEmployees).mockResolvedValue([]);
    vi.mocked(employeesService.fetchEmployeeById).mockReset();
    vi.mocked(employeesService.fetchEmployeeById).mockResolvedValue(null);
    vi.mocked(authService.fetchSession).mockResolvedValue(hrdSession);
    vi.mocked(attendanceService.fetchAttendance).mockReset();
    vi.mocked(attendanceService.fetchAttendance).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects the site root to the Karyawan list', async () => {
    renderAt('/');
    expect(await screen.findByTestId('karyawan-list')).toBeTruthy();
  });

  it('renders the login page at /login outside the shell', async () => {
    vi.mocked(authService.fetchSession).mockResolvedValue(null);
    renderAt('/login');
    expect(await screen.findByTestId('login')).toBeTruthy();
    expect(screen.queryByTestId('banner-region')).toBeNull();
  });

  it('renders the Karyawan list at /karyawan inside the shell', async () => {
    renderAt('/karyawan');
    expect(await screen.findByTestId('karyawan-list')).toBeTruthy();
    expect(screen.getByTestId('banner-region')).toBeTruthy();
  });

  it('renders the add form at /karyawan/add', async () => {
    renderAt('/karyawan/add');
    expect(await screen.findByTestId('karyawan-add')).toBeTruthy();
  });

  it('renders the edit form at /karyawan/:id/edit', async () => {
    renderAt('/karyawan/42/edit');
    expect(await screen.findByTestId('karyawan-edit')).toBeTruthy();
  });

  it('renders the attendance page at /absensi', async () => {
    renderAt('/absensi');

    expect(await screen.findByTestId('absensi')).toBeTruthy();
    expect(await screen.findByTestId('absensi-readonly')).toHaveTextContent(
      id['absensi.readOnlyNote'],
    );
    expect(attendanceService.fetchAttendance).toHaveBeenCalledWith({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      q: '',
    });
  });

  it('sends unknown paths to the Karyawan list', async () => {
    renderAt('/tidak-ada');
    expect(await screen.findByTestId('karyawan-list')).toBeTruthy();
  });
});

describe('session routing policy', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.mocked(authService.fetchSession).mockReset();
    vi.mocked(authService.logout).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    vi.mocked(employeesService.listEmployees).mockReset();
    vi.mocked(employeesService.listEmployees).mockResolvedValue([]);
    vi.mocked(employeesService.fetchEmployeeById).mockReset();
    vi.mocked(employeesService.fetchEmployeeById).mockResolvedValue(null);
    vi.mocked(attendanceService.fetchAttendance).mockReset();
    vi.mocked(attendanceService.fetchAttendance).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('holds every route on the loading state while the session is probed', () => {
    vi.mocked(authService.fetchSession).mockReturnValue(new Promise(() => {}));
    renderAt('/karyawan');

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('karyawan-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-desktop')).not.toBeInTheDocument();
  });

  it('sends an anonymous visitor to the sign-in screen on a deep link', async () => {
    vi.mocked(authService.fetchSession).mockResolvedValue(null);
    renderAt('/karyawan/add');

    expect(await screen.findByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('karyawan-add')).not.toBeInTheDocument();
    expect(screen.queryByTestId('banner-region')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-desktop')).not.toBeInTheDocument();
  });

  it('denies an employee session on a deep link without the HRD chrome', async () => {
    vi.mocked(authService.fetchSession).mockResolvedValue(employeeSession);
    renderAt('/karyawan/42/edit');

    expect(await screen.findByTestId('access-denied-state')).toBeInTheDocument();
    expect(screen.getByText(id['route.denied.employeeTitle'])).toBeInTheDocument();
    expect(
      screen.getByText(id['route.denied.employeeDescription']),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('karyawan-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-desktop')).not.toBeInTheDocument();
    expect(screen.queryByTestId('banner-region')).not.toBeInTheDocument();
  });

  it('lets an HRD session reach the Karyawan list on a deep link', async () => {
    vi.mocked(authService.fetchSession).mockResolvedValue(hrdSession);
    renderAt('/karyawan');

    expect(await screen.findByTestId('karyawan-list')).toBeInTheDocument();
    expect(screen.getByTestId('nav-desktop')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied-state')).not.toBeInTheDocument();
  });

  it('offers sign out on the access-denied view and lands on the sign-in screen', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.fetchSession).mockResolvedValue(employeeSession);
    renderAt('/karyawan');

    await screen.findByTestId('access-denied-state');
    await user.click(screen.getByTestId('sign-out-button'));

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied-state')).not.toBeInTheDocument();
  });

  it('forces the first-password screen for an HRD session that must change it', async () => {
    vi.mocked(authService.fetchSession).mockResolvedValue({
      ...hrdSession,
      mustChangePassword: true,
    });
    renderAt('/karyawan');

    expect(await screen.findByTestId('first-login')).toBeInTheDocument();
    expect(screen.queryByTestId('karyawan-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-desktop')).not.toBeInTheDocument();
  });

  it('keeps an HRD session that must change the password off the sign-in screen', async () => {
    vi.mocked(authService.fetchSession).mockResolvedValue({
      ...hrdSession,
      mustChangePassword: true,
    });
    renderAt('/login');

    expect(await screen.findByTestId('first-login')).toBeInTheDocument();
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
  });

  it('moves a signed-in HRD session away from the sign-in screen', async () => {
    vi.mocked(authService.fetchSession).mockResolvedValue(hrdSession);
    renderAt('/login');

    expect(await screen.findByTestId('karyawan-list')).toBeInTheDocument();
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
  });
});

describe('language toggle on every screen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.mocked(authService.fetchSession).mockReset();
    vi.mocked(authService.login).mockReset();
    vi.mocked(authService.logout).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    vi.mocked(employeesService.listEmployees).mockReset();
    vi.mocked(employeesService.listEmployees).mockResolvedValue([]);
    vi.mocked(employeesService.fetchEmployeeById).mockReset();
    vi.mocked(employeesService.fetchEmployeeById).mockResolvedValue(null);
    vi.mocked(attendanceService.fetchAttendance).mockReset();
    vi.mocked(attendanceService.fetchAttendance).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('switches the sign-in screen to English without another session probe', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.fetchSession).mockResolvedValue(null);
    renderAt('/login');

    expect(await screen.findByTestId('login')).toBeInTheDocument();
    const probesSoFar = vi.mocked(authService.fetchSession).mock.calls.length;

    await user.click(screen.getByTestId('lang-toggle'));

    expect(
      screen.getByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to the HRD console with your company email.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(id['login.subtitle'])).not.toBeInTheDocument();
    expect(window.localStorage.getItem('lang')).toBe('en');
    expect(vi.mocked(authService.fetchSession).mock.calls.length).toBe(
      probesSoFar,
    );
    expect(authService.login).not.toHaveBeenCalled();
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('switches the forced first-password screen to English immediately', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.fetchSession).mockResolvedValue({
      ...hrdSession,
      mustChangePassword: true,
    });
    renderAt('/karyawan');

    expect(await screen.findByTestId('first-login')).toBeInTheDocument();

    await user.click(screen.getByTestId('lang-toggle'));

    expect(screen.getByText('First sign-in')).toBeInTheDocument();
    expect(screen.queryByText(id['firstLogin.title'])).not.toBeInTheDocument();
    expect(window.localStorage.getItem('lang')).toBe('en');
  });

  it('switches the access-denied screen to English immediately', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.fetchSession).mockResolvedValue(employeeSession);
    renderAt('/karyawan');

    await screen.findByTestId('access-denied-state');

    await user.click(screen.getByTestId('lang-toggle'));

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(
      screen.queryByText(id['route.denied.employeeTitle']),
    ).not.toBeInTheDocument();
  });

  it('offers the toggle while the session is still being probed', () => {
    vi.mocked(authService.fetchSession).mockReturnValue(new Promise(() => {}));
    renderAt('/karyawan');

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByTestId('lang-toggle')).toBeInTheDocument();
  });

  it('offers the toggle inside the shell of every protected route', async () => {
    vi.mocked(authService.fetchSession).mockResolvedValue(hrdSession);
    for (const route of protectedRoutes) {
      const path = (route.path ?? '/').replace(':id', '99');
      const view = renderAt(path);
      expect(
        await screen.findByTestId('nav-desktop'),
        `shell missing on ${path}`,
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('lang-toggle'),
        `toggle missing on ${path}`,
      ).toBeInTheDocument();
      view.unmount();
    }
  });
});
