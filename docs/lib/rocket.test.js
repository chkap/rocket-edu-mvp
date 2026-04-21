import { describe, expect, it } from 'vitest';

import {
  capabilityLabel,
  initialTWR,
  stackDeltaV,
  stageDeltaV,
  validateStage,
} from './rocket.js';

describe('stageDeltaV', () => {
  it('matches the acceptance example within 1%', () => {
    const dv = stageDeltaV({ m_p: 900, m_s: 100, payload: 0, Isp: 300 });

    expect(dv).toBeCloseTo(6772, -1);
    expect(dv).toBeGreaterThan(6704.28);
    expect(dv).toBeLessThan(6839.72);
  });
});

describe('stackDeltaV', () => {
  it('shows the staging advantage over a single stage with the same total mass', () => {
    const twoStage = stackDeltaV(
      [
        { m_p: 900, m_s: 100, Isp: 300 },
        { m_p: 900, m_s: 100, Isp: 300 },
      ],
      0
    );

    const singleStage = stageDeltaV({ m_p: 1800, m_s: 200, payload: 0, Isp: 300 });

    expect(twoStage.perStage).toHaveLength(2);
    expect(twoStage.total).toBeGreaterThan(singleStage);
  });
});

describe('initialTWR', () => {
  it('returns less than 1 for an underpowered case and greater than 1 for an overpowered case', () => {
    expect(initialTWR({ thrust_kN: 500, totalMassAbove_kg: 100000 })).toBeLessThan(1);
    expect(initialTWR({ thrust_kN: 1500, totalMassAbove_kg: 100000 })).toBeGreaterThan(1);
  });
});

describe('validateStage', () => {
  it('throws on zero, negative, and non-finite stage values', () => {
    expect(() =>
      validateStage({ m_p: 0, m_s: 10, Isp: 300, thrust_kN: 100 })
    ).toThrow(/m_p/i);

    expect(() =>
      validateStage({ m_p: 10, m_s: -1, Isp: 300, thrust_kN: 100 })
    ).toThrow(/m_s/i);

    expect(() =>
      validateStage({ m_p: 10, m_s: 1, Isp: Number.NaN, thrust_kN: 100 })
    ).toThrow(/Isp/i);
  });
});

describe('capabilityLabel', () => {
  it('maps the advisory thresholds to the expected labels', () => {
    expect(capabilityLabel(2000)).toBe('suborbital');
    expect(capabilityLabel(9700)).toBe('LEO');
    expect(capabilityLabel(12100)).toBe('GTO');
    expect(capabilityLabel(12800)).toBe('TLI');
    expect(capabilityLabel(13100)).toBe('beyond-TLI');
  });
});
