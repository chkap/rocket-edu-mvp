/*
  Rocket equation calculator (vanilla JS, no build step).

  Computes:
    Δv = Isp × g0 × ln(m0 / mf)
  where g0 = 9.80665 m/s²
*/

(() => {
  const G0 = 9.80665;

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

  function init() {
    const form = document.getElementById('dv-form');
    if (!form) return;

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
        setMessage(errorEl, 'Isp must be a positive number.');
        return;
      }

      const m0 = readPositiveNumber(m0El);
      if (!m0.ok) {
        setMessage(errorEl, 'Wet mass (m0) must be a positive number.');
        return;
      }

      const mf = readPositiveNumber(mfEl);
      if (!mf.ok) {
        setMessage(errorEl, 'Dry mass (mf) must be a positive number.');
        return;
      }

      if (m0.value <= mf.value) {
        setMessage(errorEl, 'Wet mass must be greater than dry mass.');
        return;
      }

      const dv = computeDeltaV({ isp: isp.value, m0: m0.value, mf: mf.value });
      if (!Number.isFinite(dv) || dv <= 0) {
        setMessage(errorEl, 'Inputs produced an invalid Δv. Please double-check your numbers.');
        return;
      }

      const dvMs = Math.round(dv);
      const dvKms = dv / 1000;

      setMessage(
        resultEl,
        `${numberFmt.format(dvMs)} m/s (${kmPerSecFmt.format(dvKms)} km/s)`
      );
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
