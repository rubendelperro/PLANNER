/**
 * Custom Cypress commands for programmatic app interactions.
 * These commands wrap the app's test hooks: window.__appReady, window.__dispatch, window.__getState
 */

/**
 * Wait for the app to be ready (window.__appReady === true)
 * @returns {Cypress.Chainable<boolean>}
 */
Cypress.Commands.add('appReady', () => {
  // Wait for the app readiness flag AND for the main nav to render.
  // Some environments set __appReady before the initial nav/buttons are
  // attached to the DOM; waiting for the settings nav button reduces
  // flakiness in contract tests that then click navigation buttons.
  return cy
    .window({ timeout: 10000 })
    .its('__appReady', { timeout: 10000 })
    .should('equal', true)
    .then(() => {
      // Ensure the settings nav button (data-view="settings") exists in DOM
      return cy
        .get('button[data-view="settings"]', { timeout: 10000 })
        .should('exist');
    });
});

/**
 * Navigate to the settings view in a robust way.
 * - If the visible nav button is present, try clicking it and wait briefly
 *   for the `#targets-panel` to appear.
 * - If the panel doesn't appear within a short timeout, fall back to using
 *   the app's dispatch test hook to set the active view.
 */
Cypress.Commands.add('gotoSettings', () => {
  // Try clicking the real nav button first
  return cy
    .get('button[data-view="settings"]', { timeout: 10000 })
    .then(($btn) => {
      if ($btn && $btn.length) {
        // Click the first matching button to avoid ambiguous multiple-element subjects
        cy.wrap($btn).first().click();
        // If the DOM didn't update within 5s, fall back to dispatch.
        return cy.get('#targets-panel', { timeout: 5000 }).then(
          () => true,
          () => cy.dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'settings' })
        );
      }

      // If no nav button is present, use dispatch directly.
      return cy.dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'settings' });
    });
});

/**
 * Dispatch a Redux-like action via the app's test hook.
 * @param {Object} action - action object with { type, payload }
 * @returns {Cypress.Chainable<any>} - whatever the app's dispatch returns
 */
Cypress.Commands.add('dispatch', (action) => {
  return cy.window().then((win) => {
    if (!win || !win.__dispatch)
      throw new Error('__dispatch not available on window');
    return win.__dispatch(action);
  });
});

/**
 * Read the app state using the exposed test hook.
 * @returns {Cypress.Chainable<object>} - the full application state
 */
Cypress.Commands.add('getState', () => {
  return cy.window().then((win) => {
    if (!win || !win.__getState)
      throw new Error('__getState not available on window');
    return win.__getState();
  });
});

/**
 * Create a profile programmatically and return the saved profile from state.
 * @param {Object} profile - profile payload (must include id)
 * @returns {Cypress.Chainable<object>} - created profile from state
 */
Cypress.Commands.add('createProfile', (profile) => {
  const defaults = {
    personalGoals: {},
    trackedNutrients: [],
    referenceSourceId: 'EFSA-2017',
  };
  const payload = Object.assign({}, defaults, profile);

  return cy.dispatch({ type: 'CREATE_PROFILE', payload }).then(() =>
    cy.getState().then((state) => {
      return (
        state &&
        state.profiles &&
        state.profiles.byId &&
        state.profiles.byId[payload.id]
      );
    })
  );
});

/**
 * Update a profile and return the updated profile from state.
 * @param {Object} updates - profile updates, must include id
 * @returns {Cypress.Chainable<object>} - updated profile
 */
Cypress.Commands.add('updateProfile', (updates) => {
  return cy
    .dispatch({ type: 'UPDATE_PROFILE', payload: updates })
    .then(() =>
      cy
        .getState()
        .then(
          (state) =>
            state &&
            state.profiles &&
            state.profiles.byId &&
            state.profiles.byId[updates.id]
        )
    );
});

/**
 * Delete a profile and return a boolean indicating whether it was removed.
 * @param {string} id - profile id
 * @returns {Cypress.Chainable<boolean>} - true if profile no longer exists
 */
Cypress.Commands.add('deleteProfile', (id) => {
  return cy
    .dispatch({ type: 'DELETE_PROFILE', payload: id })
    .then(() =>
      cy
        .getState()
        .then(
          (state) =>
            !(
              state &&
              state.profiles &&
              state.profiles.byId &&
              state.profiles.byId[id]
            )
        )
    );
});

/**
 * Fetch a profile by id from state.
 * @param {string} id
 * @returns {Cypress.Chainable<object|null>}
 */
Cypress.Commands.add('getProfile', (id) => {
  return cy
    .getState()
    .then(
      (state) =>
        state &&
        state.profiles &&
        state.profiles.byId &&
        state.profiles.byId[id]
    );
});

/**
 * Create a profile and set it as the active profile.
 * @param {Object} profile
 * @returns {Cypress.Chainable<object>} - created profile
 */
Cypress.Commands.add('createAndActivateProfile', (profile) => {
  return cy
    .createProfile(profile)
    .then((p) =>
      cy.dispatch({ type: 'SET_ACTIVE_PROFILE', payload: p.id }).then(() => p)
    );
});
