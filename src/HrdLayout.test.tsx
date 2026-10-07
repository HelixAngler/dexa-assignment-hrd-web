import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { id } from './i18n/id';
import { I18nProvider } from './i18n/provider';
import HrdLayout from './HrdLayout';

function renderLayout() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/karyawan']}>
        <HrdLayout />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('HrdLayout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the shell with an empty banner region above the outlet', () => {
    renderLayout();

    const bannerRegion = screen.getByTestId('banner-region');
    expect(bannerRegion).toBeTruthy();
    expect(bannerRegion.children.length).toBe(0);
  });

  it('shows the Karyawan and Absensi links in the desktop navigation row', () => {
    renderLayout();

    const desktopNav = screen.getByTestId('nav-desktop');
    expect(
      within(desktopNav).getByRole('link', { name: id['nav.karyawan'] }),
    ).toBeTruthy();
    expect(
      within(desktopNav).getByRole('link', { name: id['nav.absensi'] }),
    ).toBeTruthy();
  });

  it('shows the navigation row, the app title and no mobile menu by default', () => {
    renderLayout();

    expect(screen.getByText(id['shell.appName'])).toBeTruthy();
    expect(screen.queryByTestId('nav-mobile')).toBeNull();

    const toggle = screen.getByTestId('nav-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens and closes the mobile menu from the hamburger button', async () => {
    const user = userEvent.setup();
    renderLayout();

    const toggle = screen.getByTestId('nav-toggle');

    await user.click(toggle);
    const mobileNav = screen.getByTestId('nav-mobile');
    expect(
      within(mobileNav).getByRole('link', { name: id['nav.karyawan'] }),
    ).toBeTruthy();
    expect(
      within(mobileNav).getByRole('link', { name: id['nav.absensi'] }),
    ).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    await user.click(toggle);
    expect(screen.queryByTestId('nav-mobile')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('switches the shell copy to English via the language toggle', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByTestId('lang-toggle'));

    expect(screen.getByText('HRD Attendance')).toBeTruthy();
    const desktopNav = screen.getByTestId('nav-desktop');
    expect(
      within(desktopNav).getByRole('link', { name: 'Employees' }),
    ).toBeTruthy();
    expect(
      within(desktopNav).getByRole('link', { name: 'Attendance' }),
    ).toBeTruthy();
    expect(window.localStorage.getItem('lang')).toBe('en');
  });
});
