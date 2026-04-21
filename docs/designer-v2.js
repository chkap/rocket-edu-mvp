import { analyze } from './lib/designer_v2/physics.js';
import { PRESETS } from './lib/designer_v2/presets.js';
import { formatMessage, initPage, t } from './lib/i18n.js';

const MAX_STAGES = 4;
const MIN_STAGES = 1;
const MAX_BOOSTERS = 6;
const MAX_ENGINE_COUNT = 9;
const PROP_TONS_RANGE = { min: 1, max: 4000, step: 1 };
const TANK_FRACTION_RANGE = { min: 0.04, max: 0.18, step: 0.01 };
const DEFAULT_TANK_FRACTIONS = {
  RP1_LOX: 0.06,
  CH4_LOX: 0.07,
  LH2_LOX: 0.12,
};
const BOOSTER_TYPES = {
  LIQUID: 'liquid',
  SOLID: 'solid',
};

export const MISSION_MARKERS = [
  { labelKey: 'designer_v2.mission.leo', thresholdKmS: 9.4, mission: 'LEO' },
  { labelKey: 'designer_v2.mission.gto', thresholdKmS: 11.8, mission: 'GTO' },
  { labelKey: 'designer_v2.mission.tli', thresholdKmS: 12.4, mission: 'TLI' },
  { labelKey: 'designer_v2.mission.mars', thresholdKmS: 13.5, mission: 'Mars' },
  { labelKey: 'designer_v2.mission.lunar', thresholdKmS: 15.8, mission: 'Lunar landing' },
];

const VERDICT_KEY_MAP = {
  Suborbital: 'designer_v2.verdict.suborbital',
  LEO: 'designer_v2.verdict.leo',
  GTO: 'designer_v2.verdict.gto',
  TLI: 'designer_v2.verdict.tli',
  Mars: 'designer_v2.verdict.mars',
  'Lunar landing': 'designer_v2.verdict.lunar_landing',
};

const PRESET_OPTIONS = [
  { id: 'custom', labelKey: 'designer_v2.preset.custom', preset: null },
  {
    id: 'falcon9',
    labelKey: 'designer_v2.preset.falcon9',
    preset: PRESETS.falcon9,
    stageNameKeys: [
      'designer_v2.preset.falcon9.stage_1',
      'designer_v2.preset.falcon9.stage_2',
    ],
  },
  {
    id: 'saturnV',
    labelKey: 'designer_v2.preset.saturn_v',
    preset: PRESETS.saturnV,
    stageNameKeys: [
      'designer_v2.preset.saturn_v.stage_1',
      'designer_v2.preset.saturn_v.stage_2',
      'designer_v2.preset.saturn_v.stage_3',
    ],
  },
  {
    id: 'slsBlock1',
    labelKey: 'designer_v2.preset.sls_block_1',
    preset: PRESETS.slsBlock1,
    stageNameKeys: [
      'designer_v2.preset.sls_block_1.stage_1',
      'designer_v2.preset.sls_block_1.stage_2',
    ],
    boosterNameKey: 'designer_v2.preset.sls_block_1.boosters',
  },
  {
    id: 'longMarch5',
    labelKey: 'designer_v2.preset.long_march_5',
    preset: PRESETS.longMarch5,
    stageNameKeys: [
      'designer_v2.preset.long_march_5.stage_1',
      'designer_v2.preset.long_march_5.stage_2',
    ],
    boosterNameKey: 'designer_v2.preset.long_march_5.boosters',
  },
];

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const oneDecimalFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const twrFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ratioFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const state = {
  engines: [],
  presetId: 'custom',
  payloadMassKg: '1000',
  stages: [],
  boosters: null,
};

function editableNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return value
    .toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function getPresetOption(id) {
  return PRESET_OPTIONS.find((option) => option.id === id) ?? PRESET_OPTIONS[0];
}

function getEngineMap(engines = state.engines) {
  return new Map(engines.map((engine) => [engine.key, engine]));
}

function getEngine(engineKey, engines = state.engines) {
  return getEngineMap(engines).get(engineKey) ?? engines[0] ?? null;
}

function defaultEngineForStage(engines, index) {
  if (index === 0) {
    return getEngine('merlin_1d', engines) ?? engines[0] ?? null;
  }

  return getEngine('merlin_vac', engines) ?? getEngine('rl10b2', engines) ?? engines[0] ?? null;
}

function defaultBoosterEngine(engines) {
  return getEngine('srb_blob', engines) ?? getEngine('lm5_booster_blob', engines) ?? engines[0] ?? null;
}

function defaultLiquidBoosterEngine(engines) {
  return getEngine('lm5_booster_blob', engines) ?? engines.find((engine) => engine.propellant !== 'SOLID') ?? null;
}

export function defaultTankFractionForPropellant(propellant) {
  return DEFAULT_TANK_FRACTIONS[propellant] ?? 0.06;
}

function boosterTypeForEngine(engine) {
  return engine?.propellant === 'SOLID' ? BOOSTER_TYPES.SOLID : BOOSTER_TYPES.LIQUID;
}

export function canShowNozzleToggle(engine) {
  return Boolean(
    engine &&
      engine.isp_sl > 0 &&
      engine.thrust_sl_kN > 0 &&
      engine.isp_vac > 0 &&
      engine.thrust_vac_kN > 0
  );
}

function defaultNozzle(engine, index) {
  if (!canShowNozzleToggle(engine)) {
    return 'auto';
  }

  return index === 0 ? 'sl' : 'vac';
}

function stageName(stage, index) {
  if (stage.nameKey) {
    return t(stage.nameKey);
  }

  if (stage.customLabel && stage.customLabel.trim()) {
    return stage.customLabel.trim();
  }

  return formatMessage('designer_v2.card.stage_number', { number: index + 1 });
}

function stageRole(index, total) {
  if (total === 1) {
    return t('designer.stage.role.only');
  }

  if (index === 0) {
    return t('designer.stage.role.bottom');
  }

  if (index === total - 1) {
    return t('designer.stage.role.top');
  }

  return t('designer.stage.role.middle');
}

function buildStageDraft(engines, stage = {}, index = 0) {
  const engine = getEngine(stage.engineKey, engines) ?? defaultEngineForStage(engines, index);
  const propellantMassKg = stage.propellantMassKg ?? engine?.fixed_propellant_kg ?? 120000;

  return {
    nameKey: stage.nameKey ?? null,
    customLabel: stage.label ?? '',
    engineKey: engine?.key ?? '',
    engineCount: editableNumber(stage.engineCount ?? 1, 0),
    nozzle: stage.nozzle ?? defaultNozzle(engine, index),
    propellantTons: editableNumber(propellantMassKg / 1000, 1),
    tankFraction: editableNumber(
      stage.tankFraction ?? defaultTankFractionForPropellant(engine?.propellant),
      2
    ),
    fairingMassKg: stage.fairingMassKg ?? null,
  };
}

function buildBoosterDraft(engines, boosters = {}) {
  const requestedType = boosters.type ?? boosterTypeForEngine(getEngine(boosters.engineKey, engines));
  const engine =
    requestedType === BOOSTER_TYPES.SOLID
      ? getEngine('srb_blob', engines) ?? defaultBoosterEngine(engines)
      : getEngine(boosters.engineKey, engines) ?? defaultLiquidBoosterEngine(engines) ?? defaultBoosterEngine(engines);
  const propellantMassKg = boosters.propellantMassKg ?? engine?.fixed_propellant_kg ?? 250000;

  return {
    nameKey: boosters.nameKey ?? null,
    customLabel: boosters.label ?? '',
    type: requestedType ?? BOOSTER_TYPES.SOLID,
    engineKey: engine?.key ?? '',
    count: editableNumber(boosters.count ?? 0, 0),
    engineCount: editableNumber(boosters.engineCount ?? 1, 0),
    nozzle: boosters.nozzle ?? 'auto',
    propellantTons: editableNumber(propellantMassKg / 1000, 1),
    tankFraction: editableNumber(
      boosters.tankFraction ?? defaultTankFractionForPropellant(engine?.propellant),
      2
    ),
  };
}

export function loadDraftFromPreset(presetId, engines) {
  const option = getPresetOption(presetId);

  if (!option.preset) {
    return {
      presetId: 'custom',
      payloadMassKg: '1000',
      stages: [buildStageDraft(engines, {}, 0, 1)],
      boosters: buildBoosterDraft(engines, { count: 0, type: BOOSTER_TYPES.SOLID }),
    };
  }

  const stages = option.preset.stages.map((stage, index, allStages) =>
    buildStageDraft(
      engines,
      {
        ...stage,
        nameKey: option.stageNameKeys?.[index] ?? null,
      },
      index,
      allStages.length
    )
  );

  return {
    presetId: option.id,
    payloadMassKg: editableNumber(option.preset.payloadMassKg, 0),
    stages,
      boosters: option.preset.boosters
        ? buildBoosterDraft(engines, {
            ...option.preset.boosters,
            nameKey: option.boosterNameKey ?? null,
          })
        : buildBoosterDraft(engines, { count: 0, type: BOOSTER_TYPES.SOLID }),
    };
}

export function reorderUpperStages(stages, fromIndex, toIndex) {
  if (
    fromIndex <= 0 ||
    toIndex <= 0 ||
    fromIndex === toIndex ||
    fromIndex >= stages.length ||
    toIndex >= stages.length
  ) {
    return stages;
  }

  const nextStages = [...stages];
  const [moved] = nextStages.splice(fromIndex, 1);
  nextStages.splice(toIndex, 0, moved);
  return nextStages;
}

function applyDraft(draft) {
  state.presetId = draft.presetId;
  state.payloadMassKg = draft.payloadMassKg;
  state.stages = draft.stages;
  state.boosters = draft.boosters ?? buildBoosterDraft(state.engines, { count: 0, type: BOOSTER_TYPES.SOLID });
}

function syncStateFromInputs() {
  const presetSelect = document.getElementById('preset-select');
  if (presetSelect) {
    state.presetId = presetSelect.value;
  }

  const payloadInput = document.getElementById('payload-mass');
  if (payloadInput) {
    state.payloadMassKg = payloadInput.value;
  }

  state.stages = state.stages.map((stage, index) => ({
    ...stage,
    engineKey: document.getElementById(`stage-${index}-engine`)?.value ?? stage.engineKey,
    engineCount: document.getElementById(`stage-${index}-engine-count`)?.value ?? stage.engineCount,
    nozzle:
      document.querySelector(`input[name="stage-${index}-nozzle"]:checked`)?.value ?? stage.nozzle,
    propellantTons:
      document.getElementById(`stage-${index}-propellant-number`)?.value ?? stage.propellantTons,
    tankFraction:
      document.getElementById(`stage-${index}-tank-number`)?.value ?? stage.tankFraction,
  }));

  if (state.boosters) {
    state.boosters = {
      ...state.boosters,
      type:
        document.querySelector('input[name="booster-type"]:checked')?.value ?? state.boosters.type,
      engineKey: document.getElementById('booster-engine')?.value ?? state.boosters.engineKey,
      count: document.getElementById('booster-count')?.value ?? state.boosters.count,
      engineCount:
        document.getElementById('booster-engine-count')?.value ?? state.boosters.engineCount,
      nozzle:
        document.querySelector('input[name="booster-nozzle"]:checked')?.value ?? state.boosters.nozzle,
      propellantTons:
        document.getElementById('booster-propellant-number')?.value ?? state.boosters.propellantTons,
      tankFraction:
        document.getElementById('booster-tank-number')?.value ?? state.boosters.tankFraction,
    };
  }
}

function setPairedValue(id, value) {
  const input = document.getElementById(id);
  if (input) {
    input.value = value;
  }
}

function clearErrors() {
  document.querySelectorAll('#designer-v2-form .field-error').forEach((element) => {
    element.textContent = '';
  });

  document.querySelectorAll('#designer-v2-form input, #designer-v2-form select').forEach((element) => {
    element.classList.remove('input-invalid');
    element.removeAttribute('aria-invalid');
  });
}

function setFieldError(id, message) {
  const input = document.getElementById(id);
  const error = document.getElementById(`${id}-error`);

  if (input) {
    input.classList.add('input-invalid');
    input.setAttribute('aria-invalid', 'true');
  }

  if (error) {
    error.textContent = message;
  }
}

function readNumber(rawValue, { min = -Infinity, max = Infinity, integer = false, label, inputId }, errors) {
  const value = Number(rawValue);

  if (rawValue === '' || !Number.isFinite(value)) {
    errors.push({
      id: inputId,
      message: formatMessage('designer_v2.error.finite', { label }),
    });
    return null;
  }

  if (integer && !Number.isInteger(value)) {
    errors.push({
      id: inputId,
      message: formatMessage('designer_v2.error.integer', { label }),
    });
    return null;
  }

  if (value < min || value > max) {
    errors.push({
      id: inputId,
      message: formatMessage('designer_v2.error.range', { label, min, max }),
    });
    return null;
  }

  return value;
}

function buildStageConfig(stage, index, total) {
  const topStage = index === total - 1;
  const config = {
    label: stageName(stage, index),
    engineKey: stage.engineKey,
    engineCount: Number(stage.engineCount),
    propellantMassKg: Number(stage.propellantTons) * 1000,
    tankFraction: Number(stage.tankFraction),
  };

  if (canShowNozzleToggle(getEngine(stage.engineKey))) {
    config.nozzle = stage.nozzle;
  }

  if (topStage) {
    if (stage.fairingMassKg !== null) {
      config.fairingMassKg = stage.fairingMassKg;
    }
  } else {
    config.fairingMassKg = 0;
  }

  return config;
}

export function buildAnalyzeConfig(draft = state) {
  const option = getPresetOption(draft.presetId);
  const boostersActive = draft.boosters && Number(draft.boosters.count) > 0;

  return {
    payloadMassKg: Number(draft.payloadMassKg),
    missionTarget: option.preset?.missionTarget ?? null,
    stages: draft.stages.map((stage, index, stages) => buildStageConfig(stage, index, stages.length)),
    boosters:
      boostersActive
        ? {
            label: draft.boosters.nameKey ? t(draft.boosters.nameKey) : t('designer_v2.card.boosters'),
            engineKey:
              draft.boosters.type === BOOSTER_TYPES.SOLID ? 'srb_blob' : draft.boosters.engineKey,
            count: Number(draft.boosters.count),
            engineCount:
              draft.boosters.type === BOOSTER_TYPES.SOLID ? 1 : Number(draft.boosters.engineCount),
            propellantMassKg: Number(draft.boosters.propellantTons) * 1000,
            ...(draft.boosters.type === BOOSTER_TYPES.LIQUID
              ? { tankFraction: Number(draft.boosters.tankFraction) }
              : {}),
            ...(draft.boosters.type === BOOSTER_TYPES.LIQUID &&
            canShowNozzleToggle(getEngine(draft.boosters.engineKey))
              ? { nozzle: draft.boosters.nozzle }
              : {}),
          }
        : null,
  };
}

function parseDraft() {
  const errors = [];
  const engineMap = getEngineMap();

  const payloadMassKg = readNumber(
    state.payloadMassKg,
    {
      min: 0,
      max: 500000,
      label: t('designer.field.payload'),
      inputId: 'payload-mass',
    },
    errors
  );

  state.stages.forEach((stage, index) => {
    if (!engineMap.has(stage.engineKey)) {
      errors.push({
        id: `stage-${index}-engine`,
        message: t('designer_v2.error.engine_required'),
      });
    }

    readNumber(
      stage.engineCount,
      {
        min: 1,
        max: MAX_ENGINE_COUNT,
        integer: true,
        label: t('designer_v2.field.engine_count'),
        inputId: `stage-${index}-engine-count`,
      },
      errors
    );
    readNumber(
      stage.propellantTons,
      {
        min: PROP_TONS_RANGE.min,
        max: PROP_TONS_RANGE.max,
        label: t('designer_v2.field.propellant_tons'),
        inputId: `stage-${index}-propellant-number`,
      },
      errors
    );
    readNumber(
      stage.tankFraction,
      {
        min: TANK_FRACTION_RANGE.min,
        max: TANK_FRACTION_RANGE.max,
        label: t('designer_v2.field.tank_fraction'),
        inputId: `stage-${index}-tank-number`,
      },
      errors
    );
  });

  if (state.boosters) {
    const boostersActive = Number(state.boosters.count) > 0;
    const boosterIsLiquid = state.boosters.type === BOOSTER_TYPES.LIQUID;

    readNumber(
      state.boosters.count,
      {
        min: 0,
        max: MAX_BOOSTERS,
        integer: true,
        label: t('designer_v2.field.booster_count'),
        inputId: 'booster-count',
      },
      errors
    );

    if (boostersActive && !engineMap.has(state.boosters.engineKey)) {
      errors.push({
        id: 'booster-engine',
        message: t('designer_v2.error.engine_required'),
      });
    }

    if (boostersActive && boosterIsLiquid) {
      readNumber(
        state.boosters.engineCount,
        {
          min: 1,
          max: MAX_ENGINE_COUNT,
          integer: true,
          label: t('designer_v2.field.engine_count'),
          inputId: 'booster-engine-count',
        },
        errors
      );
    }

    if (boostersActive) {
      readNumber(
        state.boosters.propellantTons,
        {
          min: PROP_TONS_RANGE.min,
          max: PROP_TONS_RANGE.max,
          label: t('designer_v2.field.propellant_tons'),
          inputId: 'booster-propellant-number',
        },
        errors
      );
    }

    if (boostersActive && boosterIsLiquid) {
      readNumber(
        state.boosters.tankFraction,
        {
          min: TANK_FRACTION_RANGE.min,
          max: TANK_FRACTION_RANGE.max,
          label: t('designer_v2.field.tank_fraction'),
          inputId: 'booster-tank-number',
        },
        errors
      );
    }
  }

  if (errors.length > 0 || payloadMassKg === null) {
    return { errors, config: null, result: null };
  }

  try {
    const config = buildAnalyzeConfig({
      ...state,
      payloadMassKg: String(payloadMassKg),
    });
    return { errors, config, result: analyze(config) };
  } catch (error) {
    return {
      errors: [
        {
          id: 'designer-v2-error',
          message: error instanceof Error ? error.message : t('designer_v2.error.analysis_failed'),
        },
      ],
      config: null,
      result: null,
    };
  }
}

function engineOptionsMarkup(selectedKey, engines = state.engines) {
  return engines
    .map(
      (engine) =>
        `<option value="${engine.key}"${engine.key === selectedKey ? ' selected' : ''}>${t(
          `designer_v2.engine.${engine.key}`
        )}</option>`
    )
    .join('');
}

function nozzleMarkup({ groupName, engine, value }) {
  if (!canShowNozzleToggle(engine)) {
    return `<p class="designer-v2-note">${t('designer_v2.controls.nozzle_auto')}</p>`;
  }

  return `
    <div class="designer-v2-toggle" role="radiogroup" aria-label="${t('designer_v2.field.nozzle')}">
      <label>
        <input type="radio" name="${groupName}" value="sl"${value === 'sl' ? ' checked' : ''} />
        <span>${t('designer_v2.nozzle.sl')}</span>
      </label>
      <label>
        <input type="radio" name="${groupName}" value="vac"${value === 'vac' ? ' checked' : ''} />
        <span>${t('designer_v2.nozzle.vac')}</span>
      </label>
    </div>
  `;
}

function metricMarkup(label, value, extraClass = '') {
  return `
    <article class="designer-v2-metric">
      <h4>${label}</h4>
      <p class="${extraClass}">${value}</p>
    </article>
  `;
}

function structuralBadge(entry) {
  if (!entry) {
    return '—';
  }

  const icon = entry.health === 'realistic' ? '🟢' : entry.health === 'optimistic' ? '🟡' : '🔴';
  const label = t(`designer_v2.structural.${entry.health}`);

  return `<span class="designer-v2-structural is-${entry.health}">${icon} ${label} (${ratioFmt.format(
    entry.ratio ?? 0
  )})</span>`;
}

function liquidBoosterEngines() {
  return state.engines.filter((engine) => engine.propellant !== 'SOLID');
}

function stageMetricsMarkup(summary) {
  if (!summary) {
    return [
      metricMarkup(t('designer_v2.metric.dry_mass'), '—'),
      metricMarkup(t('designer_v2.metric.wet_mass'), '—'),
      metricMarkup(t('designer_v2.metric.delta_v'), '—'),
      metricMarkup(t('designer_v2.metric.twr_ignition'), '—'),
      metricMarkup(t('designer_v2.metric.twr_burnout'), '—'),
      metricMarkup(t('designer_v2.metric.burn_time'), '—'),
      metricMarkup(t('designer_v2.metric.structural'), '—'),
    ].join('');
  }

  return [
    metricMarkup(t('designer_v2.metric.dry_mass'), `${numberFmt.format(Math.round(summary.dry_mass_kg))} kg`),
    metricMarkup(t('designer_v2.metric.wet_mass'), `${numberFmt.format(Math.round(summary.wet_mass_kg))} kg`),
    metricMarkup(t('designer_v2.metric.delta_v'), `${numberFmt.format(Math.round(summary.dv_ms))} m/s`),
    metricMarkup(t('designer_v2.metric.twr_ignition'), twrFmt.format(summary.twr_ignition)),
    metricMarkup(t('designer_v2.metric.twr_burnout'), twrFmt.format(summary.twr_burnout)),
    metricMarkup(t('designer_v2.metric.burn_time'), `${numberFmt.format(Math.round(summary.burn_time_s))} s`),
    metricMarkup(t('designer_v2.metric.structural'), structuralBadge(summary.structural_index)),
  ].join('');
}

function stageCardMarkup(stage, index, analysis) {
  const engine = getEngine(stage.engineKey);
  const stageSummary = analysis?.stages?.[index] ?? null;
  const topStage = index === state.stages.length - 1;
  const reorderable = index > 0;

  return `
    <article
      class="designer-v2-card"
      data-stage-index="${index}"
      ${reorderable ? 'draggable="true"' : ''}
      aria-labelledby="stage-${index}-title"
    >
      <div class="designer-v2-card-header">
        <div>
          <p class="designer-v2-card-role">${stageRole(index, state.stages.length)}</p>
          <h3 id="stage-${index}-title">${stageName(stage, index)}</h3>
        </div>
        <div class="designer-v2-card-tools">
          ${
            reorderable
              ? `<button type="button" class="designer-v2-drag-handle" data-drag-handle="${index}">${t(
                  'designer_v2.controls.drag_stage'
                )}</button>`
              : ''
          }
        </div>
      </div>

      <div class="designer-v2-field-grid">
        <div class="form-field">
          <label for="stage-${index}-engine">${t('designer_v2.field.engine')}</label>
          <select id="stage-${index}-engine" name="stage-${index}-engine">${engineOptionsMarkup(
            stage.engineKey
          )}</select>
          <p id="stage-${index}-engine-error" class="field-error" aria-live="polite"></p>
        </div>

        <div class="form-field">
          <label for="stage-${index}-engine-count">${t('designer_v2.field.engine_count')}</label>
          <input
            id="stage-${index}-engine-count"
            type="number"
            inputmode="numeric"
            min="1"
            max="${MAX_ENGINE_COUNT}"
            step="1"
            value="${stage.engineCount}"
          />
          <p id="stage-${index}-engine-count-error" class="field-error" aria-live="polite"></p>
        </div>

        <div class="form-field">
          <label>${t('designer_v2.field.nozzle')}</label>
          ${nozzleMarkup({ groupName: `stage-${index}-nozzle`, engine, value: stage.nozzle })}
        </div>

        <div class="form-field">
          <label for="stage-${index}-propellant-number">${t('designer_v2.field.propellant_tons')}</label>
          <div class="designer-v2-range-row">
            <input
              id="stage-${index}-propellant-range"
              type="range"
              min="${PROP_TONS_RANGE.min}"
              max="${PROP_TONS_RANGE.max}"
              step="${PROP_TONS_RANGE.step}"
              value="${stage.propellantTons}"
            />
            <input
              id="stage-${index}-propellant-number"
              type="number"
              inputmode="decimal"
              min="${PROP_TONS_RANGE.min}"
              max="${PROP_TONS_RANGE.max}"
              step="${PROP_TONS_RANGE.step}"
              value="${stage.propellantTons}"
            />
          </div>
          <p id="stage-${index}-propellant-number-error" class="field-error" aria-live="polite"></p>
        </div>

        <div class="form-field">
          <label for="stage-${index}-tank-number">${t('designer_v2.field.tank_fraction')}</label>
          <div class="designer-v2-range-row">
            <input
              id="stage-${index}-tank-range"
              type="range"
              min="${TANK_FRACTION_RANGE.min}"
              max="${TANK_FRACTION_RANGE.max}"
              step="${TANK_FRACTION_RANGE.step}"
              value="${stage.tankFraction}"
            />
            <input
              id="stage-${index}-tank-number"
              type="number"
              inputmode="decimal"
              min="${TANK_FRACTION_RANGE.min}"
              max="${TANK_FRACTION_RANGE.max}"
              step="${TANK_FRACTION_RANGE.step}"
              value="${stage.tankFraction}"
            />
          </div>
          <p id="stage-${index}-tank-number-error" class="field-error" aria-live="polite"></p>
        </div>

        ${
          topStage
            ? `<div class="form-field">
                <label for="payload-mass">${t('designer.field.payload')}</label>
                <input
                  id="payload-mass"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="100"
                  value="${state.payloadMassKg}"
                />
                <p id="payload-mass-error" class="field-error" aria-live="polite"></p>
              </div>`
            : ''
        }
      </div>

      ${
        topStage
          ? `<p class="designer-v2-note">${t('designer_v2.card.fairing_note')}</p>`
          : ''
      }

      <div id="stage-${index}-metrics" class="designer-v2-metrics" aria-live="polite">
        ${stageMetricsMarkup(stageSummary)}
      </div>
    </article>
  `;
}

function boosterCardMarkup(analysis) {
  const boosters = state.boosters ?? buildBoosterDraft(state.engines, { count: 0, type: BOOSTER_TYPES.SOLID });
  const engine =
    boosters.type === BOOSTER_TYPES.SOLID ? getEngine('srb_blob') : getEngine(boosters.engineKey);
  const boosterSummary = analysis?.boosters ?? null;
  const boostersActive = Number(boosters.count) > 0;
  const boosterTypeIsSolid = boosters.type === BOOSTER_TYPES.SOLID;
  const liquidEngines = liquidBoosterEngines();

  return `
    <article class="designer-v2-card" aria-labelledby="booster-title">
      <div class="designer-v2-card-header">
        <div>
          <p class="designer-v2-card-role">${t('designer_v2.card.parallel_boosters')}</p>
          <h3 id="booster-title">${
            boosters.nameKey ? t(boosters.nameKey) : t('designer_v2.card.boosters')
          }</h3>
        </div>
      </div>

      <div class="designer-v2-field-grid">
        <div class="form-field">
          <label>${t('designer_v2.field.booster_type')}</label>
          <div class="designer-v2-toggle is-wide" role="radiogroup" aria-label="${t('designer_v2.field.booster_type')}">
            <label>
              <input type="radio" name="booster-type" value="${BOOSTER_TYPES.LIQUID}"${
                boosters.type === BOOSTER_TYPES.LIQUID ? ' checked' : ''
              } />
              <span>${t('designer_v2.booster_type.liquid')}</span>
            </label>
            <label>
              <input type="radio" name="booster-type" value="${BOOSTER_TYPES.SOLID}"${
                boosters.type === BOOSTER_TYPES.SOLID ? ' checked' : ''
              } />
              <span>${t('designer_v2.booster_type.solid')}</span>
            </label>
          </div>
        </div>

        <div class="form-field">
          <label for="booster-engine">${t('designer_v2.field.engine')}</label>
          ${
            boosterTypeIsSolid
              ? `<p class="designer-v2-note">${t('designer_v2.controls.solid_booster_note')}</p>
                 <input id="booster-engine" type="hidden" value="srb_blob" />`
              : `<select id="booster-engine" name="booster-engine">${engineOptionsMarkup(
                  boosters.engineKey,
                  liquidEngines
                )}</select>`
          }
          <p id="booster-engine-error" class="field-error" aria-live="polite"></p>
        </div>

        <div class="form-field">
          <label for="booster-count">${t('designer_v2.field.booster_count')}</label>
          <input
            id="booster-count"
            type="number"
            inputmode="numeric"
            min="0"
            max="${MAX_BOOSTERS}"
            step="1"
            value="${boosters.count}"
          />
          <p id="booster-count-error" class="field-error" aria-live="polite"></p>
        </div>

        <div class="form-field ${boostersActive && !boosterTypeIsSolid ? '' : 'designer-v2-hidden'}">
          <label for="booster-engine-count">${t('designer_v2.field.engine_count')}</label>
          <input
            id="booster-engine-count"
            type="number"
            inputmode="numeric"
            min="1"
            max="${MAX_ENGINE_COUNT}"
            step="1"
            value="${boosters.engineCount}"
          />
          <p id="booster-engine-count-error" class="field-error" aria-live="polite"></p>
        </div>

        <div class="form-field ${boostersActive && !boosterTypeIsSolid ? '' : 'designer-v2-hidden'}">
          <label>${t('designer_v2.field.nozzle')}</label>
          ${nozzleMarkup({ groupName: 'booster-nozzle', engine, value: boosters.nozzle })}
        </div>

        <div class="form-field ${boostersActive ? '' : 'designer-v2-hidden'}">
          <label for="booster-propellant-number">${t('designer_v2.field.propellant_tons')}</label>
          <div class="designer-v2-range-row">
            <input
              id="booster-propellant-range"
              type="range"
              min="${PROP_TONS_RANGE.min}"
              max="${PROP_TONS_RANGE.max}"
              step="${PROP_TONS_RANGE.step}"
              value="${boosters.propellantTons}"
            />
            <input
              id="booster-propellant-number"
              type="number"
              inputmode="decimal"
              min="${PROP_TONS_RANGE.min}"
              max="${PROP_TONS_RANGE.max}"
              step="${PROP_TONS_RANGE.step}"
              value="${boosters.propellantTons}"
            />
          </div>
          <p id="booster-propellant-number-error" class="field-error" aria-live="polite"></p>
        </div>

        <div class="form-field ${boostersActive && !boosterTypeIsSolid ? '' : 'designer-v2-hidden'}">
          <label for="booster-tank-number">${t('designer_v2.field.tank_fraction')}</label>
          <div class="designer-v2-range-row">
            <input
              id="booster-tank-range"
              type="range"
              min="${TANK_FRACTION_RANGE.min}"
              max="${TANK_FRACTION_RANGE.max}"
              step="${TANK_FRACTION_RANGE.step}"
              value="${boosters.tankFraction}"
            />
            <input
              id="booster-tank-number"
              type="number"
              inputmode="decimal"
              min="${TANK_FRACTION_RANGE.min}"
              max="${TANK_FRACTION_RANGE.max}"
              step="${TANK_FRACTION_RANGE.step}"
              value="${boosters.tankFraction}"
            />
          </div>
          <p id="booster-tank-number-error" class="field-error" aria-live="polite"></p>
        </div>
      </div>

      ${
        boostersActive
          ? ''
          : `<p class="designer-v2-note">${t('designer_v2.card.boosters_inactive')}</p>`
      }

      <div id="booster-metrics" class="designer-v2-metrics" aria-live="polite">
        ${stageMetricsMarkup(boosterSummary)}
      </div>
    </article>
  `;
}

function renderCards(result = null) {
  const stageList = document.getElementById('stage-list');
  const boosterSlot = document.getElementById('booster-slot');
  const addStage = document.getElementById('add-stage');
  const removeStage = document.getElementById('remove-stage');
  const presetSelect = document.getElementById('preset-select');

  if (!stageList || !boosterSlot || !addStage || !removeStage || !presetSelect) {
    return;
  }

  presetSelect.innerHTML = PRESET_OPTIONS.map(
    (option) =>
      `<option value="${option.id}"${option.id === state.presetId ? ' selected' : ''}>${t(
        option.labelKey
      )}</option>`
  ).join('');

  stageList.innerHTML = state.stages.map((stage, index) => stageCardMarkup(stage, index, result)).join('');
  boosterSlot.innerHTML = boosterCardMarkup(result);
  addStage.disabled = state.stages.length >= MAX_STAGES;
  removeStage.disabled = state.stages.length <= MIN_STAGES;
}

function renderMetricContainers(result = null) {
  state.stages.forEach((_, index) => {
    const container = document.getElementById(`stage-${index}-metrics`);
    if (container) {
      container.innerHTML = stageMetricsMarkup(result?.stages?.[index] ?? null);
    }
  });

  const boosterContainer = document.getElementById('booster-metrics');
  if (boosterContainer) {
    boosterContainer.innerHTML = stageMetricsMarkup(result?.boosters ?? null);
  }
}

export function missionProgressPercent(deltaVKmS) {
  const max = MISSION_MARKERS[MISSION_MARKERS.length - 1].thresholdKmS;
  if (!Number.isFinite(deltaVKmS) || deltaVKmS <= 0) {
    return 0;
  }

  return Math.min((deltaVKmS / max) * 100, 100);
}

function translatedVerdict(rawVerdict) {
  return t(VERDICT_KEY_MAP[rawVerdict] ?? 'designer_v2.verdict.suborbital');
}

function translateWarning(rawWarning) {
  const patterns = [
    [/^won't lift off$/, 'designer_v2.warning.no_liftoff'],
    [/^marginal liftoff$/, 'designer_v2.warning.marginal_liftoff'],
    [/^(.*): upper-stage TWR below 0\.5\.$/, 'designer_v2.warning.upper_stage_low_twr'],
    [
      /^(.*): vacuum nozzle selected at sea level; using mixed launch performance\.$/,
      'designer_v2.warning.vacuum_at_sea_level',
    ],
    [/^(.*): vacuum-only engine used at sea level\.$/, 'designer_v2.warning.vacuum_only_launch'],
    [/^(.*): sea-level nozzle selected on an upper stage\.$/, 'designer_v2.warning.sl_on_upper_stage'],
  ];

  for (const [pattern, key] of patterns) {
    const match = rawWarning.match(pattern);
    if (match) {
      return match[1] ? formatMessage(key, { label: match[1] }) : t(key);
    }
  }

  return rawWarning;
}

function renderMissionBar(result) {
  const container = document.getElementById('mission-bar');
  if (!container) {
    return;
  }

  const progress = missionProgressPercent(result?.total?.dv_kms ?? 0);
  container.style.setProperty('--mission-progress', `${progress}%`);

  const markers = MISSION_MARKERS.map((marker) => {
    const percent = missionProgressPercent(marker.thresholdKmS);
    const isHit = (result?.total?.dv_kms ?? 0) >= marker.thresholdKmS;
    const isTarget = result?.total?.mission_target === marker.mission;

    return `
      <li style="left:${percent}%" class="${isHit ? 'is-hit' : ''} ${isTarget ? 'is-target' : ''}">
        <strong>${marker.mission === 'Lunar landing' ? 'L' : marker.mission[0]}</strong>
        <span>${t(marker.labelKey)}</span>
      </li>
    `;
  }).join('');

  container.innerHTML = `
    <div class="designer-v2-mission-track">
      <div class="designer-v2-mission-fill"></div>
      <span class="designer-v2-mission-current" aria-hidden="true"></span>
    </div>
    <ol class="designer-v2-mission-markers">${markers}</ol>
  `;
}

function renderSummary(result, blocked, errorMessage = '') {
  const totalDv = document.getElementById('total-dv');
  const verdictPill = document.getElementById('verdict-pill');
  const missionTarget = document.getElementById('mission-target');
  const boosterPhase = document.getElementById('booster-phase');
  const warningsList = document.getElementById('warnings-list');
  const summaryStatus = document.getElementById('summary-status');
  const analyzeButton = document.getElementById('analyze-button');
  const errorEl = document.getElementById('designer-v2-error');

  if (
    !totalDv ||
    !verdictPill ||
    !missionTarget ||
    !boosterPhase ||
    !warningsList ||
    !summaryStatus ||
    !analyzeButton ||
    !errorEl
  ) {
    return;
  }

  errorEl.hidden = !errorMessage;
  errorEl.textContent = errorMessage;

  if (!result) {
    totalDv.textContent = '—';
    verdictPill.textContent = '—';
    verdictPill.className = 'designer-v2-verdict-pill';
    missionTarget.textContent = '—';
    boosterPhase.textContent = '—';
    warningsList.innerHTML = `<li>${t('designer_v2.summary.awaiting')}</li>`;
    summaryStatus.textContent = errorMessage || t('designer_v2.summary.invalid');
    analyzeButton.disabled = true;
    renderMissionBar(null);
    return;
  }

  const verdictClass =
    result.total.verdict === 'Suborbital'
      ? 'is-suborbital'
      : result.total.verdict === 'Mars'
        ? 'is-mars'
        : result.total.verdict === 'Lunar landing'
          ? 'is-lunar'
          : '';

  totalDv.textContent = `${oneDecimalFmt.format(result.total.dv_kms)} km/s`;
  verdictPill.textContent = translatedVerdict(result.total.verdict);
  verdictPill.className = `designer-v2-verdict-pill ${verdictClass}`.trim();

  if (result.total.mission_target) {
    missionTarget.textContent = formatMessage(
      result.total.target_met
        ? 'designer_v2.summary.target_met'
        : 'designer_v2.summary.target_missed',
      {
        target: translatedVerdict(result.total.mission_target),
      }
    );
  } else {
    missionTarget.textContent = t('designer_v2.summary.no_target');
  }

  boosterPhase.textContent = result.boosters
    ? formatMessage('designer_v2.summary.booster_jettison', {
        dv: oneDecimalFmt.format(result.boosters.dv_ms / 1000),
        propellant: oneDecimalFmt.format(result.boosters.stage1_remaining_propellant_kg / 1000),
      })
    : t('designer_v2.summary.no_booster_phase');

  warningsList.innerHTML =
    result.total.warnings.length > 0
      ? result.total.warnings.map((warning) => `<li>${translateWarning(warning)}</li>`).join('')
      : `<li>${t('designer_v2.summary.no_warnings')}</li>`;
  summaryStatus.textContent = blocked
    ? t('designer_v2.summary.blocked')
    : t('designer_v2.summary.ready');
  analyzeButton.disabled = blocked;
  renderMissionBar(result);
}

function renderValidationErrors(errors) {
  errors.forEach(({ id, message }) => {
    if (id === 'designer-v2-error') {
      return;
    }

    setFieldError(id, message);
  });

  const generalError = errors.find((error) => error.id === 'designer-v2-error');
  renderMetricContainers(null);
  renderSummary(null, true, generalError?.message ?? t('designer_v2.error.fix_inputs'));
}

function updateOutputs() {
  clearErrors();
  syncStateFromInputs();

  const parsed = parseDraft();

  if (parsed.errors.length > 0 || !parsed.result) {
    renderValidationErrors(parsed.errors);
    return;
  }

  renderMetricContainers(parsed.result);
  const blocked = Boolean(parsed.result.structural_index?.blocked);
  renderSummary(parsed.result, blocked);
}

function resetTankFractionForStage(index, engineKey) {
  const engine = getEngine(engineKey);
  if (!engine) {
    return;
  }

  state.stages[index] = {
    ...state.stages[index],
    engineKey,
    tankFraction: editableNumber(defaultTankFractionForPropellant(engine.propellant), 2),
    nozzle: defaultNozzle(engine, index),
  };
}

function resetBoostersForEngine(engineKey) {
  const engine = getEngine(engineKey);
  if (!engine || !state.boosters) {
    return;
  }

  state.boosters = {
    ...state.boosters,
    type: boosterTypeForEngine(engine),
    engineKey,
    tankFraction: editableNumber(defaultTankFractionForPropellant(engine.propellant), 2),
    nozzle: canShowNozzleToggle(engine) ? 'sl' : 'auto',
  };
}

function resetBoosterType(type) {
  if (!state.boosters) {
    state.boosters = buildBoosterDraft(state.engines, { count: 0, type });
    return;
  }

  const engine =
    type === BOOSTER_TYPES.SOLID ? getEngine('srb_blob') : defaultLiquidBoosterEngine(state.engines);

  state.boosters = {
    ...state.boosters,
    type,
    engineKey: engine?.key ?? state.boosters.engineKey,
    engineCount: type === BOOSTER_TYPES.SOLID ? '1' : state.boosters.engineCount,
    nozzle: type === BOOSTER_TYPES.SOLID ? 'auto' : defaultNozzle(engine, 0),
    tankFraction: editableNumber(defaultTankFractionForPropellant(engine?.propellant), 2),
    propellantTons: editableNumber((engine?.fixed_propellant_kg ?? 250000) / 1000, 1),
  };
}

function addStage() {
  syncStateFromInputs();
  if (state.stages.length >= MAX_STAGES) {
    return;
  }

  state.stages.push(buildStageDraft(state.engines, {}, state.stages.length, state.stages.length + 1));
  state.presetId = 'custom';
  renderCards();
  updateOutputs();
}

function removeStage() {
  syncStateFromInputs();
  if (state.stages.length <= MIN_STAGES) {
    return;
  }

  state.stages.pop();
  state.presetId = 'custom';
  renderCards();
  updateOutputs();
}

function loadPreset(presetId) {
  applyDraft(loadDraftFromPreset(presetId, state.engines));
  renderCards();
  updateOutputs();
}

function handleFormInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.id.endsWith('-propellant-range')) {
    setPairedValue(target.id.replace('-range', '-number'), target.value);
  }

  if (target.id.endsWith('-propellant-number')) {
    setPairedValue(target.id.replace('-number', '-range'), target.value);
  }

  if (target.id.endsWith('-tank-range')) {
    setPairedValue(target.id.replace('-range', '-number'), target.value);
  }

  if (target.id.endsWith('-tank-number')) {
    setPairedValue(target.id.replace('-number', '-range'), target.value);
  }

  if (target.id.match(/^stage-\d+-engine$/)) {
    syncStateFromInputs();
    const index = Number(target.id.match(/^stage-(\d+)-engine$/)?.[1] ?? 0);
    resetTankFractionForStage(index, target.value);
    state.presetId = 'custom';
    renderCards();
  }

  if (target.id === 'booster-engine') {
    syncStateFromInputs();
    resetBoostersForEngine(target.value);
    state.presetId = 'custom';
    renderCards();
  }

  if (target.getAttribute('name') === 'booster-type') {
    syncStateFromInputs();
    resetBoosterType(target.value);
    state.presetId = 'custom';
    renderCards();
  }

  updateOutputs();
}

function handlePresetChange(event) {
  loadPreset(event.target.value);
}

function handleAnalyzeClick() {
  syncStateFromInputs();
  updateOutputs();
}

function enableDragAndDrop() {
  const stageList = document.getElementById('stage-list');
  if (!stageList) {
    return;
  }

  let draggedIndex = null;

  stageList.addEventListener('dragstart', (event) => {
    const card = event.target.closest('[data-stage-index]');
    if (!card) {
      return;
    }

    draggedIndex = Number(card.getAttribute('data-stage-index'));
    if (draggedIndex <= 0) {
      event.preventDefault();
      draggedIndex = null;
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
  });

  stageList.addEventListener('dragover', (event) => {
    const card = event.target.closest('[data-stage-index]');
    if (!card || draggedIndex === null) {
      return;
    }

    const targetIndex = Number(card.getAttribute('data-stage-index'));
    if (targetIndex <= 0) {
      return;
    }

    event.preventDefault();
    card.classList.add('is-drop-target');
  });

  stageList.addEventListener('dragleave', (event) => {
    const card = event.target.closest('[data-stage-index]');
    card?.classList.remove('is-drop-target');
  });

  stageList.addEventListener('drop', (event) => {
    const card = event.target.closest('[data-stage-index]');
    if (!card || draggedIndex === null) {
      return;
    }

    event.preventDefault();
    const targetIndex = Number(card.getAttribute('data-stage-index'));
    stageList.querySelectorAll('.is-drop-target').forEach((element) => {
      element.classList.remove('is-drop-target');
    });

    syncStateFromInputs();
    state.stages = reorderUpperStages(state.stages, draggedIndex, targetIndex);
    state.presetId = 'custom';
    renderCards();
    updateOutputs();
    draggedIndex = null;
  });

  stageList.addEventListener('dragend', () => {
    stageList.querySelectorAll('.is-drop-target').forEach((element) => {
      element.classList.remove('is-drop-target');
    });
    draggedIndex = null;
  });
}

async function loadCatalog() {
  const status = document.getElementById('catalog-status');
  if (status) {
    status.textContent = t('designer_v2.controls.loading_catalog');
  }

  const response = await fetch('./data/engines.json');
  if (!response.ok) {
    throw new Error(t('designer_v2.error.catalog_fetch'));
  }

  const catalog = await response.json();
  state.engines = catalog.engines ?? [];

  if (status) {
    status.textContent = t('designer_v2.controls.catalog_ready');
  }
}

async function init() {
  initPage({
    titleKey: 'page.designer_v2.title',
    descriptionKey: 'page.designer_v2.description',
  });

  if (typeof window !== 'undefined') {
    window.__analyze = analyze;
  }

  const addStageButton = document.getElementById('add-stage');
  const removeStageButton = document.getElementById('remove-stage');
  const presetSelect = document.getElementById('preset-select');
  const form = document.getElementById('designer-v2-form');
  const analyzeButton = document.getElementById('analyze-button');

  if (
    !addStageButton ||
    !removeStageButton ||
    !presetSelect ||
    !form ||
    !analyzeButton
  ) {
    return;
  }

  try {
    await loadCatalog();
  } catch (error) {
    renderSummary(
      null,
      true,
      error instanceof Error ? error.message : t('designer_v2.error.catalog_fetch')
    );
    return;
  }

  applyDraft(loadDraftFromPreset('custom', state.engines));
  renderCards();
  updateOutputs();
  enableDragAndDrop();

  addStageButton.addEventListener('click', addStage);
  removeStageButton.addEventListener('click', removeStage);
  presetSelect.addEventListener('change', handlePresetChange);
  analyzeButton.addEventListener('click', handleAnalyzeClick);
  form.addEventListener('input', handleFormInput);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
