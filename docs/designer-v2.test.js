import { describe, expect, it } from 'vitest';

import catalog from './data/engines.json' with { type: 'json' };
import { analyze } from './lib/designer_v2/physics.js';
import {
  buildShareUrl,
  defaultTankFractionForPropellant,
  decodeShareDraft,
  encodeShareDraft,
  MISSION_MARKERS,
  missionProgressPercent,
  reorderUpperStages,
  restoreSharedDraftFromHash,
  loadDraftFromPreset,
  buildAnalyzeConfig,
} from './designer-v2.js';

describe('designer-v2 helpers', () => {
  it('uses propellant-specific default tank fractions', () => {
    expect(defaultTankFractionForPropellant('RP1_LOX')).toBe(0.06);
    expect(defaultTankFractionForPropellant('CH4_LOX')).toBe(0.07);
    expect(defaultTankFractionForPropellant('LH2_LOX')).toBe(0.12);
  });

  it('keeps the first stage fixed when reordering upper stages', () => {
    const reordered = reorderUpperStages(
      [{ label: 'Stage 1' }, { label: 'Stage 2' }, { label: 'Stage 3' }],
      2,
      1
    );

    expect(reordered.map((stage) => stage.label)).toEqual(['Stage 1', 'Stage 3', 'Stage 2']);
    expect(reorderUpperStages(reordered, 0, 1)).toBe(reordered);
  });

  it('maps mission progress to the marker bar scale', () => {
    const maxThreshold = Math.max(...MISSION_MARKERS.map((m) => m.thresholdKmS));
    expect(missionProgressPercent(0)).toBe(0);
    expect(missionProgressPercent(maxThreshold)).toBe(100);
    expect(missionProgressPercent(maxThreshold * 2)).toBe(100);
    expect(missionProgressPercent(maxThreshold / 2)).toBeCloseTo(50, 1);
  });

  it('loads preset drafts into analyze-compatible configs', () => {
    const draft = loadDraftFromPreset('slsBlock1', catalog.engines);
    const config = buildAnalyzeConfig(draft);
    const result = analyze(config);

    expect(config.boosters?.count).toBe(2);
    expect(draft.boosters?.type).toBe('solid');
    expect(config.stages).toHaveLength(2);
    expect(config.targetOrbitAltitudeKm).toBe(200);
    expect(result.total.mission_target).toBe('LEO');
    expect(result.total.target_requirement_kms).toBeCloseTo(9.4, 5);
    expect(result.total.dv_kms).toBeGreaterThan(9);
  });

  it('loads Falcon 9, Saturn V, and Long March 5 as distinct analyze-ready presets', () => {
    const falcon = buildAnalyzeConfig(loadDraftFromPreset('falcon9', catalog.engines));
    const saturn = buildAnalyzeConfig(loadDraftFromPreset('saturnV', catalog.engines));
    const longMarch = buildAnalyzeConfig(loadDraftFromPreset('longMarch5', catalog.engines));

    expect(falcon.stages).toHaveLength(2);
    expect(falcon.boosters).toBeNull();
    expect(falcon.targetOrbitAltitudeKm).toBe(200);

    expect(saturn.stages).toHaveLength(3);
    expect(saturn.boosters).toBeNull();
    expect(saturn.targetOrbitAltitudeKm).toBe(200);

    expect(longMarch.stages).toHaveLength(2);
    expect(longMarch.boosters?.count).toBe(4);
    expect(longMarch.targetOrbitAltitudeKm).toBe(200);
  });

  it('keeps the dedicated booster card inactive at count 0', () => {
    const draft = loadDraftFromPreset('custom', catalog.engines);
    const config = buildAnalyzeConfig(draft);

    expect(draft.boosters?.count).toBe('0');
    expect(config.boosters).toBeNull();
  });

  it('preserves liquid booster presets in the analyze config', () => {
    const draft = loadDraftFromPreset('longMarch5', catalog.engines);
    const config = buildAnalyzeConfig(draft);

    expect(draft.boosters?.type).toBe('liquid');
    expect(config.boosters?.engineKey).toBe('lm5_booster_blob');
    expect(config.boosters?.count).toBe(4);
  });

  it('round-trips a shared draft through the URL fragment payload', () => {
    const draft = {
      ...loadDraftFromPreset('longMarch5', catalog.engines),
      presetId: 'custom',
      payloadMassKg: '12345',
      targetOrbitAltitudeKm: '2000',
      boosters: {
        ...loadDraftFromPreset('longMarch5', catalog.engines).boosters,
        count: '2',
      },
    };

    const encoded = encodeShareDraft(draft);
    const decoded = decodeShareDraft(encoded, catalog.engines);
    const shareUrl = buildShareUrl(draft, 'https://example.test/designer-v2.html');
    const restored = restoreSharedDraftFromHash(new URL(shareUrl).hash, catalog.engines);

    expect(decoded?.payloadMassKg).toBe('12345');
    expect(decoded?.targetOrbitAltitudeKm).toBe('2000');
    expect(decoded?.boosters?.count).toBe('2');
    expect(shareUrl).toContain('#d=');
    expect(restored.status).toBe('restored');
    expect(restored.draft?.stages).toHaveLength(2);
  });

  it('rejects malformed share fragments safely', () => {
    expect(restoreSharedDraftFromHash('#d=not-valid-base64', catalog.engines)).toEqual({
      draft: null,
      status: 'invalid',
    });
  });
});
