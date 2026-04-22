import {
  analyze,
  BASELINE_ORBIT_ALTITUDE_KM,
  targetOrbitRequirementKmS,
} from './lib/designer_v2/physics.js';
import { PRESETS } from './lib/designer_v2/presets.js';
import { formatMessage, initPage, t } from './lib/i18n.js';

const MAX_STAGES = 4;
const MIN_STAGES = 1;
const MAX_BOOSTERS = 6;
const MAX_ENGINE_COUNT = 9;
const ORBIT_ALTITUDE_RANGE = { min: BASELINE_ORBIT_ALTITUDE_KM, max: 100000, step: 10 };
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
const SHARE_FRAGMENT_KEY = 'd';
const SHARE_VERSION = 1;
const VERDICT_ORDER = ['Suborbital', 'LEO', 'GTO', 'TLI', 'Mars', 'Lunar landing'];

export const MISSION_MARKERS = [
  { id: 'leo', labelKey: 'designer_v2.target.leo', glossaryId: 'orbit-leo', altitudeKm: 200, badge: 'L' },
  { id: 'iss', labelKey: 'designer_v2.target.iss', glossaryId: 'orbit-iss', altitudeKm: 400, badge: 'I' },
  { id: 'meo', labelKey: 'designer_v2.target.meo', glossaryId: 'orbit-meo', altitudeKm: 2000, badge: 'M' },
  { id: 'geo', labelKey: 'designer_v2.target.geo', glossaryId: 'orbit-geo', altitudeKm: 35786, badge: 'G' },
].map((marker) => ({
  ...marker,
  thresholdKmS: targetOrbitRequirementKmS(marker.altitudeKm),
}));

const VERDICT_KEY_MAP = {
  Suborbital: 'designer_v2.verdict.suborbital',
  LEO: 'designer_v2.verdict.leo',
  GTO: 'designer_v2.verdict.gto',
  TLI: 'designer_v2.verdict.tli',
  Mars: 'designer_v2.verdict.mars',
  'Lunar landing': 'designer_v2.verdict.lunar_landing',
};

const PRESET_SOURCE_URL = 'https://github.com/chkap/rocket-edu-mvp/issues/34#issuecomment-4289942063';

const PRESET_OPTIONS = [
  { id: 'custom', labelKey: 'designer_v2.preset.custom', preset: null },
  {
    id: 'falcon9',
    labelKey: 'designer_v2.preset.falcon9',
    preset: PRESETS.falcon9,
    featured: true,
    stageNameKeys: [
      'designer_v2.preset.falcon9.stage_1',
      'designer_v2.preset.falcon9.stage_2',
    ],
  },
  {
    id: 'saturnV',
    labelKey: 'designer_v2.preset.saturn_v',
    preset: PRESETS.saturnV,
    featured: true,
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
    featured: true,
    stageNameKeys: [
      'designer_v2.preset.long_march_5.stage_1',
      'designer_v2.preset.long_march_5.stage_2',
    ],
    boosterNameKey: 'designer_v2.preset.long_march_5.boosters',
  },
];

const GLOSSARY_TERMS = [
  { id: 'delta-v', labelKey: 'designer_v2.glossary.term.delta_v', bodyKey: 'designer_v2.glossary.body.delta_v' },
  { id: 'isp', labelKey: 'designer_v2.glossary.term.isp', bodyKey: 'designer_v2.glossary.body.isp' },
  { id: 'twr', labelKey: 'designer_v2.glossary.term.twr', bodyKey: 'designer_v2.glossary.body.twr' },
  { id: 'mr', labelKey: 'designer_v2.glossary.term.mr', bodyKey: 'designer_v2.glossary.body.mr' },
  { id: 'stage', labelKey: 'designer_v2.glossary.term.stage', bodyKey: 'designer_v2.glossary.body.stage' },
  { id: 'booster', labelKey: 'designer_v2.glossary.term.booster', bodyKey: 'designer_v2.glossary.body.booster' },
  { id: 'fairing', labelKey: 'designer_v2.glossary.term.fairing', bodyKey: 'designer_v2.glossary.body.fairing' },
  { id: 'vacuum-isp', labelKey: 'designer_v2.glossary.term.vacuum_isp', bodyKey: 'designer_v2.glossary.body.vacuum_isp' },
  { id: 'sea-level-isp', labelKey: 'designer_v2.glossary.term.sea_level_isp', bodyKey: 'designer_v2.glossary.body.sea_level_isp' },
  { id: 'specific-impulse', labelKey: 'designer_v2.glossary.term.specific_impulse', bodyKey: 'designer_v2.glossary.body.specific_impulse' },
  { id: 'mass-ratio', labelKey: 'designer_v2.glossary.term.mass_ratio', bodyKey: 'designer_v2.glossary.body.mass_ratio' },
  { id: 'burn-time', labelKey: 'designer_v2.glossary.term.burn_time', bodyKey: 'designer_v2.glossary.body.burn_time' },
  { id: 'gravity-loss', labelKey: 'designer_v2.glossary.term.gravity_loss', bodyKey: 'designer_v2.glossary.body.gravity_loss' },
  { id: 'suborbital', labelKey: 'designer_v2.glossary.term.suborbital', bodyKey: 'designer_v2.glossary.body.suborbital' },
  { id: 'orbit-leo', labelKey: 'designer_v2.glossary.term.orbit_leo', bodyKey: 'designer_v2.glossary.body.orbit_leo' },
  { id: 'orbit-iss', labelKey: 'designer_v2.glossary.term.orbit_iss', bodyKey: 'designer_v2.glossary.body.orbit_iss' },
  { id: 'orbit-meo', labelKey: 'designer_v2.glossary.term.orbit_meo', bodyKey: 'designer_v2.glossary.body.orbit_meo' },
  { id: 'orbit-geo', labelKey: 'designer_v2.glossary.term.orbit_geo', bodyKey: 'designer_v2.glossary.body.orbit_geo' },
  { id: 'orbit-gto', labelKey: 'designer_v2.glossary.term.orbit_gto', bodyKey: 'designer_v2.glossary.body.orbit_gto' },
  { id: 'orbit-tli', labelKey: 'designer_v2.glossary.term.orbit_tli', bodyKey: 'designer_v2.glossary.body.orbit_tli' },
  { id: 'mars-transfer', labelKey: 'designer_v2.glossary.term.mars_transfer', bodyKey: 'designer_v2.glossary.body.mars_transfer' },
  {
    id: 'lunar-landing',
    labelKey: 'designer_v2.glossary.term.lunar_landing',
    bodyKey: 'designer_v2.glossary.body.lunar_landing',
  },
];

const GLOSSARY_TERM_MAP = new Map(GLOSSARY_TERMS.map((term) => [term.id, term]));
let glossaryInstanceCounter = 0;

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
  targetOrbitAltitudeKm: editableNumber(BASELINE_ORBIT_ALTITUDE_KM, 0),
  payloadMassKg: '1000',
  stages: [],
  boosters: null,
};

function encodeBase64(raw) {
  if (typeof btoa === 'function') {
    return btoa(raw);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(raw, 'utf8').toString('base64');
  }

  throw new Error('Base64 encoding is unavailable.');
}

function decodeBase64(raw) {
  if (typeof atob === 'function') {
    return atob(raw);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(raw, 'base64').toString('utf8');
  }

  throw new Error('Base64 decoding is unavailable.');
}

function encodeBase64Url(raw) {
  return encodeBase64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(raw) {
  const normalized = String(raw).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return decodeBase64(padded);
}

function stringifyDraftValue(value, fallback) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function setShareStatus(message = '') {
  const status = document.getElementById('share-status');
  if (status) {
    status.textContent = message;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function glossaryMarkup(
  termId,
  {
    text = null,
    triggerTag = 'button',
    triggerClass = 'designer-v2-glossary-trigger',
    itemClass = '',
  } = {}
) {
  const term = GLOSSARY_TERM_MAP.get(termId);
  const resolvedText = text ?? term?.labelKey ?? termId;
  if (!term) {
    return escapeHtml(resolvedText);
  }

  const tooltipId = `glossary-${term.id}-${++glossaryInstanceCounter}`;
  const interactiveAttrs =
    triggerTag === 'button' ? ' type="button"' : ' tabindex="0" role="button"';

  return `
    <span class="designer-v2-glossary-item${itemClass ? ` ${itemClass}` : ''}" data-glossary-item="${term.id}">
      <${triggerTag}
        class="${triggerClass}"
        data-glossary-trigger="${term.id}"
        aria-expanded="false"
        aria-describedby="${tooltipId}"${interactiveAttrs}
      >${escapeHtml(resolvedText)}</${triggerTag}>
      <span id="${tooltipId}" class="designer-v2-glossary-tooltip" role="tooltip" hidden>
        <strong>${escapeHtml(t(term.labelKey))}</strong>
        ${escapeHtml(t(term.bodyKey))}
      </span>
    </span>
  `.trim();
}

function withGlossaryTerm(text, termId) {
  const term = GLOSSARY_TERM_MAP.get(termId);
  if (!term) {
    return escapeHtml(text);
  }

  const label = t(term.labelKey);
  if (!text.includes(label)) {
    return escapeHtml(text);
  }

  return text.replace(
    label,
    glossaryMarkup(termId, {
      text: label,
      triggerTag: 'span',
      triggerClass: 'designer-v2-glossary-trigger is-inline',
      itemClass: 'is-inline',
    })
  );
}

function withGlossaryTerms(text, termIds = []) {
  return termIds.reduce((markup, termId) => {
    const term = GLOSSARY_TERM_MAP.get(termId);
    const label = term ? t(term.labelKey) : null;
    if (!term || !label || !markup.includes(label)) {
      return markup;
    }

    return markup.replace(
      label,
      glossaryMarkup(termId, {
        text: label,
        triggerTag: 'span',
        triggerClass: 'designer-v2-glossary-trigger is-inline',
        itemClass: 'is-inline',
      })
    );
  }, escapeHtml(text));
}

function glossaryInlineMarkup(termId, text = null) {
  return glossaryMarkup(termId, {
    text,
    triggerTag: 'span',
    triggerClass: 'designer-v2-glossary-trigger is-inline',
    itemClass: 'is-inline',
  });
}

function targetGlossaryIdForAltitude(altitudeKm) {
  return getMissionMarkerByAltitude(altitudeKm)?.glossaryId ?? null;
}

function verdictGlossaryId(rawVerdict) {
  return (
    {
      Suborbital: 'suborbital',
      LEO: 'orbit-leo',
      GTO: 'orbit-gto',
      TLI: 'orbit-tli',
      Mars: 'mars-transfer',
      'Lunar landing': 'lunar-landing',
    }[rawVerdict] ?? null
  );
}

function cloneStageForShare(stage = {}) {
  return {
    engineKey: stage.engineKey,
    engineCount: stage.engineCount,
    nozzle: stage.nozzle,
    propellantTons: stage.propellantTons,
    tankFraction: stage.tankFraction,
    nameKey: stage.nameKey ?? null,
    fairingMassKg: typeof stage.fairingMassKg === 'number' ? stage.fairingMassKg : null,
  };
}

function cloneBoostersForShare(boosters = null) {
  if (!boosters) {
    return null;
  }

  return {
    type: boosters.type,
    engineKey: boosters.engineKey,
    count: boosters.count,
    engineCount: boosters.engineCount,
    nozzle: boosters.nozzle,
    propellantTons: boosters.propellantTons,
    tankFraction: boosters.tankFraction,
    nameKey: boosters.nameKey ?? null,
  };
}

export function snapshotShareDraft(draft = state) {
  return {
    presetId: draft.presetId,
    targetOrbitAltitudeKm: draft.targetOrbitAltitudeKm,
    payloadMassKg: draft.payloadMassKg,
    stages: draft.stages.map((stage) => cloneStageForShare(stage)),
    boosters: cloneBoostersForShare(draft.boosters),
  };
}

function verdictRank(verdictLabel) {
  const rank = VERDICT_ORDER.indexOf(verdictLabel);
  return rank >= 0 ? rank : 0;
}

function sanitizeSharedDraft(rawDraft, engines = state.engines) {
  if (!rawDraft || typeof rawDraft !== 'object' || !Array.isArray(rawDraft.stages)) {
    return null;
  }

  if (rawDraft.stages.length < MIN_STAGES || rawDraft.stages.length > MAX_STAGES) {
    return null;
  }

  const engineMap = new Map(engines.map((engine) => [engine.key, engine]));
  const stages = rawDraft.stages.map((stage, index) => {
    if (!stage || typeof stage !== 'object' || !engineMap.has(stage.engineKey)) {
      return null;
    }

    const fallback = buildStageDraft(engines, {}, index, rawDraft.stages.length);
    const engine = engineMap.get(stage.engineKey);
    return {
      ...fallback,
      engineKey: stage.engineKey,
      engineCount: stringifyDraftValue(stage.engineCount, fallback.engineCount),
      nozzle:
        stage.nozzle === 'sl' || stage.nozzle === 'vac' || stage.nozzle === 'auto'
          ? stage.nozzle
          : defaultNozzle(engine, index),
      propellantTons: stringifyDraftValue(stage.propellantTons, fallback.propellantTons),
      tankFraction: stringifyDraftValue(stage.tankFraction, fallback.tankFraction),
      nameKey: stage.nameKey ?? fallback.nameKey ?? null,
      fairingMassKg:
        typeof stage.fairingMassKg === 'number' || stage.fairingMassKg === null
          ? stage.fairingMassKg
          : fallback.fairingMassKg,
    };
  });

  if (stages.some((stage) => stage === null)) {
    return null;
  }

  const fallbackBoosters = buildBoosterDraft(engines, { count: 0, type: BOOSTER_TYPES.SOLID });
  let boosters = fallbackBoosters;

  if (rawDraft.boosters !== null && rawDraft.boosters !== undefined) {
    const rawBoosters = rawDraft.boosters;
    if (
      !rawBoosters ||
      typeof rawBoosters !== 'object' ||
      !Object.values(BOOSTER_TYPES).includes(rawBoosters.type)
    ) {
      return null;
    }

    const boosterEngineKey =
      rawBoosters.type === BOOSTER_TYPES.SOLID ? 'srb_blob' : rawBoosters.engineKey;
    if (!engineMap.has(boosterEngineKey)) {
      return null;
    }

    const boosterEngine = engineMap.get(boosterEngineKey);
    boosters = {
      ...fallbackBoosters,
      type: rawBoosters.type,
      engineKey: rawBoosters.type === BOOSTER_TYPES.SOLID ? 'srb_blob' : rawBoosters.engineKey,
      count: stringifyDraftValue(rawBoosters.count, fallbackBoosters.count),
      engineCount:
        rawBoosters.type === BOOSTER_TYPES.SOLID
          ? '1'
          : stringifyDraftValue(rawBoosters.engineCount, fallbackBoosters.engineCount),
      nozzle:
        rawBoosters.nozzle === 'sl' || rawBoosters.nozzle === 'vac' || rawBoosters.nozzle === 'auto'
          ? rawBoosters.nozzle
          : defaultNozzle(boosterEngine, 0),
      propellantTons: stringifyDraftValue(rawBoosters.propellantTons, fallbackBoosters.propellantTons),
      tankFraction: stringifyDraftValue(rawBoosters.tankFraction, fallbackBoosters.tankFraction),
      nameKey: rawBoosters.nameKey ?? fallbackBoosters.nameKey ?? null,
    };
  }

  const presetId = getPresetOption(rawDraft.presetId)?.id ?? 'custom';
  return {
    presetId,
    targetOrbitAltitudeKm: stringifyDraftValue(
      rawDraft.targetOrbitAltitudeKm,
      editableNumber(BASELINE_ORBIT_ALTITUDE_KM, 0)
    ),
    payloadMassKg: stringifyDraftValue(rawDraft.payloadMassKg, '1000'),
    stages,
    boosters,
  };
}

export function encodeShareDraft(draft = state) {
  return encodeBase64Url(
    JSON.stringify({
      v: SHARE_VERSION,
      draft: snapshotShareDraft(draft),
    })
  );
}

export function decodeShareDraft(encodedDraft, engines = state.engines) {
  try {
    const parsed = JSON.parse(decodeBase64Url(encodedDraft));
    if (parsed?.v !== SHARE_VERSION) {
      return null;
    }

    return sanitizeSharedDraft(parsed.draft, engines);
  } catch {
    return null;
  }
}

export function buildShareUrl(draft = state, href = window.location.href) {
  const url = new URL(href);
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  params.set(SHARE_FRAGMENT_KEY, encodeShareDraft(draft));
  url.hash = params.toString();
  return url.toString();
}

export function restoreSharedDraftFromHash(hash = window.location.hash, engines = state.engines) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  const encodedDraft = params.get(SHARE_FRAGMENT_KEY);
  if (!encodedDraft) {
    return { draft: null, status: 'missing' };
  }

  const draft = decodeShareDraft(encodedDraft, engines);
  return draft ? { draft, status: 'restored' } : { draft: null, status: 'invalid' };
}

function syncShareFragment() {
  if (typeof window === 'undefined') {
    return;
  }

  const shareUrl = buildShareUrl(state, window.location.href);
  if (shareUrl === window.location.href) {
    return;
  }

  if (window.history && typeof window.history.replaceState === 'function') {
    window.history.replaceState(null, '', shareUrl);
    return;
  }

  window.location.hash = new URL(shareUrl).hash;
}

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

function getMissionMarkerByAltitude(altitudeKm) {
  return MISSION_MARKERS.find((marker) => marker.altitudeKm === Number(altitudeKm)) ?? null;
}

function formatTargetOrbitLabel(altitudeKm) {
  const marker = getMissionMarkerByAltitude(altitudeKm);
  if (marker) {
    return t(marker.labelKey);
  }

  return formatMessage('designer_v2.summary.target_custom_altitude', {
    altitude: numberFmt.format(altitudeKm),
  });
}

function renderPresetControls() {
  const presetSelect = document.getElementById('preset-select');
  if (presetSelect) {
    presetSelect.innerHTML = PRESET_OPTIONS.map(
      (option) =>
        `<option value="${option.id}"${option.id === state.presetId ? ' selected' : ''}>${t(
          option.labelKey
        )}</option>`
    ).join('');
  }

  const quickLoad = document.getElementById('preset-quick-load');
  if (quickLoad) {
    quickLoad.innerHTML = PRESET_OPTIONS.filter((option) => option.featured)
      .map((option) => {
        const activeClass = option.id === state.presetId ? ' is-active' : '';
        return `<button type="button" class="designer-v2-preset-chip${activeClass}" data-preset-load="${option.id}">${t(
          option.labelKey
        )}</button>`;
      })
      .join('');
  }

  const presetSource = document.getElementById('preset-source');
  if (!presetSource) {
    return;
  }

  const activePreset = getPresetOption(state.presetId);
  if (!activePreset.preset) {
    presetSource.textContent = t('designer_v2.controls.preset_source_custom');
    return;
  }

  presetSource.textContent = `${t('designer_v2.controls.preset_source_prefix')} ${t(
    activePreset.labelKey
  )} · `;
  const sourceLink = document.createElement('a');
  sourceLink.href = PRESET_SOURCE_URL;
  sourceLink.target = '_blank';
  sourceLink.rel = 'noreferrer';
  sourceLink.textContent = t('designer_v2.controls.preset_source_link');
  presetSource.append(sourceLink);
}

function renderMissionControls() {
  const targetOrbitInput = document.getElementById('target-orbit-altitude');
  if (targetOrbitInput) {
    targetOrbitInput.value = state.targetOrbitAltitudeKm;
  }

  const missionQuickPicks = document.getElementById('mission-quick-picks');
  const activeMarker = getMissionMarkerByAltitude(state.targetOrbitAltitudeKm);
  if (missionQuickPicks) {
    missionQuickPicks.innerHTML = MISSION_MARKERS.map((marker) => {
      const activeClass = marker.id === activeMarker?.id ? ' is-active' : '';
      return glossaryMarkup(marker.glossaryId, {
        text: t(marker.labelKey),
        triggerClass: `designer-v2-mission-chip${activeClass}`,
      }).replace(
        'aria-describedby=',
        `data-target-altitude="${marker.altitudeKm}" aria-describedby=`
      );
    }).join('');
  }

  const preview = document.getElementById('mission-target-preview');
  const altitudeKm = Number(state.targetOrbitAltitudeKm);
  if (
    !preview ||
    !Number.isFinite(altitudeKm) ||
    altitudeKm < ORBIT_ALTITUDE_RANGE.min ||
    altitudeKm > ORBIT_ALTITUDE_RANGE.max
  ) {
    if (preview) {
      preview.textContent = '';
    }
    return;
  }

  const targetLabel = formatTargetOrbitLabel(altitudeKm);
  preview.innerHTML = formatMessage('designer_v2.controls.target_orbit_preview_html', {
    target:
      targetGlossaryIdForAltitude(altitudeKm) !== null
        ? glossaryInlineMarkup(targetGlossaryIdForAltitude(altitudeKm), targetLabel)
        : escapeHtml(targetLabel),
    requirement: oneDecimalFmt.format(targetOrbitRequirementKmS(altitudeKm)),
  });
}

function closeGlossaryTooltips(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return;
  }

  root.querySelectorAll('.designer-v2-glossary-item.is-open').forEach((item) => {
    item.classList.remove('is-open');
    item.querySelector('[data-glossary-trigger]')?.setAttribute('aria-expanded', 'false');
    item.querySelector('[role="tooltip"]')?.setAttribute('hidden', '');
  });
}

function openGlossaryTooltip(item) {
  if (!(item instanceof HTMLElement)) {
    return;
  }

  closeGlossaryTooltips(item.ownerDocument ?? document);
  item.classList.add('is-open');
  item.querySelector('[data-glossary-trigger]')?.setAttribute('aria-expanded', 'true');
  item.querySelector('[role="tooltip"]')?.removeAttribute('hidden');
}

function renderGlossary() {
  const glossaryList = document.getElementById('glossary-list');
  if (!glossaryList) {
    return;
  }

  glossaryList.innerHTML = GLOSSARY_TERMS.map((term) => glossaryMarkup(term.id)).join('');
}

function bindGlossaryInteractions(root = document) {
  const body = root?.body ?? document.body;
  if (!body || body.getAttribute('data-glossary-bound') === 'true') {
    return;
  }

  document.addEventListener('focusin', (event) => {
    const item = event.target.closest('[data-glossary-item]');
    if (item instanceof HTMLElement) {
      openGlossaryTooltip(item);
    }
  });

  document.addEventListener('focusout', (event) => {
    const item = event.target.closest('[data-glossary-item]');
    if (!(item instanceof HTMLElement) || item.contains(event.relatedTarget)) {
      return;
    }

    closeGlossaryTooltips(root);
  });

  document.addEventListener('mouseover', (event) => {
    const item = event.target.closest('[data-glossary-item]');
    if (item instanceof HTMLElement) {
      openGlossaryTooltip(item);
    }
  });

  document.addEventListener('mouseout', (event) => {
    const item = event.target.closest('[data-glossary-item]');
    if (!(item instanceof HTMLElement) || item.contains(event.relatedTarget)) {
      return;
    }

    closeGlossaryTooltips(root);
  });

  document.addEventListener('click', (event) => {
    const item = event.target.closest('[data-glossary-item]');
    if (item instanceof HTMLElement) {
      if (item.classList.contains('is-open')) {
        closeGlossaryTooltips(root);
      } else {
        openGlossaryTooltip(item);
      }
      return;
    }

    closeGlossaryTooltips(root);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeGlossaryTooltips(root);
    }
  });

  body.setAttribute('data-glossary-bound', 'true');
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
      targetOrbitAltitudeKm: editableNumber(BASELINE_ORBIT_ALTITUDE_KM, 0),
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
    targetOrbitAltitudeKm: editableNumber(BASELINE_ORBIT_ALTITUDE_KM, 0),
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
  state.targetOrbitAltitudeKm =
    draft.targetOrbitAltitudeKm ?? editableNumber(BASELINE_ORBIT_ALTITUDE_KM, 0);
  state.payloadMassKg = draft.payloadMassKg;
  state.stages = draft.stages;
  state.boosters = draft.boosters ?? buildBoosterDraft(state.engines, { count: 0, type: BOOSTER_TYPES.SOLID });
}

function syncStateFromInputs() {
  const presetSelect = document.getElementById('preset-select');
  if (presetSelect) {
    state.presetId = presetSelect.value;
  }

  const targetOrbitInput = document.getElementById('target-orbit-altitude');
  if (targetOrbitInput) {
    state.targetOrbitAltitudeKm = targetOrbitInput.value;
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
    targetOrbitAltitudeKm: Number(draft.targetOrbitAltitudeKm),
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
  const targetOrbitAltitudeKm = readNumber(
    state.targetOrbitAltitudeKm,
    {
      min: ORBIT_ALTITUDE_RANGE.min,
      max: ORBIT_ALTITUDE_RANGE.max,
      integer: true,
      label: t('designer_v2.field.target_orbit_altitude'),
      inputId: 'target-orbit-altitude',
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

  if (errors.length > 0 || payloadMassKg === null || targetOrbitAltitudeKm === null) {
    return { errors, config: null, result: null };
  }

  try {
    const config = buildAnalyzeConfig({
      ...state,
      targetOrbitAltitudeKm: String(targetOrbitAltitudeKm),
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

function propellantLabel(propellant) {
  return t(`designer_v2.propellant.${propellant}`);
}

function formatStatValue(value, suffix, digits = 0) {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }

  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} ${suffix}`;
}

function engineSpotlightIllustration(engine, panelId) {
  const accentClass = engine?.propellant === 'LH2_LOX' ? 'is-hydrogen' : engine?.propellant === 'CH4_LOX' ? 'is-methane' : engine?.propellant === 'SOLID' ? 'is-solid' : 'is-rp1';
  const vacuumOnly = engine?.thrust_sl_kN === 0 || engine?.isp_sl === 0;
  const nozzleWidth = vacuumOnly ? 56 : 38;
  const chamberWidth = engine?.propellant === 'SOLID' ? 52 : 36;

  return `
    <svg
      viewBox="0 0 160 170"
      class="designer-v2-engine-illustration ${accentClass}"
      role="img"
      aria-labelledby="${panelId}-title"
    >
      <defs>
        <linearGradient id="${panelId}-shell" x1="0" x2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.85" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="60" y="16" width="40" height="26" rx="12" fill="url(#${panelId}-shell)" />
      <rect x="${80 - chamberWidth / 2}" y="40" width="${chamberWidth}" height="42" rx="12" fill="url(#${panelId}-shell)" />
      <path d="M ${80 - nozzleWidth / 2} 82 L ${80 + nozzleWidth / 2} 82 L 104 142 L 56 142 Z" fill="url(#${panelId}-shell)" />
      <rect x="50" y="58" width="12" height="38" rx="6" fill="currentColor" fill-opacity="0.28" />
      <rect x="98" y="58" width="12" height="38" rx="6" fill="currentColor" fill-opacity="0.28" />
      <circle cx="80" cy="28" r="8" fill="#ffffff" fill-opacity="0.35" />
      <path d="M 70 142 Q 80 160 90 142" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-opacity="0.2" />
      <text x="80" y="158" text-anchor="middle" class="designer-v2-engine-illustration-caption">
        ${vacuumOnly ? t('designer_v2.engine_card.vacuum_profile') : t('designer_v2.engine_card.sea_level_profile')}
      </text>
    </svg>
  `;
}

function engineSpotlightMarkup(engine, panelId) {
  if (!engine) {
    return '';
  }

  return `
    <section class="designer-v2-engine-card" aria-labelledby="${panelId}-title" data-engine-panel="${engine.key}">
      <div class="designer-v2-engine-card-copy">
        <div>
          <p class="designer-v2-card-role">${t('designer_v2.engine_card.title')}</p>
          <h4 id="${panelId}-title">${t(`designer_v2.engine.${engine.key}`)}</h4>
        </div>
        <p class="designer-v2-engine-propellant">${propellantLabel(engine.propellant)}</p>
      </div>
      <div class="designer-v2-engine-card-body">
        ${engineSpotlightIllustration(engine, panelId)}
        <dl class="designer-v2-engine-stats">
          <div>
            <dt>${t('designer_v2.engine_card.thrust_sea_level')}</dt>
            <dd>${formatStatValue(engine.thrust_sl_kN, 'kN')}</dd>
          </div>
          <div>
            <dt>${t('designer_v2.engine_card.thrust_vacuum')}</dt>
            <dd>${formatStatValue(engine.thrust_vac_kN, 'kN')}</dd>
          </div>
          <div>
            <dt>${withGlossaryTerm(t('designer_v2.engine_card.isp_sea_level'), 'sea-level-isp')}</dt>
            <dd>${formatStatValue(engine.isp_sl, 's', 0)}</dd>
          </div>
          <div>
            <dt>${withGlossaryTerm(t('designer_v2.engine_card.isp_vacuum'), 'vacuum-isp')}</dt>
            <dd>${formatStatValue(engine.isp_vac, 's', 0)}</dd>
          </div>
        </dl>
      </div>
    </section>
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

  const icon =
    entry.health === 'realistic'
      ? '🟢'
      : entry.health === 'optimistic'
        ? '🟡'
        : entry.health === 'fixed'
          ? '⚪'
          : '🔴';
  const label = t(`designer_v2.structural.${entry.health}`);
  const ratio =
    typeof entry.ratio === 'number' ? ` (${ratioFmt.format(entry.ratio)})` : '';

  return `<span class="designer-v2-structural is-${entry.health}">${icon} ${label}${ratio}</span>`;
}

function liquidBoosterEngines() {
  return state.engines.filter((engine) => engine.propellant !== 'SOLID');
}

function stageMetricsMarkup(summary) {
  if (!summary) {
    return [
      metricMarkup(t('designer_v2.metric.dry_mass'), '—'),
      metricMarkup(t('designer_v2.metric.wet_mass'), '—'),
      metricMarkup(withGlossaryTerm(t('designer_v2.metric.delta_v'), 'delta-v'), '—'),
      metricMarkup(withGlossaryTerm(t('designer_v2.metric.twr_ignition'), 'twr'), '—'),
      metricMarkup(withGlossaryTerm(t('designer_v2.metric.twr_burnout'), 'twr'), '—'),
      metricMarkup(withGlossaryTerm(t('designer_v2.metric.burn_time'), 'burn-time'), '—'),
      metricMarkup(t('designer_v2.metric.structural'), '—'),
    ].join('');
  }

  return [
    metricMarkup(t('designer_v2.metric.dry_mass'), `${numberFmt.format(Math.round(summary.dry_mass_kg))} kg`),
    metricMarkup(t('designer_v2.metric.wet_mass'), `${numberFmt.format(Math.round(summary.wet_mass_kg))} kg`),
    metricMarkup(
      withGlossaryTerm(t('designer_v2.metric.delta_v'), 'delta-v'),
      `${numberFmt.format(Math.round(summary.dv_ms))} m/s`
    ),
    metricMarkup(withGlossaryTerm(t('designer_v2.metric.twr_ignition'), 'twr'), twrFmt.format(summary.twr_ignition)),
    metricMarkup(withGlossaryTerm(t('designer_v2.metric.twr_burnout'), 'twr'), twrFmt.format(summary.twr_burnout)),
    metricMarkup(
      withGlossaryTerm(t('designer_v2.metric.burn_time'), 'burn-time'),
      `${numberFmt.format(Math.round(summary.burn_time_s))} s`
    ),
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
          <p class="designer-v2-card-role">${withGlossaryTerm(stageRole(index, state.stages.length), 'stage')}</p>
          <h3 id="stage-${index}-title">${withGlossaryTerm(stageName(stage, index), 'stage')}</h3>
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
                 <label for="payload-mass">${withGlossaryTerm(t('designer.field.payload'), 'fairing')}</label>
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
          ? `<p class="designer-v2-note">${withGlossaryTerm(t('designer_v2.card.fairing_note'), 'fairing')}</p>`
          : ''
      }

      ${engineSpotlightMarkup(engine, `stage-${index}-engine-panel`)}

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
          <p class="designer-v2-card-role">${withGlossaryTerm(t('designer_v2.card.parallel_boosters'), 'booster')}</p>
          <h3 id="booster-title">${
            withGlossaryTerm(boosters.nameKey ? t(boosters.nameKey) : t('designer_v2.card.boosters'), 'booster')
          }</h3>
        </div>
      </div>

      <div class="designer-v2-field-grid">
        <div class="form-field">
          <label>${withGlossaryTerm(t('designer_v2.field.booster_type'), 'booster')}</label>
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
          <label for="booster-count">${withGlossaryTerm(t('designer_v2.field.booster_count'), 'booster')}</label>
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
           : `<p class="designer-v2-note">${withGlossaryTerm(t('designer_v2.card.boosters_inactive'), 'booster')}</p>`
       }

      ${engineSpotlightMarkup(engine, 'booster-engine-panel')}

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

  renderPresetControls();
  renderMissionControls();

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
    const isTarget = result?.total?.target_orbit_altitude_km === marker.altitudeKm;
    const classes = [isHit ? 'is-hit' : '', isTarget ? 'is-target' : ''].filter(Boolean).join(' ');
    const thresholdLabel = `${oneDecimalFmt.format(marker.thresholdKmS)} km/s`;

    return `
      <li style="left:${percent}%" class="${classes}" data-mission-marker-id="${marker.id}">
        <strong>${marker.badge}</strong>
      </li>
    `;
  }).join('');

  const legendItems = MISSION_MARKERS.map((marker) => {
    const isHit = (result?.total?.dv_kms ?? 0) >= marker.thresholdKmS;
    const isTarget = result?.total?.target_orbit_altitude_km === marker.altitudeKm;
    const classes = [isHit ? 'is-hit' : '', isTarget ? 'is-target' : ''].filter(Boolean).join(' ');

    return `
      <li class="${classes}" data-mission-legend-id="${marker.id}">
        <span class="designer-v2-mission-legend-badge" aria-hidden="true">${marker.badge}</span>
        <span class="designer-v2-mission-legend-copy">
          ${glossaryInlineMarkup(marker.glossaryId, t(marker.labelKey))}
          <span>${oneDecimalFmt.format(marker.thresholdKmS)} km/s</span>
        </span>
      </li>
    `;
  }).join('');

  container.innerHTML = `
    <div class="designer-v2-mission-track">
      <div class="designer-v2-mission-fill"></div>
      <span class="designer-v2-mission-current" aria-hidden="true"></span>
      <ol class="designer-v2-mission-badges" aria-hidden="true">${markers}</ol>
    </div>
    <ol class="designer-v2-mission-legend">${legendItems}</ol>
  `;
}

function buildVerdictBudget(result) {
  if (!result) {
    return null;
  }

  const rows = result.stages.map((stage) => ({
    kind: 'stage',
    label: stage.label,
    valueKmS: stage.dv_ms / 1000,
  }));

  result.stages.forEach((stage) => {
    if ((stage.gravity_drag_loss_ms ?? 0) <= 0) {
      return;
    }

    rows.push({
      kind: 'loss',
      label: withGlossaryTerm(
        formatMessage('designer_v2.summary.explainer_gravity_loss', {
          label: stage.label,
        }),
        'gravity-loss'
      ),
      valueKmS: stage.gravity_drag_loss_ms / 1000,
    });
  });

  const requirementKmS = Number.isFinite(result.total.target_requirement_kms)
    ? result.total.target_requirement_kms
    : result.total.dv_kms;
  const requirementLabel =
    Number.isFinite(result.total.target_orbit_altitude_km) && Number.isFinite(result.total.target_requirement_kms)
      ? formatMessage('designer_v2.summary.explainer_requirement_target', {
          target: formatTargetOrbitLabel(result.total.target_orbit_altitude_km),
        })
      : t('designer_v2.summary.explainer_requirement_generic');

  rows.push({
    kind: 'requirement',
    label: requirementLabel,
    valueKmS: requirementKmS,
  });

  const scaleKmS = Math.max(
    requirementKmS,
    result.total.dv_kms,
    ...rows.map((row) => row.valueKmS),
    1
  );

  return {
    rows,
    scaleKmS,
    requirementKmS,
    deliveredKmS: result.total.dv_kms,
    deltaKmS: result.total.dv_kms - requirementKmS,
  };
}

function renderVerdictExplainer(result) {
  const details = document.getElementById('verdict-explainer');
  const body = document.getElementById('verdict-explainer-body');
  if (!details || !body) {
    return;
  }

  if (!result) {
    details.hidden = true;
    body.innerHTML = '';
    return;
  }

  const budget = buildVerdictBudget(result);
  if (!budget) {
    details.hidden = true;
    body.innerHTML = '';
    return;
  }

  details.hidden = false;

  const summaryCopy = formatMessage(
    budget.deltaKmS >= 0
      ? 'designer_v2.summary.explainer_margin'
      : 'designer_v2.summary.explainer_shortfall',
    {
      delivered: oneDecimalFmt.format(budget.deliveredKmS),
      requirement: oneDecimalFmt.format(budget.requirementKmS),
      difference: oneDecimalFmt.format(Math.abs(budget.deltaKmS)),
    }
  );

  const rowsMarkup = budget.rows
    .map((row) => {
      const widthPercent = Math.min((row.valueKmS / budget.scaleKmS) * 100, 100);
      const formattedValue = `${row.kind === 'loss' ? '−' : ''}${oneDecimalFmt.format(row.valueKmS)} km/s`;

      return `
        <div class="designer-v2-budget-row is-${row.kind}" data-budget-kind="${row.kind}">
          <div class="designer-v2-budget-meta">
            <span>${row.label}</span>
            <strong>${formattedValue}</strong>
          </div>
          <div class="designer-v2-budget-track">
            <span class="designer-v2-budget-bar" style="width:${widthPercent}%"></span>
          </div>
        </div>
      `;
    })
    .join('');

  body.innerHTML = `
    <p class="designer-v2-explainer-copy">${summaryCopy}</p>
    <div class="designer-v2-budget-list">${rowsMarkup}</div>
  `;
}

function silhouetteStageShape({ x, y, width, height, className }) {
  return `<rect class="${className}" x="${x}" y="${y}" width="${width}" height="${height}" rx="10" />`;
}

function renderRocketSilhouette() {
  const container = document.getElementById('rocket-silhouette');
  if (!container) {
    return;
  }

  const svgWidth = 240;
  const svgHeight = 420;
  const centerX = svgWidth / 2;
  const stageWeights = state.stages.map((stage) => Math.max(Number(stage.propellantTons) || 1, 1));
  const totalStageWeight = stageWeights.reduce((sum, value) => sum + value, 0);
  const usableStageHeight = 280;
  const minStageHeight = 38;
  const firstStageWeight = stageWeights[0] ?? 1;
  const boostersActive = Number(state.boosters?.count ?? 0) > 0;
  const boosterPods = boostersActive ? Math.min(2, Math.ceil(Number(state.boosters.count) / 2)) : 0;
  const boosterCount = Number(state.boosters?.count ?? 0);
  const baseWidth = 88;
  const topWidth = 36;
  const stageCount = state.stages.length;
  let currentY = 344;
  const stageMarkup = [];

  state.stages.forEach((stage, index) => {
    const ratio = stageWeights[index] / totalStageWeight;
    const height =
      index === state.stages.length - 1
        ? Math.max(currentY - 72, minStageHeight)
        : Math.max(usableStageHeight * ratio, minStageHeight);
    const width =
      baseWidth - ((baseWidth - topWidth) * index) / Math.max(state.stages.length - 1, 1);
    const x = centerX - width / 2;
    const y = currentY - height;
    const className =
      index === 0 ? 'designer-v2-silhouette-stage' : 'designer-v2-silhouette-stage is-upper';

    stageMarkup.push(silhouetteStageShape({ x, y, width, height, className }));

    if (index > 0) {
      stageMarkup.push(
        `<line class="designer-v2-silhouette-separator" x1="${x}" x2="${x + width}" y1="${currentY}" y2="${currentY}" />`
      );
    }

    currentY = y;
  });

  const noseWidth = topWidth;
  const noseHeight = 46;
  const noseY = currentY - noseHeight;
  const noseMarkup = `
    <path
      class="designer-v2-silhouette-nose"
      d="M ${centerX - noseWidth / 2} ${currentY} Q ${centerX} ${noseY - 10} ${centerX + noseWidth / 2} ${currentY} Z"
    />
    <rect
      class="designer-v2-silhouette-fairing"
      x="${centerX - noseWidth / 2}"
      y="${currentY - 18}"
      width="${noseWidth}"
      height="18"
      rx="8"
    />
  `;

  const boosterMarkup = [];
  if (boosterPods > 0) {
    const boosterHeight = Math.min(220, 140 + firstStageWeight * 0.12);
    const boosterWidth = boosterCount >= 4 ? 22 : 18;
    const boosterTop = 344 - boosterHeight + 12;
    const offsets = boosterPods === 2 ? [56, 80] : [62];

    offsets.forEach((offset, index) => {
      const y = boosterTop + index * 10;
      boosterMarkup.push(
        `<rect class="designer-v2-silhouette-booster" x="${centerX - offset - boosterWidth}" y="${y}" width="${boosterWidth}" height="${boosterHeight - index * 10}" rx="9" />`
      );
      boosterMarkup.push(
        `<rect class="designer-v2-silhouette-booster" x="${centerX + offset}" y="${y}" width="${boosterWidth}" height="${boosterHeight - index * 10}" rx="9" />`
      );
    });
  }

  container.innerHTML = `
    <svg
      viewBox="0 0 ${svgWidth} ${svgHeight}"
      role="img"
      aria-label="${formatMessage('designer_v2.silhouette.aria', {
        stages: stageCount,
        boosters: boosterCount,
      })}"
      data-stage-count="${stageCount}"
      data-booster-count="${boosterCount}"
    >
      <text class="designer-v2-silhouette-label" x="${centerX}" y="24" text-anchor="middle">
        ${formatMessage('designer_v2.silhouette.badge', { stages: stageCount, boosters: boosterCount })}
      </text>
      ${boosterMarkup.join('')}
      ${stageMarkup.join('')}
      ${noseMarkup}
      <rect class="designer-v2-silhouette-outline" x="${centerX - 2}" y="344" width="4" height="30" rx="2" fill="rgba(15, 23, 42, 0.12)" />
      <line class="designer-v2-silhouette-outline" x1="${centerX - 44}" x2="${centerX + 44}" y1="374" y2="374" />
    </svg>
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
    renderRocketSilhouette();
    renderMissionBar(null);
    renderVerdictExplainer(null);
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
  verdictPill.innerHTML = glossaryInlineMarkup(
    verdictGlossaryId(result.total.verdict),
    translatedVerdict(result.total.verdict)
  );
  verdictPill.className = `designer-v2-verdict-pill ${verdictClass}`.trim();

  if (
    Number.isFinite(result.total.target_orbit_altitude_km) &&
    Number.isFinite(result.total.target_requirement_kms)
  ) {
    missionTarget.innerHTML = formatMessage(
      result.total.target_met
        ? 'designer_v2.summary.target_orbit_met_html'
        : 'designer_v2.summary.target_orbit_missed_html',
      {
        target:
          targetGlossaryIdForAltitude(result.total.target_orbit_altitude_km) !== null
            ? glossaryInlineMarkup(
                targetGlossaryIdForAltitude(result.total.target_orbit_altitude_km),
                formatTargetOrbitLabel(result.total.target_orbit_altitude_km)
              )
            : escapeHtml(formatTargetOrbitLabel(result.total.target_orbit_altitude_km)),
        requirement: oneDecimalFmt.format(result.total.target_requirement_kms),
      }
    );
  } else if (result.total.mission_target) {
    missionTarget.innerHTML = formatMessage(
      result.total.target_met
        ? 'designer_v2.summary.target_met_html'
        : 'designer_v2.summary.target_missed_html',
      {
        target:
          verdictGlossaryId(result.total.mission_target) !== null
            ? glossaryInlineMarkup(
                verdictGlossaryId(result.total.mission_target),
                translatedVerdict(result.total.mission_target)
              )
            : escapeHtml(translatedVerdict(result.total.mission_target)),
      }
    );
  } else {
    missionTarget.textContent = t('designer_v2.summary.no_target');
  }

  boosterPhase.innerHTML = result.boosters
    ? withGlossaryTerms(
        formatMessage('designer_v2.summary.booster_jettison', {
          dv: oneDecimalFmt.format(result.boosters.dv_ms / 1000),
          propellant: oneDecimalFmt.format(result.boosters.stage1_remaining_propellant_kg / 1000),
        }),
        ['booster', 'delta-v', 'stage']
      )
    : t('designer_v2.summary.no_booster_phase');

  warningsList.innerHTML =
    result.total.warnings.length > 0
      ? result.total.warnings.map((warning) => `<li>${translateWarning(warning)}</li>`).join('')
      : `<li>${t('designer_v2.summary.no_warnings')}</li>`;
  summaryStatus.textContent = blocked
    ? t('designer_v2.summary.blocked')
    : t('designer_v2.summary.ready');
  analyzeButton.disabled = blocked;
  renderRocketSilhouette();
  renderMissionBar(result);
  renderVerdictExplainer(result);
}

function renderStaticGlossaryLabels() {
  const mappings = [
    ['designer_v2.summary.total_dv', 'delta-v'],
    ['designer_v2.summary.booster_phase', 'booster'],
  ];

  mappings.forEach(([key, termId]) => {
    const element = document.querySelector(`[data-i18n="${key}"]`);
    if (element) {
      element.innerHTML = withGlossaryTerm(t(key), termId);
    }
  });
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
  syncShareFragment();

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
  applyDraft({
    ...loadDraftFromPreset(presetId, state.engines),
    targetOrbitAltitudeKm: state.targetOrbitAltitudeKm,
  });
  renderCards();
  updateOutputs();
}

function markDraftAsCustom() {
  if (state.presetId === 'custom') {
    return;
  }

  state.presetId = 'custom';
  renderPresetControls();
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

  const shouldMarkCustom =
    target.matches('input, select') &&
    !target.id.match(/^stage-\d+-engine$/) &&
    target.id !== 'booster-engine' &&
    target.id !== 'target-orbit-altitude' &&
    target.getAttribute('name') !== 'booster-type';

  if (shouldMarkCustom) {
    markDraftAsCustom();
  }

  if (target.id === 'target-orbit-altitude') {
    syncStateFromInputs();
    renderMissionControls();
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

function handlePresetQuickLoadClick(event) {
  const button = event.target.closest('[data-preset-load]');
  if (!(button instanceof HTMLElement)) {
    return;
  }

  loadPreset(button.getAttribute('data-preset-load'));
}

function handleMissionQuickPickClick(event) {
  const button = event.target.closest('[data-target-altitude]');
  if (!(button instanceof HTMLElement)) {
    return;
  }

  state.targetOrbitAltitudeKm = button.getAttribute('data-target-altitude');
  renderMissionControls();
  updateOutputs();
}

function handleAnalyzeClick() {
  syncStateFromInputs();
  updateOutputs();
}

async function handleCopyShareLink() {
  const shareUrl = buildShareUrl(state, window.location.href);

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus(t('designer_v2.controls.share_copied'));
      return;
    } catch {
      // Fall through to visible fallback copy guidance below.
    }
  }

  setShareStatus(formatMessage('designer_v2.controls.share_copy_fallback', { url: shareUrl }));
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
  const presetQuickLoad = document.getElementById('preset-quick-load');
  const missionQuickPicks = document.getElementById('mission-quick-picks');
  const form = document.getElementById('designer-v2-form');
  const analyzeButton = document.getElementById('analyze-button');
  const copyShareButton = document.getElementById('copy-share-link');

  if (
    !addStageButton ||
    !removeStageButton ||
    !presetSelect ||
    !presetQuickLoad ||
    !missionQuickPicks ||
    !form ||
    !analyzeButton ||
    !copyShareButton
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

  const restoredShareDraft = restoreSharedDraftFromHash(window.location.hash, state.engines);
  if (restoredShareDraft.draft) {
    applyDraft(restoredShareDraft.draft);
  } else {
    applyDraft(loadDraftFromPreset('custom', state.engines));
  }
  renderGlossary();
  bindGlossaryInteractions(document);
  renderStaticGlossaryLabels();
  renderCards();
  updateOutputs();
  enableDragAndDrop();

  if (restoredShareDraft.status === 'restored') {
    setShareStatus(t('designer_v2.controls.share_restored'));
  } else if (restoredShareDraft.status === 'invalid') {
    setShareStatus(t('designer_v2.controls.share_invalid'));
  }

  addStageButton.addEventListener('click', addStage);
  removeStageButton.addEventListener('click', removeStage);
  presetSelect.addEventListener('change', handlePresetChange);
  presetQuickLoad.addEventListener('click', handlePresetQuickLoadClick);
  missionQuickPicks.addEventListener('click', handleMissionQuickPickClick);
  analyzeButton.addEventListener('click', handleAnalyzeClick);
  copyShareButton.addEventListener('click', () => {
    void handleCopyShareLink();
  });
  form.addEventListener('input', handleFormInput);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
