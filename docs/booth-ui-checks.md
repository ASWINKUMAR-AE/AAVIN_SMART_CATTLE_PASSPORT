# Booth UI checks

The Booth screens use scoped wrapping text, buttons, headers, safe-area containers, and a tab-bar adapter. Other roles keep their existing shared components. Database IDs remain in API requests and navigation parameters; display labels use names. Farmer reference, Pashu Aadhaar, and UPI form fields remain available for their existing workflows.

Run the existing farmer behavior regression and TypeScript checks:

```sh
node scripts/test-society-farmers.cjs
node node_modules/typescript/bin/tsc --noEmit
git diff --check
```

The isolated browser layout runner renders the actual seven Booth screens with React Native Web. It uses fixture data, long names, large totals, and simulated safe-area insets. It never calls the hosted API.

Install optional browser tooling outside the project, then run:

```sh
npm install --prefix /tmp/booth-ui-tools --no-audit --no-fund esbuild playwright-core
node scripts/test-booth-layout.cjs
```

Set `BOOTH_UI_TOOLS` to the tooling's `node_modules` directory and `BOOTH_UI_CHROME` to a Chrome executable if the defaults are unavailable. For a focused repeat, set `BOOTH_UI_VIEWPORTS='[[320,568],[568,320]]'`.

The full matrix covers 320×568, 360×800, 390×844, 412×915, 768×1024, 1024×768, and 568×320, in light and dark themes at 100% and 150% text sizes: 196 screen cases plus 84 modal cases. Checks cover horizontal overflow, visible UUIDs, rendering errors, four main navigation tabs, and visible modal action buttons. Screenshots and JSON results are saved to the printed temporary directory.

Validation for this change: all 280 matrix cases passed. A further 80 cases at 320×568 and 568×320 passed after the final label cleanup. The farmer behavior regression, TypeScript check, and whitespace check also passed.

These checks use placeholder icon glyphs and mocked platform effects. They do not replace physical Android/iOS checks for keyboards, native font rendering, touch behavior, and screen readers. In Expo Go, inspect farmer enrollment/editing, cow slides, KYC controls, milk entry, receipts, and profile with the keyboard open and after rotating the phone.
