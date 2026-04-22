import { describe, expect, it } from 'vitest';

import { analyze, dryMass, effectiveIsp, g0, gravityDragLoss, verdict } from './physics.js';
import { falcon9, longMarch5, saturnV, slsBlock1 } from './presets.js';

describe('dryMass', () => {
  it('derives dry mass from the required formula', () => {
    expect(
      dryMass({
        engineKey: 'merlin_1d',
        engineCount: 1,
        propellantMassKg: 100000,
        tankFraction: 0.06,
      })
    ).toBeCloseTo(7170, 5);
  });
});

describe('effectiveIsp', () => {
  it('uses the launch approximation for the first stage and vacuum values for upper stages', () => {
    expect(
      effectiveIsp({ engineKey: 'merlin_1d', engineCount: 9, propellantMassKg: 410900 }, true)
    ).toBeCloseTo(290.7, 5);
    expect(
      effectiveIsp({ engineKey: 'merlin_vac', engineCount: 1, propellantMassKg: 107500 }, false)
    ).toBeCloseTo(348, 5);
  });
});

describe('gravityDragLoss', () => {
  it('follows the cited smooth atmospheric-loss fit within the target envelope', () => {
    expect(gravityDragLoss(1.1)).toBe(2200);
    expect(gravityDragLoss(1.2)).toBeCloseTo(2200, 5);
    expect(gravityDragLoss(1.4)).toBeCloseTo(1969, 0);
    expect(gravityDragLoss(1.6)).toBeCloseTo(1815, 0);
    expect(gravityDragLoss(2)).toBeCloseTo(1641, 0);
    expect(gravityDragLoss(3)).toBeCloseTo(1519, 0);
    expect(gravityDragLoss(6)).toBeCloseTo(1500, 0);
  });

  it('changes smoothly as liftoff TWR increases', () => {
    const low = gravityDragLoss(1.3);
    const medium = gravityDragLoss(1.31);
    const high = gravityDragLoss(1.32);

    expect(low).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(high);
    expect(low - medium).toBeLessThan(20);
    expect(medium - high).toBeLessThan(20);
  });
});

describe('verdict', () => {
  it('maps total delta-v to mission labels', () => {
    expect(verdict(9.4)).toBe('LEO');
    expect(verdict(9.399996)).toBe('LEO');
    expect(verdict(11.8)).toBe('GTO');
    expect(verdict(12.4)).toBe('TLI');
    expect(verdict(13.5)).toBe('Mars');
    expect(verdict(15.8)).toBe('Lunar landing');
    expect(verdict(4)).toBe('Suborbital');
  });
});

describe('analyze presets', () => {
  it('keeps Falcon 9 within 5% of the target oracle', () => {
    const result = analyze(falcon9);
    expect(result.total.dv_kms).toBeGreaterThan(8.93);
    expect(result.total.dv_kms).toBeLessThan(9.87);
    expect(result.total.verdict).toBe('LEO');
    expect(result.total.mission_target).toBe('LEO');
    expect(result.total.target_met).toBe(true);
  });

  it('keeps Saturn V within 5% of the target oracle', () => {
    const result = analyze(saturnV);
    expect(result.total.dv_kms).toBeGreaterThan(16.15);
    expect(result.total.dv_kms).toBeLessThan(17.85);
    expect(result.total.mission_target).toBe('TLI');
  });

  it('keeps SLS Block 1 within 5% of the target oracle', () => {
    const result = analyze(slsBlock1);
    expect(result.total.dv_kms).toBeGreaterThan(9.025);
    expect(result.total.dv_kms).toBeLessThan(9.975);
    expect(result.total.verdict).toBe('LEO');
    expect(result.total.mission_target).toBe('LEO');
    expect(result.total.target_met).toBe(true);
  });

  it('keeps Long March 5 within 5% of the target oracle', () => {
    const result = analyze(longMarch5);
    expect(result.total.dv_kms).toBeGreaterThan(9.025);
    expect(result.total.dv_kms).toBeLessThan(9.975);
    expect(result.total.verdict).toBe('LEO');
    expect(result.total.mission_target).toBe('LEO');
    expect(result.total.target_met).toBe(true);
  });
});

describe('analyze edge cases', () => {
  it('returns zero delta-v for zero propellant', () => {
    const result = analyze({
      payloadMassKg: 0,
      stages: [
        {
          engineKey: 'merlin_1d',
          engineCount: 1,
          propellantMassKg: 0,
          tankFraction: 0.06,
        },
      ],
    });

    expect(result.total.dv_ms).toBe(0);
  });

  it('accepts max throttle on a launch stage', () => {
    const baseline = analyze({
      payloadMassKg: 0,
      stages: [
        {
          engineKey: 'merlin_1d',
          engineCount: 1,
          propellantMassKg: 100000,
          tankFraction: 0.06,
          throttle: 1,
        },
      ],
    });
    const result = analyze({
      payloadMassKg: 0,
      stages: [
        {
          engineKey: 'merlin_1d',
          engineCount: 1,
          propellantMassKg: 100000,
          tankFraction: 0.06,
          throttle: 1.05,
        },
      ],
    });

    expect(result.stages[0].twr_ignition).toBeGreaterThan(baseline.stages[0].twr_ignition);
  });

  it('warns when a vacuum-only engine is used at sea level', () => {
    const result = analyze({
      payloadMassKg: 0,
      stages: [
        {
          label: 'Vacuum starter',
          engineKey: 'merlin_vac',
          engineCount: 1,
          propellantMassKg: 100000,
          tankFraction: 0.06,
        },
      ],
    });

    expect(result.total.warnings.join(' ')).toMatch(/vacuum-only engine used at sea level/i);
  });

  it('blocks unphysical structural index ratios on both sides of the range', () => {
    const low = analyze({
      payloadMassKg: 0,
      stages: [
        {
          engineKey: 'merlin_1d',
          engineCount: 1,
          propellantMassKg: 100000,
          tankFraction: 0.03,
        },
      ],
    });
    const high = analyze({
      payloadMassKg: 0,
      stages: [
        {
          engineKey: 'merlin_1d',
          engineCount: 1,
          propellantMassKg: 100000,
          tankFraction: 0.19,
        },
      ],
    });

    expect(low.structural_index.blocked).toBe(true);
    expect(high.structural_index.blocked).toBe(true);
  });

  it('flags an upper stage using a sea-level nozzle selection', () => {
    const result = analyze({
      payloadMassKg: 0,
      stages: [
        {
          label: 'Stage 1',
          engineKey: 'merlin_1d',
          engineCount: 1,
          propellantMassKg: 100000,
          tankFraction: 0.06,
        },
        {
          label: 'Stage 2',
          engineKey: 'merlin_1d',
          engineCount: 1,
          propellantMassKg: 10000,
          tankFraction: 0.06,
          nozzle: 'sl',
        },
      ],
    });

    expect(result.stages[1].warnings.join(' ')).toMatch(/sea-level nozzle selected on an upper stage/i);
  });

  it('shows SLS failing LEO without boosters and reaching LEO with the two SRBs', () => {
    const withoutBoosters = analyze({
      ...slsBlock1,
      boosters: null,
    });
    const withBoosters = analyze(slsBlock1);

    expect(withoutBoosters.total.dv_kms).toBeLessThan(9.4);
    expect(withoutBoosters.total.verdict).toBe('Suborbital');
    expect(withoutBoosters.total.mission_target).toBe('LEO');
    expect(withoutBoosters.total.target_met).toBe(false);
    expect(withBoosters.total.dv_kms).toBeGreaterThanOrEqual(9.4);
    expect(withBoosters.total.verdict).toBe('LEO');
    expect(withBoosters.total.mission_target).toBe('LEO');
    expect(withBoosters.total.target_met).toBe(true);
    expect(withBoosters.boosters?.dv_ms).toBeGreaterThan(0);
  });
});

describe('constants', () => {
  it('exports standard gravity from a single source of truth', () => {
    expect(g0).toBe(9.80665);
  });
});
