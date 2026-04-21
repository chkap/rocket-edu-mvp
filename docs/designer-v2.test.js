import { describe, expect, it } from 'vitest';

import catalog from './data/engines.json' with { type: 'json' };
import { analyze } from './lib/designer_v2/physics.js';
import {
  defaultTankFractionForPropellant,
  missionProgressPercent,
  reorderUpperStages,
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
    expect(missionProgressPercent(0)).toBe(0);
    expect(missionProgressPercent(15.8)).toBe(100);
    expect(missionProgressPercent(7.9)).toBeCloseTo(50, 1);
  });

  it('loads preset drafts into analyze-compatible configs', () => {
    const draft = loadDraftFromPreset('slsBlock1', catalog.engines);
    const config = buildAnalyzeConfig(draft);
    const result = analyze(config);

    expect(config.boosters?.count).toBe(2);
    expect(draft.boosters?.type).toBe('solid');
    expect(config.stages).toHaveLength(2);
    expect(result.total.mission_target).toBe('LEO');
    expect(result.total.dv_kms).toBeGreaterThan(9);
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
});
