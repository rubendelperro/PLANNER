Title: fix(recompute): ensure recipe computed totals are deterministic on init

Summary

This PR fixes an issue where recipes could keep stale `computed` values after app initialization when persisted ingredient definitions changed. The core of the fix is a deterministic recompute pass immediately after `INIT_DATA` that recalculates every recipe's computed totals using the final `items.byId` and updates the store via `UPDATE_RECIPE_COMPUTED`.

What I changed

- state.js
  - Added a deterministic recompute pass after `dispatch({ type: 'INIT_DATA', ... })` to recalculate recipe `computed` for all recipes using the final `items.byId`.
  - Removed leftover debug/logging that pushed to `window.__debugLogs` and excessive `console.info` statements to keep test output clean.
  - Ensured `UPDATE_RECIPE_COMPUTED` and `SAVE_RECIPE_EDITS` assign computed totals using the correct variables.
- selectors.js, utils.js, cypress/e2e/global_propagation_fixed.cy.js
  - Minor related cleanups from the debugging session (formatting and test hygiene).

Why

E2E tests (notably `global_propagation_fixed.cy.js`) exposed a race/stale-state issue: when tests override ingredient definitions in localStorage (the test injects state), recipes that had persisted `computed` fields could remain stale and not reflect the updated ingredient nutrients. For robustness we must recompute recipes using the finalized `items.byId` that results from merging persisted state with initial defaults.

Testing

- Ran unit tests (Vitest): all tests pass.
- Ran the failing E2E spec locally in headed mode during diagnosis and confirmed the fix addressed the reported failure.

Notes for reviewers

- The recompute pass is intentionally conservative (it dispatches `UPDATE_RECIPE_COMPUTED` for each recipe) to ensure reducer paths and subscribers are properly notified.
- I removed transient debugging hooks used during investigation; if you'd like a guarded debug mode for local diagnosis I can add `window.__enableDebug` to gate logs.
- It's recommended to run the full E2E suite in CI after merging to ensure there are no regressions in other specs.

How to test locally

1. Install dependencies

   npm install

2. Run unit tests

   npm run test:unit

3. Run full E2E suite (optional, can be long):

   npx cypress run

