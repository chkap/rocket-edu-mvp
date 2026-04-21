import catalog from '../../data/engines.json' with { type: 'json' };

export const g0 = catalog.g0;

const ENGINE_MAP = new Map(catalog.engines.map((engine) => [engine.key, engine]));

const DEFAULT_TANK_FRACTIONS = {
  RP1_LOX: 0.06,
  CH4_LOX: 0.07,
  LH2_LOX: 0.12,
};

const DEFAULT_FAIRING_MASS_KG = 1500;

const VERDICT_THRESHOLDS = [
  { label: 'Lunar landing', min_kms: 15.8 },
  { label: 'Mars', min_kms: 13.5 },
  { label: 'TLI', min_kms: 12.4 },
  { label: 'GTO', min_kms: 11.8 },
  { label: 'LEO', min_kms: 9.4 },
];

function assertFiniteNumber(name, value) {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
}

function assertPositiveNumber(name, value) {
  assertFiniteNumber(name, value);

  if (value <= 0) {
    throw new Error(`${name} must be greater than 0.`);
  }
}

function assertNonNegativeNumber(name, value) {
  assertFiniteNumber(name, value);

  if (value < 0) {
    throw new Error(`${name} must be greater than or equal to 0.`);
  }
}

function cloneWarnings(warnings) {
  return [...new Set(warnings)];
}

export function getEngine(engineKey) {
  const engine = ENGINE_MAP.get(engineKey);

  if (!engine) {
    throw new Error(`Unknown engine key: ${engineKey}`);
  }

  return engine;
}

export function structuralIndexHealth(ratio) {
  if (!Number.isFinite(ratio)) {
    return { ratio: null, health: 'fixed', blocked: false };
  }

  if (ratio >= 0.05 && ratio <= 0.14) {
    return { ratio, health: 'realistic', blocked: false };
  }

  if (ratio >= 0.04 && ratio < 0.05) {
    return { ratio, health: 'optimistic', blocked: false };
  }

  return { ratio, health: 'unphysical', blocked: true };
}

function normalizeTankFraction(stage, engine) {
  if (Number.isFinite(stage.tankFraction)) {
    return stage.tankFraction;
  }

  return DEFAULT_TANK_FRACTIONS[engine.propellant] ?? null;
}

function stageEngineCount(stage) {
  return Number.isFinite(stage.engineCount) ? stage.engineCount : 1;
}

function stageThrottle(stage) {
  return Number.isFinite(stage.throttle) ? stage.throttle : 1;
}

function boosterCount(boosters) {
  return Number.isFinite(boosters?.count) ? boosters.count : 0;
}

function wetMassFromDryMass(dryMassKg, propellantMassKg) {
  return dryMassKg + propellantMassKg;
}

export function dryMass(stage, options = {}) {
  const engine = getEngine(stage.engineKey);
  const engineCount = stageEngineCount(stage);
  const fairingMassKg = options.isTopStage
    ? options.fairingMassKg ?? stage.fairingMassKg ?? DEFAULT_FAIRING_MASS_KG
    : stage.fairingMassKg ?? 0;
  const propellantMassKg = stage.propellantMassKg ?? engine.fixed_propellant_kg ?? 0;

  assertNonNegativeNumber('propellantMassKg', propellantMassKg);
  assertPositiveNumber('engineCount', engineCount);

  if (engine.dry_mass_model === 'fixed') {
    return engineCount * engine.mass_kg + fairingMassKg;
  }

  const tankFraction = normalizeTankFraction(stage, engine);
  assertFiniteNumber('tankFraction', tankFraction);

  return (
    engineCount * engine.mass_kg +
    tankFraction * propellantMassKg +
    0.005 * propellantMassKg +
    200 +
    fairingMassKg
  );
}

function resolveNozzle(stage) {
  return stage.nozzle ?? 'auto';
}

function resolveSeaLevelPerformance(stage, engine, warnings) {
  const nozzle = resolveNozzle(stage);

  if (engine.dry_mass_model === 'fixed' && engine.propellant === 'SOLID') {
    return {
      isp: engine.isp_vac,
      thrust_kN: engine.thrust_vac_kN * stageEngineCount(stage) * stageThrottle(stage),
    };
  }

  if (engine.isp_sl > 0 && engine.thrust_sl_kN > 0) {
    if (nozzle === 'vac') {
      warnings.push(`${stage.label ?? stage.engineKey}: vacuum nozzle selected at sea level; using mixed launch performance.`);
    }

    return {
      isp: 0.7 * engine.isp_sl + 0.3 * engine.isp_vac,
      thrust_kN: engine.thrust_sl_kN * stageEngineCount(stage) * stageThrottle(stage),
    };
  }

  warnings.push(`${stage.label ?? stage.engineKey}: vacuum-only engine used at sea level.`);
  return {
    isp: engine.isp_vac,
    thrust_kN: engine.thrust_vac_kN * stageEngineCount(stage) * stageThrottle(stage),
  };
}

function resolveVacuumPerformance(stage, engine, warnings) {
  const nozzle = resolveNozzle(stage);

  if (nozzle === 'sl' && engine.isp_sl > 0 && engine.thrust_sl_kN > 0) {
    warnings.push(`${stage.label ?? stage.engineKey}: sea-level nozzle selected on an upper stage.`);
    return {
      isp: engine.isp_sl,
      thrust_kN: engine.thrust_sl_kN * stageEngineCount(stage) * stageThrottle(stage),
    };
  }

  if (engine.isp_vac > 0 && engine.thrust_vac_kN > 0) {
    return {
      isp: engine.isp_vac,
      thrust_kN: engine.thrust_vac_kN * stageEngineCount(stage) * stageThrottle(stage),
    };
  }

  return {
    isp: engine.isp_sl,
    thrust_kN: engine.thrust_sl_kN * stageEngineCount(stage) * stageThrottle(stage),
  };
}

export function effectiveIsp(stage, isFirstStage = false) {
  const engine = getEngine(stage.engineKey);
  const warnings = [];
  const performance = isFirstStage
    ? resolveSeaLevelPerformance(stage, engine, warnings)
    : resolveVacuumPerformance(stage, engine, warnings);
  return performance.isp;
}

function stagePerformance(stage, options = {}) {
  const engine = getEngine(stage.engineKey);
  const warnings = [];
  const performance = options.isLaunchPhase
    ? resolveSeaLevelPerformance(stage, engine, warnings)
    : resolveVacuumPerformance(stage, engine, warnings);

  return {
    ...performance,
    warnings,
  };
}

export function gravityDragLoss(twrLiftoff) {
  assertPositiveNumber('twrLiftoff', twrLiftoff);

  if (twrLiftoff >= 1.4) {
    return 1500;
  }

  if (twrLiftoff >= 1.2) {
    return 1800;
  }

  return 2200;
}

export function verdict(dv_kms) {
  assertNonNegativeNumber('dv_kms', dv_kms);

  const match = VERDICT_THRESHOLDS.find((threshold) => dv_kms >= threshold.min_kms);
  return match?.label ?? 'Suborbital';
}

function computeStageMasses(stage, options = {}) {
  const propellantMassKg = stage.propellantMassKg ?? getEngine(stage.engineKey).fixed_propellant_kg ?? 0;
  const dryMassKg = dryMass(stage, options);

  return {
    propellantMassKg,
    dryMassKg,
    wetMassKg: wetMassFromDryMass(dryMassKg, propellantMassKg),
  };
}

function rocketEquation(isp, wetMassKg, dryMassKg) {
  if (wetMassKg <= dryMassKg || wetMassKg <= 0 || dryMassKg <= 0 || isp <= 0) {
    return 0;
  }

  return isp * g0 * Math.log(wetMassKg / dryMassKg);
}

function burnTime(propellantMassKg, isp, thrust_kN) {
  if (propellantMassKg <= 0 || isp <= 0 || thrust_kN <= 0) {
    return 0;
  }

  return (propellantMassKg * isp * g0) / (thrust_kN * 1000);
}

function twr(thrust_kN, massKg) {
  if (thrust_kN <= 0 || massKg <= 0) {
    return 0;
  }

  return (thrust_kN * 1000) / (massKg * g0);
}

function buildStructuralSummary(stageSummaries, boosterSummary) {
  const entries = [...stageSummaries.map((stage) => stage.structural_index)];
  if (boosterSummary?.structural_index) {
    entries.push(boosterSummary.structural_index);
  }

  return {
    blocked: entries.some((entry) => entry?.blocked),
    summary: entries.some((entry) => entry?.health === 'unphysical')
      ? 'unphysical'
      : entries.some((entry) => entry?.health === 'optimistic')
        ? 'optimistic'
        : 'realistic',
    entries,
  };
}

function summarizeStage(stage, payloadMassKg, options = {}) {
  const engine = getEngine(stage.engineKey);
  const stageMasses = computeStageMasses(stage, { isTopStage: options.isTopStage });
  const performance = stagePerformance(stage, { isLaunchPhase: options.isLaunchPhase });
  const wetMassKg = stageMasses.wetMassKg + payloadMassKg;
  const dryMassKg = stageMasses.dryMassKg + payloadMassKg;
  const tankFraction = normalizeTankFraction(stage, engine);
  const structural = structuralIndexHealth(tankFraction);

  return {
    label: stage.label ?? stage.engineKey,
    engine_key: stage.engineKey,
    engine_count: stageEngineCount(stage),
    nozzle: resolveNozzle(stage),
    propellant_mass_kg: stageMasses.propellantMassKg,
    dry_mass_kg: stageMasses.dryMassKg,
    wet_mass_kg: stageMasses.wetMassKg,
    payload_mass_kg: payloadMassKg,
    isp_eff_s: performance.isp,
    thrust_kN: performance.thrust_kN,
    burn_time_s: burnTime(stageMasses.propellantMassKg, performance.isp, performance.thrust_kN),
    structural_index: structural,
    warnings: performance.warnings,
    wet_stack_mass_kg: wetMassKg,
    dry_stack_mass_kg: dryMassKg,
  };
}

function solvePayloadMasses(stages, payloadMassKg) {
  const payloadMasses = new Array(stages.length);
  let runningPayload = payloadMassKg;

  for (let index = stages.length - 1; index >= 0; index -= 1) {
    payloadMasses[index] = runningPayload;
    runningPayload += stages[index].wet_mass_kg;
  }

  return payloadMasses;
}

function summarizeBoosters(boosters, stage1PayloadMassKg, stage1StageMasses) {
  if (!boosters || boosterCount(boosters) <= 0) {
    return null;
  }

  const singleBooster = summarizeStage(boosters, 0, { isLaunchPhase: true, isTopStage: false });
  const count = boosterCount(boosters);

  return {
    ...singleBooster,
    count,
    label: boosters.label ?? 'Boosters',
    propellant_mass_kg: singleBooster.propellant_mass_kg * count,
    dry_mass_kg: singleBooster.dry_mass_kg * count,
    wet_mass_kg: singleBooster.wet_mass_kg * count,
    thrust_kN: singleBooster.thrust_kN * count,
    payload_mass_kg: stage1PayloadMassKg + stage1StageMasses.wetMassKg,
  };
}

function analyzeWithBoosters(config, stageSummaries, payloadMasses, warnings) {
  const stage1 = stageSummaries[0];
  const boosterSummary = summarizeBoosters(config.boosters, payloadMasses[0], {
    wetMassKg: stageSummaries[0].wet_mass_kg,
  });

  if (!boosterSummary) {
    return { boosterSummary: null, adjustedStage1: null, remainingPropellantKg: null };
  }

  warnings.push(...boosterSummary.warnings);

  const launchMassKg =
    boosterSummary.wet_mass_kg + stage1.wet_stack_mass_kg;
  const stage1MassFlow = (stage1.thrust_kN * 1000) / (stage1.isp_eff_s * g0);
  const boosterMassFlow = (boosterSummary.thrust_kN * 1000) / (boosterSummary.isp_eff_s * g0);
  const boosterBurnTimeS = burnTime(
    boosterSummary.propellant_mass_kg,
    boosterSummary.isp_eff_s,
    boosterSummary.thrust_kN
  );
  const stage1PropellantUsedKg = Math.min(stage1.propellant_mass_kg, stage1MassFlow * boosterBurnTimeS);
  const remainingPropellantKg = Math.max(stage1.propellant_mass_kg - stage1PropellantUsedKg, 0);
  const mdotTotal = stage1MassFlow + boosterMassFlow;
  const thrustTotalKN = stage1.thrust_kN + boosterSummary.thrust_kN;
  const combinedIsp = mdotTotal > 0 ? (thrustTotalKN * 1000) / (mdotTotal * g0) : 0;
  const burnoutBeforeJettisonKg =
    launchMassKg - boosterSummary.propellant_mass_kg - stage1PropellantUsedKg;
  const afterJettisonKg = burnoutBeforeJettisonKg - boosterSummary.dry_mass_kg;
  const stage1DryAfterBurnKg = afterJettisonKg - remainingPropellantKg;

  const boosterDvMs = rocketEquation(combinedIsp, launchMassKg, burnoutBeforeJettisonKg);
  const stage1AloneDvMs = rocketEquation(stage1.isp_eff_s, afterJettisonKg, stage1DryAfterBurnKg);
  const liftoffTwr = twr(thrustTotalKN, launchMassKg);
  const gravityLossMs = gravityDragLoss(liftoffTwr);

  if (liftoffTwr <= 1.2) {
    warnings.push("won't lift off");
  }

  if (liftoffTwr < 1.2) {
    warnings.push('marginal liftoff');
  }

  const adjustedStage1 = {
    ...stage1,
    dv_ms: Math.max(boosterDvMs + stage1AloneDvMs - gravityLossMs, 0),
    twr_ignition: liftoffTwr,
    twr_burnout: twr(stage1.thrust_kN, stage1DryAfterBurnKg),
    burn_time_s: stage1.burn_time_s,
    gravity_drag_loss_ms: gravityLossMs,
    booster_dv_ms: boosterDvMs,
    remaining_propellant_kg_after_boosters: remainingPropellantKg,
  };

  const boosterDetails = {
    ...boosterSummary,
    burn_time_s: boosterBurnTimeS,
    dv_ms: boosterDvMs,
    stage1_propellant_used_kg: stage1PropellantUsedKg,
    stage1_remaining_propellant_kg: remainingPropellantKg,
  };

  return {
    boosterSummary: boosterDetails,
    adjustedStage1,
    remainingPropellantKg,
  };
}

export function analyze(config) {
  if (!config || !Array.isArray(config.stages) || config.stages.length === 0) {
    throw new Error('config.stages must be a non-empty array.');
  }

  const payloadMassKg = config.payloadMassKg ?? 0;
  assertNonNegativeNumber('payloadMassKg', payloadMassKg);

  const warnings = [];
  const stageSummaries = config.stages.map((stage, index) =>
    summarizeStage(stage, 0, {
      isTopStage: index === config.stages.length - 1,
      isLaunchPhase: index === 0,
    })
  );
  const payloadMasses = solvePayloadMasses(stageSummaries, payloadMassKg);
  const analyzedStages = stageSummaries.map((stage, index) => {
    const wetMassKg = stage.wet_mass_kg + payloadMasses[index];
    const dryMassKg = stage.dry_mass_kg + payloadMasses[index];
    const stageWarnings = [...stage.warnings];
    const ignitionTwr = twr(stage.thrust_kN, wetMassKg);
    const burnoutTwr = twr(stage.thrust_kN, dryMassKg);

    if (index > 0 && ignitionTwr < 0.5) {
      stageWarnings.push(`${stage.label}: upper-stage TWR below 0.5.`);
      warnings.push(`${stage.label}: upper-stage TWR below 0.5.`);
    }

    warnings.push(...stage.warnings);

    return {
      ...stage,
      payload_mass_kg: payloadMasses[index],
      dv_ms: rocketEquation(stage.isp_eff_s, wetMassKg, dryMassKg),
      twr_ignition: ignitionTwr,
      twr_burnout: burnoutTwr,
      warnings: stageWarnings,
    };
  });

  let boosterSummary = null;
  if (config.boosters && boosterCount(config.boosters) > 0) {
    const boosterAnalysis = analyzeWithBoosters(config, analyzedStages, payloadMasses, warnings);
    boosterSummary = boosterAnalysis.boosterSummary;
    analyzedStages[0] = boosterAnalysis.adjustedStage1;
  } else {
    const stage1 = analyzedStages[0];
    const liftoffTwr = stage1.twr_ignition;
    const gravityLossMs = gravityDragLoss(Math.max(liftoffTwr, Number.EPSILON));

    if (liftoffTwr <= 1.2) {
      warnings.push("won't lift off");
    }

    if (liftoffTwr < 1.2) {
      warnings.push('marginal liftoff');
    }

    analyzedStages[0] = {
      ...stage1,
      dv_ms: Math.max(stage1.dv_ms - gravityLossMs, 0),
      gravity_drag_loss_ms: gravityLossMs,
    };
  }

  const structural = buildStructuralSummary(analyzedStages, boosterSummary);
  const totalDvMs = Math.max(
    analyzedStages.reduce((sum, stage) => sum + stage.dv_ms, 0),
    0
  );

  return {
    stages: analyzedStages.map((stage) => ({
      ...stage,
      warnings: cloneWarnings(stage.warnings),
    })),
    boosters: boosterSummary
      ? {
          ...boosterSummary,
          warnings: cloneWarnings(boosterSummary.warnings),
        }
      : null,
    total: {
      dv_ms: totalDvMs,
      dv_kms: totalDvMs / 1000,
      verdict: verdict(totalDvMs / 1000),
      mission_target: config.missionTarget ?? null,
      target_met:
        typeof config.missionTarget === 'string'
          ? verdict(totalDvMs / 1000) === config.missionTarget
          : null,
      warnings: cloneWarnings(warnings),
    },
    structural_index: structural,
  };
}
