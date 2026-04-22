/**
 * Shared site header — single source of truth for all pages.
 * Imported as a side-effect module; injects the <header> element on load.
 */

const NAV_LINKS = [
  { href: './index.html', i18nKey: 'nav.index' },
  { href: './designer.html', i18nKey: 'nav.designer' },
  { href: './designer-v2.html', i18nKey: 'nav.designer_v2' },
  { href: './glossary.html', i18nKey: 'nav.glossary' },
];

function currentPageHref() {
  if (typeof location === 'undefined') return '';
  const path = location.pathname;
  const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  return `./${filename}`;
}

function buildHeader() {
  const header = document.createElement('header');
  const activeHref = currentPageHref();

  const titleLink = document.createElement('a');
  titleLink.href = './index.html';
  titleLink.className = 'site-title';
  titleLink.setAttribute('data-i18n', 'site.title');
  header.appendChild(titleLink);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Primary');
  nav.setAttribute('data-i18n', 'nav.primary');
  nav.setAttribute('data-i18n-attr', 'aria-label');

  const navRow = document.createElement('div');
  navRow.className = 'nav-row';

  const ul = document.createElement('ul');
  for (const link of NAV_LINKS) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.href;
    a.setAttribute('data-i18n', link.i18nKey);
    if (link.href === activeHref) {
      a.setAttribute('aria-current', 'page');
    }
    li.appendChild(a);
    ul.appendChild(li);
  }
  navRow.appendChild(ul);

  const controls = document.createElement('div');
  controls.className = 'nav-controls';
  controls.innerHTML = `
    <div class="theme-switcher">
      <span class="theme-switcher-label" data-i18n="theme.label"></span>
      <button type="button" class="theme-toggle" data-theme-toggle></button>
    </div>
    <div class="lang-switcher" data-i18n="nav.language_switcher" data-i18n-attr="aria-label">
      <button type="button" data-set-lang="en" data-i18n="lang.english"></button>
      <span class="lang-switcher-separator">|</span>
      <button type="button" data-set-lang="zh" data-i18n="lang.chinese"></button>
    </div>`;
  navRow.appendChild(controls);

  nav.appendChild(navRow);
  header.appendChild(nav);

  return header;
}

export function injectSiteHeader() {
  if (typeof document === 'undefined') return;

  const existing = document.querySelector('header');
  if (existing) return;

  const header = buildHeader();
  const body = document.body;
  if (body) {
    body.prepend(header);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSiteHeader, { once: true });
  } else {
    injectSiteHeader();
  }
}
