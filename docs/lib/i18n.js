import en from '../i18n/en.json' with { type: 'json' };
import zh from '../i18n/zh.json' with { type: 'json' };

const DICTIONARIES = { en, zh };
const SUPPORTED_LANGS = new Set(['en', 'zh']);

export function normalizeLang(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  const [base] = raw.trim().toLowerCase().split(/[-_]/);
  return SUPPORTED_LANGS.has(base) ? base : null;
}

function readCookie(name) {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function getLang() {
  if (typeof window !== 'undefined') {
    const queryLang = normalizeLang(new URLSearchParams(window.location.search).get('lang'));
    if (queryLang) {
      return queryLang;
    }
  }

  const cookieLang = normalizeLang(readCookie('lang'));
  if (cookieLang) {
    return cookieLang;
  }

  if (typeof document !== 'undefined') {
    const htmlLang = normalizeLang(document.documentElement?.lang);
    if (htmlLang) {
      return htmlLang;
    }
  }

  if (typeof navigator !== 'undefined') {
    const browserLang = normalizeLang(navigator.language);
    if (browserLang) {
      return browserLang;
    }
  }

  return 'en';
}

export function setLang(code) {
  const lang = normalizeLang(code) ?? 'en';

  if (typeof document !== 'undefined') {
    document.cookie = `lang=${encodeURIComponent(lang)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);

    if (typeof window.location.assign === 'function') {
      window.location.assign(url.toString());
    } else {
      window.location.href = url.toString();
    }
  }

  return lang;
}

function lookup(lang, key) {
  return DICTIONARIES[lang]?.[key] ?? DICTIONARIES.en[key] ?? null;
}

export function t(key) {
  const value = lookup(getLang(), key);

  if (typeof value === 'string') {
    return value;
  }

  console.warn(`[i18n] Missing key: ${key}`);
  return key;
}

export function formatMessage(key, values = {}) {
  return t(key).replace(/\{(\w+)\}/g, (_, token) => {
    if (Object.prototype.hasOwnProperty.call(values, token)) {
      return String(values[token]);
    }

    return `{${token}}`;
  });
}

function parseAttrList(raw) {
  return raw
    .split(/[|,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function translateElement(element) {
  const key = element.getAttribute('data-i18n');
  const attrs = parseAttrList(element.getAttribute('data-i18n-attr') ?? '');

  if (!key) {
    return;
  }

  const translated = t(key);

  if (attrs.length === 0) {
    if (element.getAttribute('data-i18n-html') === 'true') {
      element.innerHTML = translated;
    } else {
      element.textContent = translated;
    }
  }

  attrs.forEach((attr) => {
    element.setAttribute(attr, translated);
  });
}

export function applyTo(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return;
  }

  const elements = [];
  if (typeof root.matches === 'function' && root.matches('[data-i18n]')) {
    elements.push(root);
  }

  elements.push(...root.querySelectorAll('[data-i18n]'));
  elements.forEach(translateElement);

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = getLang();
  }
}

export function attachLanguageSwitcher(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return;
  }

  const activeLang = getLang();
  root.querySelectorAll('[data-set-lang]').forEach((button) => {
    const buttonLang = normalizeLang(button.getAttribute('data-set-lang')) ?? 'en';

    if (button.getAttribute('data-i18n-bound') !== 'true') {
      button.addEventListener('click', () => {
        setLang(buttonLang);
      });
      button.setAttribute('data-i18n-bound', 'true');
    }

    const isActive = buttonLang === activeLang;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

export function initPage({ titleKey, descriptionKey } = {}) {
  if (typeof document !== 'undefined') {
    if (titleKey) {
      document.title = t(titleKey);
    }

    if (descriptionKey) {
      const description = document.querySelector('meta[name="description"]');
      if (description) {
        description.setAttribute('content', t(descriptionKey));
      }
    }
  }

  applyTo(document);
  attachLanguageSwitcher(document);
}
