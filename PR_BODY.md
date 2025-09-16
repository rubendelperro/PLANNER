Title: refactor: extract ControlCenter, StoreManager, CategoryManager and move store/category field renderers to components (preserve DOM test hooks)

Description:

This PR extracts the ControlCenter UI and related helpers out of `render.js` into dedicated component modules under `components/` to improve modularity and testability while preserving the public DOM contract used by E2E tests.

What changed

- Extracted `components/ControlCenter.js` (preserves `#targets-panel`, `#profile-selector`, `#new-profile-btn` and window test hooks).
- Added `components/StoreManager.js` with `renderStoreManager` and `renderStoresField`.
- Added `components/CategoryManager.js` with `renderCategoryManager` and `renderCategoriesField`.
- Updated `render.js` to delegate to the new component renderers and helper fields.
- Added/updated contract E2E spec(s) to ensure the DOM hooks remain intact and added CI guard scripts (`start:ci`).

Notes & verification

- I verified code edits and removed accidental duplicate declarations introduced during the extraction.
- Remaining tasks: run `npm run lint` and `npm test` locally (Node/npm required), then run the Cypress contract spec locally and in CI.

Checklist

- [ ] Node/npm installed and lint tests pass
- [ ] Unit tests passing
- [ ] Cypress contract specs pass locally
- [ ] CI run green on GitHub Actions

If CI fails, please attach the workflow artifacts (Cypress screenshots/logs) and I'll triage the failing spec(s).
