Open `index.html` or `designer-v2.html` in a browser, or run `python3 -m http.server`.

## i18n contract

- All user-facing strings live in `docs/i18n/en.json` and `docs/i18n/zh.json`.
- Use `docs/lib/i18n.js` for language selection and translation:
  - `getLang()` reads `?lang=` first, then the `lang` cookie, then defaults to `en`.
  - `setLang(code)` writes `lang=<code>; Path=/; Max-Age=31536000; SameSite=Lax` and reloads the current page with `?lang=` updated.
  - `t(key)` looks up the active language, falls back to English, and warns on missing keys.
  - `applyTo(root)` translates elements with `data-i18n`; use `data-i18n-html="true"` when the value contains inline markup.
- Every page should include the shared language switcher and send visible strings through dictionary keys.
- `/zh/*.html` files are static redirect shims that forward to the matching page with `?lang=zh`.
