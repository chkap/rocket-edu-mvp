import { LAUNCHERS } from './data/launchers.js';
import { capabilityLabel, initialTWR, stackDeltaV, validateStage } from './lib/rocket.js';
import { formatMessage, initPage, t } from './lib/i18n.js';

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const twrFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'always',
});

const state = {
  launchers: LAUNCHERS.map(prepareLauncher),
  selectedId: LAUNCHERS[0]?.id ?? '',
  stages: [],
  payload: '0',
  ispMultipliers: [],
};

function prepareLauncher(launcher) {
  const stages = launcher.stages.map((stage) => ({ ...stage }));
  const payload = solvePayloadForTarget(stages, launcher.referenceDeltaV);

  return {
    ...launcher,
    derivedPayload: payload,
  };
}

function solvePayloadForTarget(stages, targetDv) {
  const zeroPayloadDv = stackDeltaV(stages, 0).total;
  if (zeroPayloadDv <= targetDv) {
    return 0;
  }

  let low = 0;
  let high = 1;

  while (stackDeltaV(stages, high).total > targetDv) {
    high *= 2;
  }

  for (let index = 0; index < 80; index += 1) {
    const mid = (low + high) / 2;

    if (stackDeltaV(stages, mid).total > targetDv) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

function getSelectedLauncher() {
  return state.launchers.find((launcher) => launcher.id === state.selectedId) ?? state.launchers[0];
}

function resetStateForLauncher() {
  const launcher = getSelectedLauncher();

  state.stages = launcher.stages.map((stage) => ({
    nameKey: stage.nameKey,
    m_p: String(stage.m_p),
    m_s: String(stage.m_s),
    Isp: String(stage.Isp),
    thrust_kN: String(stage.thrust_kN),
  }));
  state.payload = String(Math.round(launcher.derivedPayload));
  state.ispMultipliers = launcher.stages.map(() => 100);
}

function populatePresetSelect() {
  const select = document.getElementById('launcher-select');
  const note = document.getElementById('availability-note');

  if (!select || !note) {
    return;
  }

  select.innerHTML = state.launchers
    .map(
      (launcher) => `
        <option value="${launcher.id}">${t(launcher.nameKey)}</option>
      `
    )
    .join('');

  const missing = [];
  note.hidden = missing.length === 0;
  note.textContent =
    missing.length === 0 ? '' : formatMessage('compare.preset.awaiting', { items: missing.join(', ') });
}

function buildInputMarkup({ id, name, label, value }) {
  return `
    <div class="form-field">
      <label for="${id}">${label}</label>
      <input
        id="${id}"
        name="${name}"
        type="number"
        inputmode="decimal"
        step="any"
        autocomplete="off"
        value="${value}"
        aria-describedby="${id}-error"
      />
      <p id="${id}-error" class="field-error" aria-live="polite"></p>
    </div>
  `;
}

function buildStageMarkup(stage, index, totalStages) {
  const prefix = `compare-stage-${index}`;
  const isTopStage = index === totalStages - 1;
  const multiplier = state.ispMultipliers[index];

  return `
    <article class="stage-card" aria-labelledby="${prefix}-title">
      <div class="stage-card-header">
        <div>
          <h3 id="${prefix}-title">${t(stage.nameKey)}</h3>
          <p class="stage-role">${
            isTopStage
              ? t('designer.stage.role.top')
              : formatMessage('designer.stage.number', { number: index + 1 })
          }</p>
        </div>
      </div>

      <div class="form-grid">
        ${buildInputMarkup({
          id: `${prefix}-m_p`,
          name: `stage-${index}-m_p`,
          label: t('designer.field.propellant_mass'),
          value: stage.m_p,
        })}
        ${buildInputMarkup({
          id: `${prefix}-m_s`,
          name: `stage-${index}-m_s`,
          label: t('designer.field.structural_mass'),
          value: stage.m_s,
        })}
        ${buildInputMarkup({
          id: `${prefix}-isp`,
          name: `stage-${index}-Isp`,
          label: t('designer.field.isp'),
          value: stage.Isp,
        })}
        ${buildInputMarkup({
          id: `${prefix}-thrust`,
          name: `stage-${index}-thrust_kN`,
          label: t('designer.field.thrust'),
          value: stage.thrust_kN,
        })}
        ${
          isTopStage
            ? buildInputMarkup({
                id: 'compare-payload',
                name: 'payload',
                label: t('compare.field.payload'),
                value: state.payload,
              })
            : ''
        }
      </div>

      <div class="stage-slider">
        <div class="slider-row">
          <label for="${prefix}-slider">${t('compare.slider.label')}</label>
          <input
            id="${prefix}-slider"
            name="slider-${index}"
            type="range"
            min="85"
            max="115"
            step="1"
            value="${multiplier}"
          />
          <output for="${prefix}-slider" id="${prefix}-slider-output">${formatMessage(
            'compare.slider.output',
            { percent: multiplier }
          )}</output>
        </div>
      </div>

      <div class="stage-metrics" aria-live="polite">
        <article class="metric-card">
          <h4>${t('designer.metric.stage_dv')}</h4>
          <p id="${prefix}-dv" class="metric-value">—</p>
        </article>
        <article class="metric-card">
          <h4>${t('designer.metric.initial_twr')}</h4>
          <p id="${prefix}-twr" class="metric-value">—</p>
        </article>
      </div>
    </article>
  `;
}

function renderStageCards() {
  const stageList = document.getElementById('stage-list');
  if (!stageList) {
    return;
  }

  stageList.innerHTML = state.stages
    .map((stage, index) => buildStageMarkup(stage, index, state.stages.length))
    .join('');
}

function syncStateFromInputs() {
  state.stages = state.stages.map((stage, index) => ({
    ...stage,
    m_p: document.getElementById(`compare-stage-${index}-m_p`)?.value ?? stage.m_p,
    m_s: document.getElementById(`compare-stage-${index}-m_s`)?.value ?? stage.m_s,
    Isp: document.getElementById(`compare-stage-${index}-isp`)?.value ?? stage.Isp,
    thrust_kN: document.getElementById(`compare-stage-${index}-thrust`)?.value ?? stage.thrust_kN,
  }));

  state.payload = document.getElementById('compare-payload')?.value ?? state.payload;
  state.ispMultipliers = state.ispMultipliers.map(
    (_, index) => Number(document.getElementById(`compare-stage-${index}-slider`)?.value ?? 100)
  );
}

function resetFieldErrors() {
  document.querySelectorAll('#compare-form .field-error').forEach((el) => {
    el.textContent = '';
  });

  document.querySelectorAll('#compare-form input').forEach((el) => {
    el.classList.remove('input-invalid');
    el.removeAttribute('aria-invalid');
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

function readPositiveField(rawValue, id, label, errors) {
  const value = Number(rawValue);

  if (rawValue === '' || !Number.isFinite(value)) {
    errors.push({ id, message: formatMessage('designer.error.finite', { label }) });
    return null;
  }

  if (value <= 0) {
    errors.push({ id, message: formatMessage('designer.error.positive', { label }) });
    return null;
  }

  return value;
}

function readNonNegativeField(rawValue, id, label, errors) {
  const value = Number(rawValue);

  if (rawValue === '' || !Number.isFinite(value)) {
    errors.push({ id, message: formatMessage('designer.error.finite', { label }) });
    return null;
  }

  if (value < 0) {
    errors.push({ id, message: formatMessage('designer.error.non_negative', { label }) });
    return null;
  }

  return value;
}

function parseState() {
  const errors = [];

  const stages = state.stages.map((stage, index) => {
    const baseIsp = readPositiveField(stage.Isp, `compare-stage-${index}-isp`, t('designer.error.isp'), errors);
    const multiplier = state.ispMultipliers[index] / 100;

    return {
      nameKey: stage.nameKey,
      m_p: readPositiveField(
        stage.m_p,
        `compare-stage-${index}-m_p`,
        t('designer.error.propellant_mass'),
        errors
      ),
      m_s: readPositiveField(
        stage.m_s,
        `compare-stage-${index}-m_s`,
        t('designer.error.structural_mass'),
        errors
      ),
      Isp: baseIsp === null ? null : baseIsp * multiplier,
      thrust_kN: readPositiveField(
        stage.thrust_kN,
        `compare-stage-${index}-thrust`,
        t('designer.error.thrust'),
        errors
      ),
    };
  });

  const payload = readNonNegativeField(
    state.payload,
    'compare-payload',
    t('designer.error.payload'),
    errors
  );

  if (errors.length === 0) {
    stages.forEach((stage) => validateStage(stage));
  }

  return { stages, payload, errors };
}

function computePayloadMasses(stages, payload) {
  const payloadMasses = new Array(stages.length);
  let runningPayload = payload;

  for (let index = stages.length - 1; index >= 0; index -= 1) {
    payloadMasses[index] = runningPayload;
    runningPayload += stages[index].m_p + stages[index].m_s;
  }

  return payloadMasses;
}

function renderInvalidState(errors) {
  const errorEl = document.getElementById('compare-error');
  const metricIds = ['computed-dv', 'delta-percent', 'capability-label'];

  errors.forEach(({ id, message }) => setFieldError(id, message));

  if (errorEl) {
    errorEl.hidden = false;
    errorEl.textContent = t('compare.error.fix_inputs');
  }

  metricIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '—';
    }
  });

  state.stages.forEach((_, index) => {
    const dvEl = document.getElementById(`compare-stage-${index}-dv`);
    const twrEl = document.getElementById(`compare-stage-${index}-twr`);
    const outputEl = document.getElementById(`compare-stage-${index}-slider-output`);

    if (dvEl) {
      dvEl.textContent = '—';
    }

    if (twrEl) {
      twrEl.textContent = '—';
    }

    if (outputEl) {
      outputEl.textContent = formatMessage('compare.slider.output', {
        percent: state.ispMultipliers[index],
      });
    }
  });
}

function renderSummary(launcher, totalDv) {
  const computedDvEl = document.getElementById('computed-dv');
  const publishedDvEl = document.getElementById('published-dv');
  const deltaPercentEl = document.getElementById('delta-percent');
  const capabilityEl = document.getElementById('capability-label');
  const orbitEl = document.getElementById('reference-orbit');
  const noteEl = document.getElementById('launcher-note');

  if (!computedDvEl || !publishedDvEl || !deltaPercentEl || !capabilityEl || !orbitEl || !noteEl) {
    return;
  }

  const deltaPercent = ((totalDv - launcher.referenceDeltaV) / launcher.referenceDeltaV) * 100;

  computedDvEl.textContent = `${numberFmt.format(Math.round(totalDv))} m/s`;
  publishedDvEl.textContent = `${numberFmt.format(Math.round(launcher.referenceDeltaV))} m/s`;
  deltaPercentEl.textContent = percentFmt.format(deltaPercent);
  capabilityEl.textContent = t(`capability.${capabilityLabel(totalDv)}`);
  orbitEl.textContent = t(launcher.referenceOrbitKey);
  noteEl.textContent = formatMessage('compare.note.payload', {
    note: t(launcher.notesKey),
  });
}

function renderStageMetrics(stages, payloadMasses, stack) {
  stages.forEach((stage, index) => {
    const dvEl = document.getElementById(`compare-stage-${index}-dv`);
    const twrEl = document.getElementById(`compare-stage-${index}-twr`);
    const outputEl = document.getElementById(`compare-stage-${index}-slider-output`);

    if (dvEl) {
      dvEl.textContent = `${numberFmt.format(Math.round(stack.perStage[index]))} m/s`;
    }

    if (twrEl) {
      twrEl.textContent = twrFmt.format(
        initialTWR({
          thrust_kN: stage.thrust_kN,
          totalMassAbove_kg: stage.m_p + stage.m_s + payloadMasses[index],
        })
      );
    }

    if (outputEl) {
      outputEl.textContent = formatMessage('compare.slider.output', {
        percent: state.ispMultipliers[index],
      });
    }
  });
}

function renderSources() {
  const sourceList = document.getElementById('source-list');
  if (!sourceList) {
    return;
  }

  const urls = Array.from(new Set(state.launchers.flatMap((launcher) => launcher.sourceUrls)));

  sourceList.innerHTML = urls
    .map(
      (url) => `
        <li><a href="${url}" target="_blank" rel="noreferrer">${url}</a></li>
      `
    )
    .join('');
}

function updateOutputs() {
  resetFieldErrors();
  syncStateFromInputs();

  const errorEl = document.getElementById('compare-error');
  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  const parsed = parseState();
  if (parsed.errors.length > 0 || parsed.payload === null) {
    renderInvalidState(parsed.errors);
    return;
  }

  const launcher = getSelectedLauncher();
  const payloadMasses = computePayloadMasses(parsed.stages, parsed.payload);
  const stack = stackDeltaV(parsed.stages, parsed.payload);

  renderSummary(launcher, stack.total);
  renderStageMetrics(parsed.stages, payloadMasses, stack);
}

function handlePresetChange(event) {
  state.selectedId = event.target.value;
  resetStateForLauncher();
  renderStageCards();
  updateOutputs();
}

function init() {
  initPage({
    titleKey: 'page.compare.title',
    descriptionKey: 'page.compare.description',
  });

  const select = document.getElementById('launcher-select');
  const form = document.getElementById('compare-form');

  if (!select || !form || state.launchers.length === 0) {
    return;
  }

  populatePresetSelect();
  select.value = state.selectedId;
  resetStateForLauncher();
  renderStageCards();
  renderSources();
  updateOutputs();

  select.addEventListener('change', handlePresetChange);
  form.addEventListener('input', updateOutputs);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
