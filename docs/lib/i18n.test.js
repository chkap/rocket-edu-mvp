import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyTo,
  attachLanguageSwitcher,
  attachThemeToggle,
  formatMessage,
  getLang,
  getTheme,
  initPage,
  normalizeLang,
  normalizeTheme,
  setLang,
  setTheme,
  t,
} from './i18n.js';

function installGlobals({
  href = 'https://example.test/index.html',
  cookie = '',
  htmlLang = 'en',
  navigatorLanguage = 'en-US',
  storedTheme = null,
  prefersDark = false,
} = {}) {
  const state = {
    cookie,
    assignedUrl: null,
    theme: storedTheme,
  };

  const documentElementAttributes = new Map();
  const documentElement = {
    lang: htmlLang,
    getAttribute(name) {
      if (name === 'lang') {
        return this.lang;
      }

      return documentElementAttributes.has(name) ? documentElementAttributes.get(name) : null;
    },
    setAttribute(name, value) {
      if (name === 'lang') {
        this.lang = String(value);
        return;
      }

      documentElementAttributes.set(name, String(value));
    },
  };

  const document = {
    documentElement,
    title: '',
    querySelector(selector) {
      if (selector === 'meta[name="description"]') {
        return this._description ?? null;
      }

      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  document._description = {
    value: '',
    setAttribute(name, value) {
      if (name === 'content') {
        this.value = value;
      }
    },
  };

  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get() {
      return state.cookie;
    },
    set(value) {
      state.cookie = value;
    },
  });

  const location = {
    href,
    get search() {
      return new URL(this.href).search;
    },
    assign(url) {
      state.assignedUrl = url;
      this.href = url;
    },
  };

  const window = {
    location,
    localStorage: {
      getItem(key) {
        if (key !== 'rocket-theme') {
          return null;
        }

        return state.theme;
      },
      setItem(key, value) {
        if (key === 'rocket-theme') {
          state.theme = String(value);
        }
      },
    },
    matchMedia(query) {
      return {
        matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
        media: query,
      };
    },
  };
  const navigator = { language: navigatorLanguage };

  vi.stubGlobal('document', document);
  vi.stubGlobal('window', window);
  vi.stubGlobal('navigator', navigator);

  return { state, document, window };
}

function makeElement({ key, attr, html = false } = {}) {
  const attributes = new Map();
  const listeners = new Map();
  const element = {
    textContent: '',
    innerHTML: '',
    classList: {
      values: new Set(),
      toggle(className, force) {
        if (force) {
          this.values.add(className);
        } else {
          this.values.delete(className);
        }
      },
      contains(className) {
        return this.values.has(className);
      },
    },
    addEventListener(eventName, handler) {
      listeners.set(eventName, handler);
    },
    click() {
      listeners.get('click')?.();
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    querySelectorAll() {
      return [];
    },
    matches(selector) {
      return selector === '[data-i18n]' ? attributes.has('data-i18n') : false;
    },
  };

  if (key) {
    element.setAttribute('data-i18n', key);
  }

  if (attr) {
    element.setAttribute('data-i18n-attr', attr);
  }

  if (html) {
    element.setAttribute('data-i18n-html', 'true');
  }

  return element;
}

function makeRoot(elements) {
  return {
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') {
        return elements.filter((element) => element.getAttribute('data-i18n'));
      }

      if (selector === '[data-set-lang]') {
        return elements.filter((element) => element.getAttribute('data-set-lang'));
      }

      if (selector === '[data-theme-toggle]') {
        return elements.filter((element) => element.getAttribute('data-theme-toggle') !== null);
      }

      return [];
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('normalizeLang', () => {
  it('normalizes supported language codes', () => {
    expect(normalizeLang('zh-CN')).toBe('zh');
    expect(normalizeLang('EN')).toBe('en');
    expect(normalizeLang('fr')).toBeNull();
  });
});

describe('normalizeTheme', () => {
  it('normalizes supported theme values', () => {
    expect(normalizeTheme(' DARK ')).toBe('dark');
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('solarized')).toBeNull();
  });
});

describe('getLang', () => {
  it('prefers the query string over cookie and html lang', () => {
    installGlobals({
      href: 'https://example.test/index.html?lang=zh',
      cookie: 'lang=en',
      htmlLang: 'en',
    });

    expect(getLang()).toBe('zh');
  });

  it('falls back to the cookie when no query string exists', () => {
    installGlobals({
      href: 'https://example.test/index.html',
      cookie: 'lang=zh',
      htmlLang: 'en',
    });

    expect(getLang()).toBe('zh');
  });
});

describe('setLang', () => {
  it('stores the cookie and reloads with an updated lang query', () => {
    const { state } = installGlobals({
      href: 'https://example.test/designer.html?foo=1',
    });

    setLang('zh');

    expect(state.cookie).toContain('lang=zh');
    expect(state.assignedUrl).toBe('https://example.test/designer.html?foo=1&lang=zh');
  });
});

describe('getTheme', () => {
  it('prefers stored theme values and falls back to system preference', () => {
    installGlobals({
      storedTheme: 'dark',
      prefersDark: false,
    });

    expect(getTheme()).toBe('dark');

    installGlobals({
      storedTheme: null,
      prefersDark: true,
    });

    expect(getTheme()).toBe('dark');
  });
});

describe('setTheme', () => {
  it('stores the theme and updates the document theme attribute', () => {
    const { state, document } = installGlobals();

    setTheme('dark');

    expect(state.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('t and formatMessage', () => {
  it('returns translated strings and interpolates placeholders', () => {
    installGlobals({
      href: 'https://example.test/index.html?lang=zh',
    });

    expect(t('nav.designer_v2')).toBe('火箭设计器 v2');
    expect(t('designer_v2.structural.fixed')).toBe('固定质量模型');
    expect(formatMessage('designer.stage.count.other', { count: 3 })).toBe('3 级');
  });

  it('warns and echoes the key when the translation is missing', () => {
    installGlobals();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(t('missing.key')).toBe('missing.key');
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('initPage', () => {
  it('updates the title and meta description before applying translations', () => {
    const { document } = installGlobals({
      href: 'https://example.test/index.html?lang=zh',
      storedTheme: 'dark',
    });

    initPage({
      titleKey: 'page.index.title',
      descriptionKey: 'page.index.description',
    });

    expect(document.title).toBe('火箭方程计算器 - 学习齐奥尔科夫斯基火箭方程');
    expect(document._description.value).toBe('通过简单计算器、解释和示例学习并探索齐奥尔科夫斯基火箭方程。');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('applyTo', () => {
  it('translates text, html, and attributes', () => {
    const { document } = installGlobals({
      href: 'https://example.test/index.html?lang=zh',
    });

    const textNode = makeElement({ key: 'nav.index' });
    const htmlNode = makeElement({ key: 'index.footer.prefix', html: true });
    const attrNode = makeElement({ key: 'nav.primary', attr: 'aria-label|title' });
    const root = makeRoot([textNode, htmlNode, attrNode]);

    applyTo(root);

    expect(textNode.textContent).toBe('公式指南');
    expect(htmlNode.innerHTML).toContain('火箭方程');
    expect(attrNode.getAttribute('aria-label')).toBe('主导航');
    expect(attrNode.getAttribute('title')).toBe('主导航');
    expect(document.documentElement.lang).toBe('zh');
  });
});

describe('attachLanguageSwitcher', () => {
  it('binds click handlers and marks the active language', () => {
    const { state } = installGlobals({
      href: 'https://example.test/designer-v2.html?lang=en',
    });

    const enButton = makeElement();
    enButton.setAttribute('data-set-lang', 'en');

    const zhButton = makeElement();
    zhButton.setAttribute('data-set-lang', 'zh');

    const root = makeRoot([enButton, zhButton]);
    attachLanguageSwitcher(root);

    expect(enButton.classList.contains('is-active')).toBe(true);
    expect(zhButton.classList.contains('is-active')).toBe(false);

    zhButton.click();
    expect(state.assignedUrl).toBe('https://example.test/designer-v2.html?lang=zh');
  });
});

describe('attachThemeToggle', () => {
  it('binds click handlers, updates labels, and persists the chosen theme', () => {
    const { state } = installGlobals({
      href: 'https://example.test/designer-v2.html?lang=en',
      storedTheme: 'light',
    });

    const toggleButton = makeElement();
    toggleButton.setAttribute('data-theme-toggle', '');

    const root = makeRoot([toggleButton]);
    attachThemeToggle(root);

    expect(toggleButton.textContent).toBe('Light');
    expect(toggleButton.getAttribute('aria-pressed')).toBe('false');

    toggleButton.click();

    expect(state.theme).toBe('dark');
    expect(toggleButton.textContent).toBe('Dark');
    expect(toggleButton.getAttribute('aria-pressed')).toBe('true');
    expect(toggleButton.getAttribute('aria-label')).toBe('Switch to light theme');
  });
});
