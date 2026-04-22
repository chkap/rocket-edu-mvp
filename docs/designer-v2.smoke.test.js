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
    });

    altitudeInput.value = '2000';
    altitudeInput.dispatchEvent(new Event('input', { bubbles: true }));

    await waitFor(() => {
      expect(document.getElementById('mission-target-preview')?.textContent).toContain('10.3');
    });
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
    const glossaryTooltip = document.getElementById('glossary-delta-v');

    expect(glossaryTrigger).not.toBeNull();
    expect(glossaryItem).not.toBeNull();
    expect(glossaryTooltip).not.toBeNull();
    expect(document.querySelectorAll('[data-glossary-item]')).toHaveLength(13);

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

  it('toggles compare mode and updates the comparison row from pane summaries', async () => {
    await loadDesignerV2Page();

    const compareToggle = document.getElementById('compare-mode-toggle');
    const compareExit = document.getElementById('compare-mode-exit');
    const comparePaneA = document.getElementById('compare-pane-a');
    const comparePaneB = document.getElementById('compare-pane-b');
    const compareSection = document.getElementById('designer-v2-compare');
    const singleSection = document.getElementById('designer-v2-single');

    expect(compareToggle).not.toBeNull();
    expect(compareExit).not.toBeNull();
    expect(comparePaneA).not.toBeNull();
    expect(comparePaneB).not.toBeNull();
    expect(compareSection).not.toBeNull();
    expect(singleSection).not.toBeNull();

    compareToggle.click();

    await waitFor(() => {
      expect(compareSection.hidden).toBe(false);
      expect(singleSection.hidden).toBe(true);
      expect(comparePaneA.src).toContain('embed=1');
      expect(comparePaneA.src).toContain('pane=A');
      expect(comparePaneB.src).toContain('pane=B');
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'designer-v2-compare-summary',
          summary: { pane: 'A', dvKms: 9.5, launchMassKg: 550000, verdict: 'LEO' },
        },
      })
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'designer-v2-compare-summary',
          summary: { pane: 'B', dvKms: 10.2, launchMassKg: 510000, verdict: 'GTO' },
        },
      })
    );

    await waitFor(() => {
      const compareCards = document.getElementById('compare-summary-cards');
      expect(compareCards?.textContent).toContain('B leads by 0.7 km/s');
      expect(compareCards?.textContent).toContain('A: 9.5 km/s');
      expect(compareCards?.textContent).toContain('B: 10.2 km/s');
    });

    compareExit.click();

    await waitFor(() => {
      expect(compareSection.hidden).toBe(true);
      expect(singleSection.hidden).toBe(false);
    });
  });
});
