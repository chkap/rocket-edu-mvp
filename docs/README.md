Open `index.html` or `designer-v2.html` in a browser, or run `python3 -m http.server`.

## Smoke test

- Run `npm run smoke` from the repository root to execute the designer-v2 smoke
  test in Vitest + JSDOM.
- The smoke test loads `designer-v2.html`, selects the Falcon 9 preset, clicks
  Analyze, and checks the verdict and total Δv summary.

## Engine catalog contract

- Add new designer-v2 engines in `docs/data/engines.json`.
- Each engine needs a unique `key` plus thrust, Isp, mass, propellant, and any
  fixed-mass metadata consumed by `docs/lib/designer_v2/physics.js`.
- Add matching UI labels in both `docs/i18n/en.json` and `docs/i18n/zh.json`
  under `designer_v2.engine.<key>`.

## i18n contract

- All user-facing strings live in `docs/i18n/en.json` and `docs/i18n/zh.json`.
- Use `docs/lib/i18n.js` for language selection and translation:
  - `getLang()` reads `?lang=` first, then the `lang` cookie, then defaults to `en`.
  - `setLang(code)` writes `lang=<code>; Path=/; Max-Age=31536000; SameSite=Lax` and reloads the current page with `?lang=` updated.
  - `t(key)` looks up the active language, falls back to English, and warns on missing keys.
  - `applyTo(root)` translates elements with `data-i18n`; use `data-i18n-html="true"` when the value contains inline markup.
- Every page should include the shared language switcher and send visible strings through dictionary keys.
- `/zh/*.html` files are static redirect shims that forward to the matching page with `?lang=zh`.
