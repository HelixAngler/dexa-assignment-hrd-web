import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { I18nProvider } from '../i18n/provider';

function renderAt(path: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('route table', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('redirects the site root to the Karyawan list', async () => {
    renderAt('/');
    expect(await screen.findByTestId('karyawan-list')).toBeTruthy();
  });

  it('renders the login page at /login outside the shell', async () => {
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
  });

  it('sends unknown paths to the Karyawan list', async () => {
    renderAt('/tidak-ada');
    expect(await screen.findByTestId('karyawan-list')).toBeTruthy();
  });
});
