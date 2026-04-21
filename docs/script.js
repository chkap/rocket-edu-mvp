import { formatMessage, initPage, t } from './lib/i18n.js';

const G0 = 9.80665;

const EXAMPLE = { isp: 282, m0: 433100, mf: 25600 };

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const kmPerSecFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function setMessage(el, message) {
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function clearMessage(el) {
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
}

function readPositiveNumber(inputEl) {
  const n = inputEl?.valueAsNumber;
  if (!Number.isFinite(n)) return { ok: false, value: NaN };
  if (n <= 0) return { ok: false, value: n };
  return { ok: true, value: n };
}

function computeDeltaV({ isp, m0, mf }) {
  return isp * G0 * Math.log(m0 / mf);
}

function initExampleButton(form) {
  const btn = document.getElementById('load-falcon9');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const ispEl = document.getElementById('isp');
    const m0El = document.getElementById('m0');
    const mfEl = document.getElementById('mf');

    if (ispEl) ispEl.value = String(EXAMPLE.isp);
    if (m0El) m0El.value = String(EXAMPLE.m0);
    if (mfEl) mfEl.value = String(EXAMPLE.mf);

    document.getElementById('calculator')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    if (form?.requestSubmit) {
      form.requestSubmit();
    } else {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  });
}

function init() {
  initPage({
    titleKey: 'page.index.title',
    descriptionKey: 'page.index.description',
  });

  const form = document.getElementById('dv-form');
  if (!form) return;

  initExampleButton(form);

  const ispEl = document.getElementById('isp');
  const m0El = document.getElementById('m0');
  const mfEl = document.getElementById('mf');
  const errorEl = document.getElementById('calc-error');
  const resultEl = document.getElementById('calc-result');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    clearMessage(errorEl);
    clearMessage(resultEl);

    const isp = readPositiveNumber(ispEl);
    if (!isp.ok) {
      setMessage(errorEl, t('index.calculator.error.isp'));
      return;
    }

    const m0 = readPositiveNumber(m0El);
    if (!m0.ok) {
      setMessage(errorEl, t('index.calculator.error.m0'));
      return;
    }

    const mf = readPositiveNumber(mfEl);
    if (!mf.ok) {
      setMessage(errorEl, t('index.calculator.error.mf'));
      return;
    }

    if (m0.value <= mf.value) {
      setMessage(errorEl, t('index.calculator.error.mass_order'));
      return;
    }

    const dv = computeDeltaV({ isp: isp.value, m0: m0.value, mf: mf.value });
    if (!Number.isFinite(dv) || dv <= 0) {
      setMessage(errorEl, t('index.calculator.error.invalid'));
      return;
    }

    const dvMs = Math.round(dv);
    const dvKms = dv / 1000;

    setMessage(
      resultEl,
      formatMessage('index.calculator.result', {
        ms: numberFmt.format(dvMs),
        kms: kmPerSecFmt.format(dvKms),
      })
    );
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
