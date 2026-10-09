import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { AlertBanner } from './components';
import { CloseIcon, HamburgerIcon } from './components/icons';
import type { DictKey } from './i18n/id';
import { LanguageToggle, useI18n } from './i18n/provider';
import { useSession } from './services/session';

/** Navigation targets; labels are resolved through the i18n dictionary. */
export const navItems: readonly { to: string; labelKey: DictKey }[] = [
  { to: '/karyawan', labelKey: 'nav.karyawan' },
  { to: '/absensi', labelKey: 'nav.absensi' },
];

/** One nav item: 44 px target, primary-tinted active state, visible focus. */
const navLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  [
    'inline-flex min-h-[44px] items-center rounded-[var(--radius-sm)] px-[var(--space-md)] font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]',
    isActive
      ? 'bg-[var(--color-primary-subtle)] font-semibold text-[color:var(--color-primary)] shadow-[inset_0_-2px_0_var(--color-primary)]'
      : 'text-[color:var(--color-text)] hover:bg-[var(--color-page)] hover:text-[color:var(--color-primary)]',
  ].join(' ');

/**
 * Shell for the HRD admin area: header, navigation and the alert-banner
 * strip rendered above the routed page content.
 */
export default function HrdLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();
  const { logout } = useSession();

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[color:var(--color-text)]">
      <header className="border-b border-[color:var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-[var(--space-md)] px-[var(--space-lg)] py-[var(--space-sm)]">
          <span className="flex min-h-[44px] min-w-0 items-center break-words font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-lg)] [line-height:var(--text-lg-line-height)]">
            {t('shell.appName')}
          </span>

          <nav
            data-testid="nav-desktop"
            aria-label={t('shell.navLabel')}
            className="hidden items-center gap-[var(--space-xs)] md:flex"
          >
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-[var(--space-sm)]">
            <LanguageToggle />
            <button
              type="button"
              data-testid="shell-sign-out"
              onClick={() => void logout()}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-md)] border border-transparent px-[var(--space-md)] font-semibold text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-page)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            >
              {t('state.accessDenied.signOut')}
            </button>
            <button
              type="button"
              data-testid="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="nav-mobile"
              aria-label={menuOpen ? t('shell.closeMenu') : t('shell.openMenu')}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[color:var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] md:hidden"
            >
              {menuOpen ? <CloseIcon size={20} /> : <HamburgerIcon size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="nav-mobile"
            data-testid="nav-mobile"
            aria-label={t('shell.navLabel')}
            className="flex flex-col gap-[var(--space-xs)] border-t border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-lg)] py-[var(--space-sm)] shadow-[var(--shadow-raised)] md:hidden"
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

      <main className="mx-auto max-w-6xl px-[var(--space-lg)] py-[var(--space-xl)]">
        <Outlet />
      </main>
    </div>
  );
}
