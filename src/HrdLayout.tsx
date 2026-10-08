import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { AlertBanner } from './components';
import type { DictKey } from './i18n/id';
import { LanguageToggle, useI18n } from './i18n/provider';

/** Navigation targets; labels are resolved through the i18n dictionary. */
export const navItems: readonly { to: string; labelKey: DictKey }[] = [
  { to: '/karyawan', labelKey: 'nav.karyawan' },
  { to: '/absensi', labelKey: 'nav.absensi' },
];

const navLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  [
    'flex min-h-[44px] items-center px-4 text-sm font-medium transition-colors',
    isActive
      ? 'bg-blue-50 text-blue-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  ].join(' ');

/**
 * Shell for the HRD admin area: header, navigation and the alert-banner
 * strip rendered above the routed page content.
 */
export default function HrdLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-2">
          <span className="flex min-h-[44px] items-center px-2 text-lg font-semibold">
            {t('shell.appName')}
          </span>

          <nav
            data-testid="nav-desktop"
            aria-label={t('shell.navLabel')}
            className="hidden md:flex md:items-center"
          >
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center">
            <LanguageToggle />
            <button
              type="button"
              data-testid="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="nav-mobile"
              aria-label={menuOpen ? t('shell.closeMenu') : t('shell.openMenu')}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded md:hidden"
            >
              <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="nav-mobile"
            data-testid="nav-mobile"
            aria-label={t('shell.navLabel')}
            className="flex flex-col border-t border-gray-200 md:hidden"
          >
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Full-width strip right below the header: on phones the banners sit
          above the page content, on desktop they span the top of the console.
          Banners live in normal document flow, so navigation and page content
          stay clickable underneath them. */}
      <div data-testid="banner-region" className="w-full">
        <AlertBanner />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
