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

async function loadDesignerV2Page() {
  const html = await fs.readFile(htmlPath, 'utf8');

  document.open();
  document.write(html);
  document.close();
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
});
