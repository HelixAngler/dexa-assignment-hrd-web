import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en as enDict } from './en';
import { id as idDict, type DictKey } from './id';

/** Supported UI languages. Indonesian is the product default. */
export type Lang = 'id' | 'en';

/** Language used before the user ever picks one. */
export const DEFAULT_LANG: Lang = 'id';

/** `localStorage` key under which the chosen language is persisted. */
export const LANG_STORAGE_KEY = 'lang';

/** Endonyms shown on the toggle button; the target language is one click away. */
const LANG_CODES: Record<Lang, string> = { id: 'ID', en: 'EN' };

const dictionaries: Record<Lang, Record<DictKey, string>> = {
  id: idDict,
  en: enDict,
};

export interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: DictKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Reads the persisted language; falls back to the default when absent or invalid. */
function readStoredLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return stored === 'id' || stored === 'en' ? stored : DEFAULT_LANG;
  } catch {
    // Storage may be unavailable (private mode, disabled cookies).
    return DEFAULT_LANG;
  }
}

function persistLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage may be unavailable (private mode, disabled cookies).
  }
}

export interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Owns the active language for the whole app. The value is read from
 * `localStorage` on the first render and written back on every change, so a
 * reload keeps the previous choice.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persistLang(next);
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === 'id' ? 'en' : 'id');
  }, [lang, setLang]);

  const t = useCallback(
    (key: DictKey) => dictionaries[lang][key],
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access the active language, `setLang`, `toggle` and the `t()` translator. */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value === null) {
    throw new Error('useI18n must be used inside <I18nProvider>.');
  }
  return value;
}

/**
 * Compact language switcher for the app chrome. It renders the language it
 * switches to and carries an accessible name from the active dictionary.
 */
export function LanguageToggle() {
  const { lang, toggle, t } = useI18n();
  const target: Lang = lang === 'id' ? 'en' : 'id';

  return (
    <button
      type="button"
      data-testid="lang-toggle"
      aria-label={t('shell.toggleLanguage')}
      title={t('shell.toggleLanguage')}
      onClick={toggle}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm font-semibold text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      {LANG_CODES[target]}
    </button>
  );
}
