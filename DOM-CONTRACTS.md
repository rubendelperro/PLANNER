DOM Contracts for PLANNER (ControlCenter / events.js)

Purpose

This document lists the stable DOM selectors and data-attributes that other parts of the app (notably `events.js`) and the Cypress contract tests rely on. Any refactor touching rendering must preserve these contracts or update this document and the tests together.

Critical selectors (must remain present)

- `#new-profile-btn` — button element used to open the profile creation flow.
- `#profile-selector` — select element used to choose the active profile.
- `#profile-form` — form element for creating/editing profiles.
- `#targets-panel` — container that holds per-nutrient target rows.

Per-nutrient row attributes (each nutrient row inside `#targets-panel` should include):

- `data-nutrient-id` — string identifier for the nutrient (e.g., `vitamin_d`).
- `data-value-display` — visible textual display for the target value. Tests may parse the numeric portion; format may include a unit suffix (e.g., `0mcg`) but the numeric part must be visible and parseable.

Test hooks on `window` (exposed by `state.js`)

- `window.__appReady` — boolean flag (true when app initialized). Tests use helper `cy.appReady()` to wait for it.
- `window.__dispatch` — function used by tests to dispatch actions programmatically.
- `window.__getState` — function returning the current app state for inspection.

Guidelines for changes

- If you rename any of the critical selectors or attributes, update `DOM-CONTRACTS.md` and the contract spec `cypress/e2e/contracts.cy.js` in the same PR.
- Keep changes backward-compatible where possible. If a temporary compatibility shim is required, include an explicit comment in `index.html` and add a TODO with an expected removal date.

