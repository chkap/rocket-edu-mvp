/* @vitest-environment jsdom */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import catalog from './data/engines.json' with { type: 'json' };

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(docsDir, 'designer-v2.html');
const moduleUrl = pathToFileURL(path.join(docsDir, 'designer-v2.js')).href;

async function waitFor(check, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      return check();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  throw lastError ?? new Error('Timed out waiting for smoke test condition.');
}

async function loadDesignerV2Page({ hash = '' } = {}) {
  const html = await fs.readFile(htmlPath, 'utf8');

  document.open();
  document.write(html);
  document.close();
  window.history.replaceState({}, '', hash || window.location.pathname || '/');

  if (!navigator.clipboard) {
    navigator.clipboard = {
      writeText: vi.fn(async () => {}),
    };
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) => {
      if (String(input).includes('data/engines.json')) {
        return new Response(JSON.stringify(catalog), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      return new Response('', { status: 404 });
    })
  );

  await import(`${moduleUrl}?t=${Date.now()}`);

  await waitFor(() => {
    const presetSelect = document.getElementById('preset-select');
    expect(presetSelect).not.toBeNull();
    expect(presetSelect.options.length).toBeGreaterThan(1);
  });
}

describe('designer-v2 smoke flow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads Falcon 9, runs Analyze, and shows a LEO verdict within the expected delta-v band', async () => {
    await loadDesignerV2Page();

    const presetSelect = document.getElementById('preset-select');
    const analyzeButton = document.getElementById('analyze-button');
    const themeToggle = document.querySelector('[data-theme-toggle]');

    expect(presetSelect).not.toBeNull();
    expect(analyzeButton).not.toBeNull();
    expect(themeToggle).not.toBeNull();

    presetSelect.value = 'falcon9';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    themeToggle.click();
    analyzeButton.click();

    await waitFor(() => {
      expect(document.getElementById('verdict-pill')?.textContent).toContain('LEO');
      expect(document.getElementById('summary-status')?.textContent).toContain('Ready');
      expect(document.getElementById('total-dv')?.textContent).not.toBe('—');
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('rocket-theme')).toBe('dark');
    expect(presetSelect.value).toBe('falcon9');

    const totalDvText = document.getElementById('total-dv')?.textContent ?? '';
    const totalDv = Number(totalDvText.replace(/[^\d.]/g, ''));

    expect(totalDv).toBeGreaterThanOrEqual(9.4);
    expect(totalDv).toBeLessThanOrEqual(9.6);

    const totalDvEl = document.getElementById('total-dv');
    const unitSpan = totalDvEl?.querySelector('.designer-v2-total-unit');
    expect(unitSpan).not.toBeNull();
    expect(unitSpan?.textContent).toContain('km/s');
  });

  it('quick-loads named presets and switches back to Custom after edits', async () => {
    await loadDesignerV2Page();

    const quickLoadSaturn = document.querySelector('[data-preset-load="saturnV"]');
    const presetSelect = document.getElementById('preset-select');

    expect(quickLoadSaturn).not.toBeNull();
    expect(presetSelect).not.toBeNull();

    quickLoadSaturn.click();

    await waitFor(() => {
      expect(document.querySelectorAll('#stage-list [data-stage-index]')).toHaveLength(3);
      expect(document.getElementById('verdict-pill')?.textContent).not.toContain('Suborbital');
    });

    const quickLoadLongMarch = document.querySelector('[data-preset-load="longMarch5"]');
    expect(quickLoadLongMarch).not.toBeNull();
    quickLoadLongMarch.click();

    await waitFor(() => {
      expect(document.getElementById('booster-count')?.value).toBe('4');
      expect(document.getElementById('verdict-pill')?.textContent).toContain('LEO');
    });

    const payloadInput = document.getElementById('payload-mass');
    expect(payloadInput).not.toBeNull();
    payloadInput.value = '70000';
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));

    await waitFor(() => {
      expect(presetSelect.value).toBe('custom');
    });
  });

  it('updates the mission requirement from quick-picks and custom orbit altitude', async () => {
    await loadDesignerV2Page();

    const presetSelect = document.getElementById('preset-select');
    const altitudeInput = document.getElementById('target-orbit-altitude');

    expect(presetSelect).not.toBeNull();
    expect(altitudeInput).not.toBeNull();

    presetSelect.value = 'falcon9';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(document.getElementById('mission-target')?.textContent).toContain('Target met');
      expect(document.getElementById('mission-target')?.textContent).toContain('9.4');
    });

    const geoQuickPick = document.querySelector('[data-target-altitude="35786"]');
    expect(geoQuickPick).not.toBeNull();
    geoQuickPick.click();

    await waitFor(() => {
      expect(document.getElementById('target-orbit-altitude')?.value).toBe('35786');
      expect(document.getElementById('mission-target')?.textContent).toContain('Target missed');
      expect(document.getElementById('mission-target')?.textContent).toContain('13.3');
      expect(document.querySelector('[data-mission-legend-id="geo"]')?.classList.contains('is-target')).toBe(true);
    });

    altitudeInput.value = '2000';
    altitudeInput.dispatchEvent(new Event('input', { bubbles: true }));

    await waitFor(() => {
      expect(document.getElementById('mission-target-preview')?.textContent).toContain('10.3');
    });

    const missionLegend = document.querySelectorAll('[data-mission-legend-id]');
    expect(missionLegend).toHaveLength(6);
    expect(document.querySelector('[data-mission-legend-id="geo"]')?.textContent).toContain('GEO');
    expect(document.querySelector('[data-mission-legend-id="geo"]')?.textContent).toContain('13.3');
    expect(document.querySelector('[data-mission-legend-id="gto"]')?.textContent).toContain('GTO');
    expect(document.querySelector('[data-mission-legend-id="gto"]')?.textContent).toContain('11.8');
    expect(document.querySelector('[data-mission-legend-id="tli"]')?.textContent).toContain('TLI');
    expect(document.querySelector('[data-mission-legend-id="tli"]')?.textContent).toContain('12.4');
    expect(document.querySelector('[data-mission-legend-id="meo"]')?.classList.contains('is-target')).toBe(true);
  });

  it('shows a live why-this-verdict budget with stage rows, gravity loss, and the target requirement', async () => {
    await loadDesignerV2Page();

    const presetSelect = document.getElementById('preset-select');
    const explainer = document.getElementById('verdict-explainer');
    const altitudeInput = document.getElementById('target-orbit-altitude');

    expect(presetSelect).not.toBeNull();
    expect(explainer).not.toBeNull();
    expect(altitudeInput).not.toBeNull();

    presetSelect.value = 'falcon9';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(explainer.hidden).toBe(false);
      expect(explainer.querySelectorAll('[data-budget-kind="stage"]').length).toBe(2);
      expect(explainer.querySelectorAll('[data-budget-kind="loss"]').length).toBeGreaterThanOrEqual(1);
      expect(explainer.querySelector('[data-budget-kind="requirement"]')?.textContent).toContain('9.4');
      expect(explainer.textContent).toContain('Margin');
    });

    altitudeInput.value = '35786';
    altitudeInput.dispatchEvent(new Event('input', { bubbles: true }));

    await waitFor(() => {
      expect(explainer.querySelector('[data-budget-kind="requirement"]')?.textContent).toContain('13.3');
      expect(explainer.textContent).toContain('Shortfall');
    });
  });

  it('opens glossary tooltips on focus and closes them on Escape', async () => {
    await loadDesignerV2Page();

    const glossaryTrigger = document.querySelector('[data-glossary-trigger="delta-v"]');
    const glossaryItem = document.querySelector('[data-glossary-item="delta-v"]');
    const glossaryTooltip = glossaryItem?.querySelector('[role="tooltip"]');

    expect(glossaryTrigger).not.toBeNull();
    expect(glossaryItem).not.toBeNull();
    expect(glossaryTooltip).not.toBeNull();
    expect(document.querySelectorAll('#glossary-list [data-glossary-item]')).toHaveLength(22);

    glossaryTrigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    await waitFor(() => {
      expect(glossaryItem.classList.contains('is-open')).toBe(true);
      expect(glossaryTooltip.hasAttribute('hidden')).toBe(false);
      expect(glossaryTooltip.textContent).toContain('velocity');
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await waitFor(() => {
      expect(glossaryItem.classList.contains('is-open')).toBe(false);
      expect(glossaryTooltip.hasAttribute('hidden')).toBe(true);
    });
  });

  it('renders glossary trigger labels as translated text, not raw i18n keys', async () => {
    await loadDesignerV2Page();

    const triggers = document.querySelectorAll('#glossary-list [data-glossary-trigger]');
    expect(triggers.length).toBeGreaterThan(0);

    for (const trigger of triggers) {
      const text = trigger.textContent.trim();
      expect(text).not.toMatch(/^designer_v2\./);
    }
  });

  it('wires glossary tooltips into mission chips, verdict text, and live metric labels', async () => {
    await loadDesignerV2Page();

    const presetSelect = document.getElementById('preset-select');
    expect(presetSelect).not.toBeNull();

    presetSelect.value = 'falcon9';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(document.querySelector('[data-target-altitude="200"][data-glossary-trigger="orbit-leo"]')).not.toBeNull();
      expect(document.querySelector('#verdict-pill [data-glossary-trigger="orbit-leo"]')).not.toBeNull();
      expect(document.querySelector('#stage-0-metrics [data-glossary-trigger="delta-v"]')).not.toBeNull();
      expect(document.querySelector('[data-engine-panel="merlin_1d"] [data-glossary-trigger="sea-level-isp"]')).not.toBeNull();
    });

    const missionChipGlossary = document.querySelector(
      '[data-target-altitude="35786"][data-glossary-trigger="orbit-geo"]'
    );
    expect(missionChipGlossary).not.toBeNull();
    missionChipGlossary.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    await waitFor(() => {
      const tooltip = missionChipGlossary.closest('[data-glossary-item]')?.querySelector('[role="tooltip"]');
      expect(tooltip).not.toBeNull();
      expect(tooltip?.hasAttribute('hidden')).toBe(false);
      expect(tooltip?.textContent).toContain('Geostationary');
    });
  });

  it('copies a share link and restores the encoded design from the URL fragment', async () => {
    const clipboardWrite = vi.fn(async () => {});
    navigator.clipboard = { writeText: clipboardWrite };

    await loadDesignerV2Page();

    const presetSelect = document.getElementById('preset-select');
    const copyButton = document.getElementById('copy-share-link');

    expect(presetSelect).not.toBeNull();
    expect(copyButton).not.toBeNull();

    presetSelect.value = 'longMarch5';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const payloadInput = document.getElementById('payload-mass');
    const targetOrbitInput = document.getElementById('target-orbit-altitude');
    const boosterCountInput = document.getElementById('booster-count');

    expect(payloadInput).not.toBeNull();
    expect(targetOrbitInput).not.toBeNull();
    expect(boosterCountInput).not.toBeNull();

    payloadInput.value = '12345';
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));
    targetOrbitInput.value = '2000';
    targetOrbitInput.dispatchEvent(new Event('input', { bubbles: true }));
    boosterCountInput.value = '3';
    boosterCountInput.dispatchEvent(new Event('input', { bubbles: true }));

    await waitFor(() => {
      expect(document.getElementById('preset-select')?.value).toBe('custom');
      expect(window.location.hash).toContain('#d=');
    });

    copyButton.click();

    await waitFor(() => {
      expect(clipboardWrite).toHaveBeenCalledTimes(1);
    });

    const copiedUrl = clipboardWrite.mock.calls[0][0];
    expect(copiedUrl).toContain('#d=');

    vi.resetModules();
    await loadDesignerV2Page({ hash: new URL(copiedUrl).hash });

    await waitFor(() => {
      expect(document.getElementById('payload-mass')?.value).toBe('12345');
      expect(document.getElementById('target-orbit-altitude')?.value).toBe('2000');
      expect(document.getElementById('booster-count')?.value).toBe('3');
      expect(document.getElementById('share-status')?.textContent).toContain('restored');
    });
  });

  it('renders a live rocket silhouette that reacts to stage and booster changes', async () => {
    await loadDesignerV2Page();

    const silhouette = document.getElementById('rocket-silhouette');
    const addStageButton = document.getElementById('add-stage');
    const presetSelect = document.getElementById('preset-select');

    expect(silhouette).not.toBeNull();
    expect(addStageButton).not.toBeNull();
    expect(presetSelect).not.toBeNull();

    await waitFor(() => {
      expect(silhouette.querySelector('svg')).not.toBeNull();
      expect(silhouette.querySelector('svg')?.getAttribute('data-stage-count')).toBe('1');
      expect(silhouette.querySelector('svg')?.getAttribute('data-booster-count')).toBe('0');
    });

    addStageButton.click();

    await waitFor(() => {
      expect(silhouette.querySelector('svg')?.getAttribute('data-stage-count')).toBe('2');
    });

    presetSelect.value = 'longMarch5';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(silhouette.querySelector('svg')?.getAttribute('data-stage-count')).toBe('2');
      expect(silhouette.querySelector('svg')?.getAttribute('data-booster-count')).toBe('4');
      expect(silhouette.querySelectorAll('.designer-v2-silhouette-booster').length).toBeGreaterThan(0);
    });
  });

  it('updates the engine spotlight card when the selected engine changes', async () => {
    await loadDesignerV2Page();

    const stageEngine = document.getElementById('stage-0-engine');
    expect(stageEngine).not.toBeNull();

    await waitFor(() => {
      expect(document.querySelector('[data-engine-panel="merlin_1d"]')).not.toBeNull();
      expect(document.querySelector('[data-engine-panel="merlin_1d"]')?.textContent).toContain('845 kN');
      expect(document.querySelector('[data-engine-panel="merlin_1d"]')?.textContent).toContain('RP-1 / LOX');
    });

    stageEngine.value = 'raptor_2';
    stageEngine.dispatchEvent(new Event('input', { bubbles: true }));

    await waitFor(() => {
      expect(document.querySelector('[data-engine-panel="raptor_2"]')).not.toBeNull();
      expect(document.querySelector('[data-engine-panel="raptor_2"]')?.textContent).toContain('2,260 kN');
      expect(document.querySelector('[data-engine-panel="raptor_2"]')?.textContent).toContain('Methane / LOX');
    });
  });

  it('shows "Sea-level data not applicable" for vacuum-only engines instead of dashes', async () => {
    await loadDesignerV2Page();

    // Falcon 9 preset gives us a 2-stage rocket with merlin_vac on stage 1
    const presetSelect = document.getElementById('preset-select');
    presetSelect.value = 'falcon9';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      const panel = document.querySelector('[data-engine-panel="merlin_vac"]');
      expect(panel).not.toBeNull();
      expect(panel?.textContent).toContain('Sea-level data not applicable');
      expect(panel?.querySelector('.designer-v2-engine-stats-note')).not.toBeNull();
    });
  });

  it('renders booster heading as one clean string without stray trailing characters', async () => {
    await loadDesignerV2Page();

    const boosterTitle = document.getElementById('booster-title');
    expect(boosterTitle).not.toBeNull();
    const trigger = boosterTitle.querySelector('[data-glossary-trigger="booster"]');
    expect(trigger).not.toBeNull();
    expect(trigger.textContent.trim()).toBe('Boosters');
    // No stray text nodes outside the glossary item
    const glossaryItem = boosterTitle.querySelector('[data-glossary-item="booster"]');
    const siblingText = Array.from(boosterTitle.childNodes)
      .filter((n) => n !== glossaryItem && n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('');
    expect(siblingText).toBe('');
  });

  it('renders the header bar with H1, nav, theme toggle, and language toggle', async () => {
    await loadDesignerV2Page();

    const header = document.querySelector('header');
    expect(header).not.toBeNull();

    const h1 = header.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1.textContent.length).toBeGreaterThan(0);

    const navRow = header.querySelector('.nav-row');
    expect(navRow).not.toBeNull();

    const navLinks = navRow.querySelectorAll('nav ul a, ul a');
    expect(navLinks.length).toBeGreaterThanOrEqual(2);

    const themeToggle = header.querySelector('[data-theme-toggle]');
    expect(themeToggle).not.toBeNull();
    expect(themeToggle.classList.contains('is-active')).toBe(true);

    const langSwitcher = header.querySelector('.lang-switcher');
    expect(langSwitcher).not.toBeNull();
    const langButtons = langSwitcher.querySelectorAll('button');
    expect(langButtons.length).toBe(2);

    const navControls = header.querySelector('.nav-controls');
    expect(navControls).not.toBeNull();
    expect(navControls.querySelector('.theme-switcher')).not.toBeNull();
    expect(navControls.querySelector('.lang-switcher')).not.toBeNull();
  });

  it('includes accessible focus and contrast CSS rules', async () => {
    const cssPath = path.join(docsDir, 'style.css');
    const css = await fs.readFile(cssPath, 'utf-8');

    // Focus ring defined for interactive elements
    expect(css).toContain('a:focus-visible');
    expect(css).toContain('button:focus-visible');
    expect(css).toContain('select:focus-visible');
    expect(css).toContain('outline: 3px solid var(--focus)');

    // Dark theme overrides focus color for visibility
    expect(css).toMatch(/\[data-theme=['"]dark['"]\][\s\S]*--focus:\s*#fbbf24/);

    // Footer links have explicit styling
    expect(css).toContain('footer a');

    // Display math has centered block styling
    expect(css).toContain("math[display='block']");
  });

});
