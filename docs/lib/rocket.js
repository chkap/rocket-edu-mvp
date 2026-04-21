const DEFAULT_G0 = 9.80665;

function assertFiniteNumber(name, value) {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
}

function assertPositiveFinite(name, value) {
  assertFiniteNumber(name, value);

  if (value <= 0) {
    throw new Error(`${name} must be greater than 0.`);
  }
}

function assertNonNegativeFinite(name, value) {
  assertFiniteNumber(name, value);

  if (value < 0) {
    throw new Error(`${name} must be greater than or equal to 0.`);
  }
}

export function validateStage(stage) {
  if (!stage || typeof stage !== 'object') {
    throw new Error('stage must be an object.');
  }

  assertPositiveFinite('m_p', stage.m_p);
  assertPositiveFinite('m_s', stage.m_s);
  assertPositiveFinite('Isp', stage.Isp);
  assertPositiveFinite('thrust_kN', stage.thrust_kN);

  return stage;
}

export function stageDeltaV({ m_p, m_s, payload, Isp, g0 = DEFAULT_G0 }) {
  assertPositiveFinite('m_p', m_p);
  assertPositiveFinite('m_s', m_s);
  assertPositiveFinite('Isp', Isp);
  assertPositiveFinite('g0', g0);
  assertNonNegativeFinite('payload', payload);

  const wetMass = m_s + m_p + payload;
  const dryMass = m_s + payload;

  return Isp * g0 * Math.log(wetMass / dryMass);
}

export function stackDeltaV(stages, finalPayload) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error('stages must be a non-empty array.');
  }

  assertNonNegativeFinite('finalPayload', finalPayload);

  const perStage = new Array(stages.length);
  let payload = finalPayload;
  let total = 0;

  for (let index = stages.length - 1; index >= 0; index -= 1) {
    const stage = stages[index];
    const dv = stageDeltaV({ ...stage, payload });

    perStage[index] = dv;
    total += dv;
    payload += stage.m_p + stage.m_s;
  }

  return { perStage, total };
}

export function initialTWR({ thrust_kN, totalMassAbove_kg, g0 = DEFAULT_G0 }) {
  assertPositiveFinite('thrust_kN', thrust_kN);
  assertPositiveFinite('totalMassAbove_kg', totalMassAbove_kg);
  assertPositiveFinite('g0', g0);

  return (thrust_kN * 1000) / (totalMassAbove_kg * g0);
}

// Δv thresholds from issue #23 advisory comment:
// https://github.com/chkap/rocket-edu-mvp/issues/23#issuecomment-4286980274
const LEO_THRESHOLD_MS = 9700;
const GTO_THRESHOLD_MS = 12100;
const TLI_THRESHOLD_MS = 12800;
const BEYOND_TLI_THRESHOLD_MS = 13100;

export function capabilityLabel(totalDv) {
  assertFiniteNumber('totalDv', totalDv);

  if (totalDv >= BEYOND_TLI_THRESHOLD_MS) {
    return 'beyond-TLI';
  }

  if (totalDv >= TLI_THRESHOLD_MS) {
    return 'TLI';
  }

  if (totalDv >= GTO_THRESHOLD_MS) {
    return 'GTO';
  }

  if (totalDv >= LEO_THRESHOLD_MS) {
    return 'LEO';
  }

  return 'suborbital';
}
