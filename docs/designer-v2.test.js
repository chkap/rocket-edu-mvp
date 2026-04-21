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
    expect(config.stages).toHaveLength(2);
    expect(result.total.mission_target).toBe('LEO');
    expect(result.total.dv_kms).toBeGreaterThan(9);
  });
});
