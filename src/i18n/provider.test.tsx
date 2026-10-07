import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { id } from './id';
import { I18nProvider, LANG_STORAGE_KEY, useI18n } from './provider';

function Probe() {
  const { lang, setLang, toggle, t } = useI18n();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{t('shell.appName')}</span>
      <button type="button" data-testid="toggle" onClick={toggle}>
        toggle
      </button>
      <button type="button" data-testid="set-en" onClick={() => setLang('en')}>
        set en
      </button>
      <button type="button" data-testid="set-id" onClick={() => setLang('id')}>
        set id
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <I18nProvider>
      <Probe />
    </I18nProvider>,
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to Indonesian before anything is persisted', () => {
    renderProvider();

    expect(screen.getByTestId('lang')).toHaveTextContent('id');
    expect(screen.getByTestId('title')).toHaveTextContent(id['shell.appName']);
  });

  it('switches the rendered text when toggled', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByTestId('toggle'));

    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('title')).toHaveTextContent('HRD Attendance');

    await user.click(screen.getByTestId('toggle'));

    expect(screen.getByTestId('lang')).toHaveTextContent('id');
    expect(screen.getByTestId('title')).toHaveTextContent(id['shell.appName']);
  });

  it('persists an explicit setLang call to localStorage', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByTestId('set-en'));

    expect(screen.getByTestId('title')).toHaveTextContent('HRD Attendance');
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
  });

  it('persists the toggled language to localStorage', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByTestId('toggle'));

    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
  });

  it('restores the persisted language on the next render', () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'en');
    renderProvider();

    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('title')).toHaveTextContent('HRD Attendance');
  });

  it('falls back to Indonesian for an unknown stored value', () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'fr');
    renderProvider();

    expect(screen.getByTestId('lang')).toHaveTextContent('id');
    expect(screen.getByTestId('title')).toHaveTextContent(id['shell.appName']);
  });

  it('throws when the hook is used without a provider', () => {
    expect(() => renderHook(() => useI18n())).toThrow(/I18nProvider/);
  });
});
