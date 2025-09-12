// Visual regression: initial baseline snapshot for main planner view
// Uses cypress-image-snapshot style API (plugin integration is required)

describe('Visual regression: planner main view baseline', () => {
  it('captures a baseline snapshot of the main planner view', () => {
    cy.visit('index.html');
    // Wait for app to initialize
    cy.window().should('have.property', '__appReady');
    cy.window().then(async (win) => {
      if (typeof win.__appReady === 'function') await win.__appReady();
    });

    // Navigate to planner and ensure a deterministic active day
    // We assume the app exposes a dispatch helper for deterministic state setup
    cy.window().then((win) => {
      if (win.__dispatch) {
        // set an active day and make sure planner has a predictable entry
        const date = new Date().toISOString().slice(0, 10);
        // Ensure an active profile exists and set to default
        const state = win.__getState && win.__getState();
        const profileId = state && state.ui && state.ui.activeProfileId;
        win.__dispatch({ type: 'SET_ACTIVE_DAY', payload: date });
      }
    });

    // Allow render to settle
    cy.wait(300);

    // Capture snapshot using Percy (recommended for Cypress v15+)
    // If Percy isn't installed, fallback to saving a screenshot for manual baseline
    if (Cypress.Commands && Cypress.Commands.hasOwnProperty('percySnapshot')) {
      cy.percySnapshot('planner-main-baseline');
    } else {
      cy.screenshot('planner-main-baseline-raw');
    }
  });
});
