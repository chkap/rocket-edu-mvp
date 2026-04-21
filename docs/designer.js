import {
  capabilityLabel,
  initialTWR,
  stackDeltaV,
  stageDeltaV,
  validateStage,
} from './lib/rocket.js';
import { formatMessage, initPage, t } from './lib/i18n.js';

const MIN_STAGES = 1;
const MAX_STAGES = 6;
const CHART_STEPS_PER_STAGE = 20;

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const twrFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const defaultStageTemplates = [
  // Falcon 9 FT-like defaults from issue #24 advisory comment:
  // https://github.com/chkap/rocket-edu-mvp/issues/24#issuecomment-4286980437
  { m_p: '410900', m_s: '22200', Isp: '282', thrust_kN: '7607' },
  { m_p: '107500', m_s: '4000', Isp: '348', thrust_kN: '934' },
];

const state = {
  stages: defaultStageTemplates.map((stage) => ({ ...stage })),
  finalPayload: '0',
};

function cloneStageTemplate(index) {
  const template =
    state.stages[state.stages.length - 1] ??
    defaultStageTemplates[index] ??
    defaultStageTemplates[defaultStageTemplates.length - 1];
  return { ...template };
}

function stageLabel(index, total) {
  if (total === 1) {
    return t('designer.stage.single');
  }

  return formatMessage('designer.stage.number', { number: index + 1 });
}

function stageRoleLabel(index, total) {
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
  const prefix = `stage-${index}`;
  const isTopStage = index === totalStages - 1;

  return `
    <article class="stage-card" aria-labelledby="${prefix}-title">
      <div class="stage-card-header">
        <div>
          <h3 id="${prefix}-title">${stageLabel(index, totalStages)}</h3>
          <p class="stage-role">${stageRoleLabel(index, totalStages)}</p>
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
                id: 'top-payload',
                name: 'finalPayload',
                label: t('designer.field.payload'),
                value: state.finalPayload,
              })
            : ''
        }
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
  const stageCount = document.getElementById('stage-count');
  const addButton = document.getElementById('add-stage');
  const removeButton = document.getElementById('remove-stage');

  if (!stageList || !stageCount || !addButton || !removeButton) {
    return;
  }

  stageList.innerHTML = state.stages
    .map((stage, index) => buildStageMarkup(stage, index, state.stages.length))
    .join('');

  stageCount.textContent = formatMessage(
    state.stages.length === 1 ? 'designer.stage.count.one' : 'designer.stage.count.other',
    { count: state.stages.length }
  );
  addButton.disabled = state.stages.length >= MAX_STAGES;
  removeButton.disabled = state.stages.length <= MIN_STAGES;
}

function syncStateFromInputs() {
  state.stages = state.stages.map((stage, index) => ({
    ...stage,
    m_p: document.getElementById(`stage-${index}-m_p`)?.value ?? stage.m_p,
    m_s: document.getElementById(`stage-${index}-m_s`)?.value ?? stage.m_s,
    Isp: document.getElementById(`stage-${index}-isp`)?.value ?? stage.Isp,
    thrust_kN: document.getElementById(`stage-${index}-thrust`)?.value ?? stage.thrust_kN,
  }));

  state.finalPayload = document.getElementById('top-payload')?.value ?? state.finalPayload;
}

function resetFieldErrors() {
  document.querySelectorAll('#designer-form .field-error').forEach((el) => {
    el.textContent = '';
  });

  document.querySelectorAll('#designer-form input').forEach((el) => {
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

  const stages = state.stages.map((stage, index) => ({
    m_p: readPositiveField(
      stage.m_p,
      `stage-${index}-m_p`,
      t('designer.error.propellant_mass'),
      errors
    ),
    m_s: readPositiveField(
      stage.m_s,
      `stage-${index}-m_s`,
      t('designer.error.structural_mass'),
      errors
    ),
    Isp: readPositiveField(stage.Isp, `stage-${index}-isp`, t('designer.error.isp'), errors),
    thrust_kN: readPositiveField(
      stage.thrust_kN,
      `stage-${index}-thrust`,
      t('designer.error.thrust'),
      errors
    ),
  }));

  const finalPayload = readNonNegativeField(
    state.finalPayload,
    'top-payload',
    t('designer.error.payload'),
    errors
  );

  if (errors.length === 0) {
    stages.forEach((stage) => validateStage(stage));
  }

  return { stages, finalPayload, errors };
}

function computePayloadMasses(stages, finalPayload) {
  const payloadMasses = new Array(stages.length);
  let payload = finalPayload;

  for (let index = stages.length - 1; index >= 0; index -= 1) {
    payloadMasses[index] = payload;
    payload += stages[index].m_p + stages[index].m_s;
  }

  return payloadMasses;
}

function buildChartData(stages, payloadMasses) {
  const totalPropellant = stages.reduce((sum, stage) => sum + stage.m_p, 0);
  const points = [{ fraction: 0, deltaV: 0 }];
  const boundaries = [];
  let burnedBefore = 0;
  let cumulativeDeltaV = 0;

  stages.forEach((stage, index) => {
    const payload = payloadMasses[index];

    for (let step = 1; step <= CHART_STEPS_PER_STAGE; step += 1) {
      const burned = (stage.m_p * step) / CHART_STEPS_PER_STAGE;
      const partialDeltaV = stageDeltaV({
        m_p: burned,
        m_s: stage.m_s + stage.m_p - burned,
        payload,
        Isp: stage.Isp,
      });

      points.push({
        fraction: (burnedBefore + burned) / totalPropellant,
        deltaV: cumulativeDeltaV + partialDeltaV,
      });
    }

    cumulativeDeltaV += stageDeltaV({
      m_p: stage.m_p,
      m_s: stage.m_s,
      payload,
      Isp: stage.Isp,
    });
    burnedBefore += stage.m_p;

    boundaries.push({
      stage: index + 1,
      fraction: burnedBefore / totalPropellant,
    });
  });

  return { points, boundaries };
}

function renderMetrics(computation) {
  const totalDvEl = document.getElementById('total-dv');
  const capabilityEl = document.getElementById('capability-label');
  const chartStatusSummary = document.getElementById('chart-status-summary');
  const twrWarning = document.getElementById('twr-warning');

  if (!totalDvEl || !capabilityEl || !chartStatusSummary || !twrWarning) {
    return;
  }

  totalDvEl.textContent = `${numberFmt.format(Math.round(computation.total))} m/s`;
  capabilityEl.textContent = computation.capability;
  chartStatusSummary.textContent = t('designer.summary.ready');

  computation.perStage.forEach((stage, index) => {
    const dvEl = document.getElementById(`stage-${index}-dv`);
    const twrEl = document.getElementById(`stage-${index}-twr`);

    if (dvEl) {
      dvEl.textContent = `${numberFmt.format(Math.round(stage.deltaV))} m/s`;
    }

    if (twrEl) {
      twrEl.textContent = twrFmt.format(stage.twr);
    }
  });

  if (computation.perStage[0].twr < 1) {
    twrWarning.textContent = formatMessage('designer.warning.underpowered', {
      twr: twrFmt.format(computation.perStage[0].twr),
    });
    twrWarning.hidden = false;
  } else {
    twrWarning.textContent = '';
    twrWarning.hidden = true;
  }
}

function renderInvalidState(errors) {
  const errorEl = document.getElementById('designer-error');
  const chartStatusSummary = document.getElementById('chart-status-summary');
  const totalDvEl = document.getElementById('total-dv');
  const capabilityEl = document.getElementById('capability-label');
  const twrWarning = document.getElementById('twr-warning');
  const chartError = document.getElementById('chart-error');
  const chart = document.getElementById('velocity-chart');

  errors.forEach(({ id, message }) => setFieldError(id, message));

  if (errorEl) {
    errorEl.textContent = t('designer.error.fix_inputs');
    errorEl.hidden = false;
  }

  if (chartStatusSummary) {
    chartStatusSummary.textContent = t('designer.summary.disabled');
  }

  if (totalDvEl) {
    totalDvEl.textContent = '—';
  }

  if (capabilityEl) {
    capabilityEl.textContent = '—';
  }

  if (twrWarning) {
    twrWarning.hidden = true;
    twrWarning.textContent = '';
  }

  state.stages.forEach((_, index) => {
    const dvEl = document.getElementById(`stage-${index}-dv`);
    const twrEl = document.getElementById(`stage-${index}-twr`);

    if (dvEl) {
      dvEl.textContent = '—';
    }

    if (twrEl) {
      twrEl.textContent = '—';
    }
  });

  if (chart) {
    chart.innerHTML = '';
    chart.setAttribute('aria-hidden', 'true');
  }

  if (chartError) {
    chartError.hidden = false;
  }
}

function renderChart(chartData) {
  const chart = document.getElementById('velocity-chart');
  const chartError = document.getElementById('chart-error');
  const width = 720;
  const height = 420;
  const margin = { top: 24, right: 24, bottom: 48, left: 64 };

  if (!chart) {
    return;
  }

  if (chartError) {
    chartError.hidden = true;
  }

  chart.removeAttribute('aria-hidden');

  const maxDeltaV = Math.max(...chartData.points.map((point) => point.deltaV), 1);
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const x = (fraction) => margin.left + fraction * plotWidth;
  const y = (deltaV) => margin.top + plotHeight - (deltaV / maxDeltaV) * plotHeight;

  const linePath = chartData.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.fraction)} ${y(point.deltaV)}`)
    .join(' ');

  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, tick) => {
    const value = (maxDeltaV * tick) / yTicks;
    const yPos = y(value);
    return `
      <line class="chart-grid" x1="${margin.left}" y1="${yPos}" x2="${width - margin.right}" y2="${yPos}"></line>
      <text class="chart-label" x="${margin.left - 12}" y="${yPos + 5}" text-anchor="end">${numberFmt.format(
        Math.round(value)
      )}</text>
    `;
  }).join('');

  const xTicks = Array.from({ length: 5 }, (_, tick) => {
    const fraction = tick / 4;
    const xPos = x(fraction);
    return `
      <line class="chart-grid" x1="${xPos}" y1="${margin.top}" x2="${xPos}" y2="${height - margin.bottom}"></line>
      <text class="chart-label" x="${xPos}" y="${height - margin.bottom + 22}" text-anchor="middle">${(
        fraction * 100
      ).toFixed(0)}%</text>
    `;
  }).join('');

  const boundaries = chartData.boundaries
    .map(
      (boundary) => `
        <line
          class="chart-boundary"
          x1="${x(boundary.fraction)}"
          y1="${margin.top}"
          x2="${x(boundary.fraction)}"
          y2="${height - margin.bottom}"
        ></line>
        <text class="chart-stage-label" x="${x(boundary.fraction)}" y="${margin.top + 16}">
          ${formatMessage('designer.stage.number', { number: boundary.stage })}
        </text>
      `
    )
    .join('');

  const finalPoint = chartData.points[chartData.points.length - 1];

  chart.innerHTML = `
    <title id="chart-svg-title">${t('designer.chart.svg_title')}</title>
    <desc id="chart-svg-desc">${t('designer.chart.svg_desc')}</desc>
    <line class="chart-axis" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"></line>
    <line class="chart-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}"></line>
    ${gridLines}
    ${xTicks}
    ${boundaries}
    <path class="chart-line" d="${linePath}"></path>
    <circle class="chart-point" cx="${x(finalPoint.fraction)}" cy="${y(finalPoint.deltaV)}" r="5"></circle>
    <text class="chart-label" x="${width / 2}" y="${height - 8}" text-anchor="middle">${t('designer.chart.axis_x')}</text>
    <text class="chart-label" x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})">
      ${t('designer.chart.axis_y')}
    </text>
  `;
}

function updateOutputs() {
  resetFieldErrors();
  syncStateFromInputs();

  const errorEl = document.getElementById('designer-error');
  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  const parsed = parseState();
  if (parsed.errors.length > 0 || parsed.finalPayload === null) {
    renderInvalidState(parsed.errors);
    return;
  }

  const payloadMasses = computePayloadMasses(parsed.stages, parsed.finalPayload);
  const stack = stackDeltaV(parsed.stages, parsed.finalPayload);

  const perStage = parsed.stages.map((stage, index) => ({
    deltaV: stack.perStage[index],
    twr: initialTWR({
      thrust_kN: stage.thrust_kN,
      totalMassAbove_kg: stage.m_p + stage.m_s + payloadMasses[index],
    }),
  }));

  renderMetrics({
    perStage,
    total: stack.total,
    capability: t(`capability.${capabilityLabel(stack.total)}`),
  });

  renderChart(buildChartData(parsed.stages, payloadMasses));
}

function addStage() {
  syncStateFromInputs();

  if (state.stages.length >= MAX_STAGES) {
    return;
  }

  state.stages.push(cloneStageTemplate(state.stages.length));
  renderStageCards();
  updateOutputs();
}

function removeStage() {
  syncStateFromInputs();

  if (state.stages.length <= MIN_STAGES) {
    return;
  }

  state.stages.pop();
  renderStageCards();
  updateOutputs();
}

function init() {
  initPage({
    titleKey: 'page.designer.title',
    descriptionKey: 'page.designer.description',
  });

  const addButton = document.getElementById('add-stage');
  const removeButton = document.getElementById('remove-stage');
  const form = document.getElementById('designer-form');

  if (!addButton || !removeButton || !form) {
    return;
  }

  renderStageCards();
  updateOutputs();

  addButton.addEventListener('click', addStage);
  removeButton.addEventListener('click', removeStage);
  form.addEventListener('input', updateOutputs);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
