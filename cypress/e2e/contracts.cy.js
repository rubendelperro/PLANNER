// Contracts E2E: verify critical DOM contracts to avoid refactor regressions
describe('DOM contracts: critical UI elements', () => {
  beforeEach(() => {
    // Visit the explicitly-set baseUrl (CI sets CYPRESS_baseUrl) and wait for app-ready
    cy.visit('/');
    // Use project helper that waits for window.__appReady === true
    cy.appReady();
    // Ensure the Settings view (where ControlCenter lives) is active so expected elements are visible
    cy.dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'settings' });
  });

  it('exposes the new profile button that events.js expects', () => {
    // allow longer timeout in CI
    cy.get('#new-profile-btn', { timeout: 20000 })
      .should('exist')
      .and('be.visible');
  });

  it('renders targets panel and Vitamin D displays 0 when target exists but finalValue unset', () => {
    // Use the project's dispatch wrapper to prepare a profile and a vitamin_d target with null finalValue
    cy.createAndActivateProfile({
      id: `E2E-CONTRACT-${Date.now()}`,
      name: `E2E-CONTRACT-${Date.now()}`,
    }).then(() => {
      cy.dispatch({
        type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
        payload: {
          profileId: Cypress._.last(
            Cypress.state('window').__getState().profiles.allIds
          ),
          nutrients: ['vitamin_d'],
        },
      });
      cy.dispatch({
        type: 'SET_NUTRITIONAL_TARGET',
        payload: {
          profileId: Cypress._.last(
            Cypress.state('window').__getState().profiles.allIds
          ),
          nutrientId: 'vitamin_d',
          value: null,
        },
      });
    });

    // allow app to re-render and wait for targets panel
    cy.get('#targets-panel', { timeout: 20000 })
      .should('exist')
      .and('be.visible');
    cy.get('#targets-panel').within(() => {
      cy.get('[data-nutrient-id="vitamin_d"]', { timeout: 10000 })
        .should('exist')
        .within(() => {
          cy.get('[data-value-display]')
            .invoke('text')
            .then((text) => {
              const v = text.trim();
              // Extract numeric part (handles '0', '0.0', '0mcg', '0 mcg')
              const num = parseFloat(v.replace(/[^0-9.\-]+/g, ''));
              expect(num).to.equal(0);
            });
        });
    });
  });
});
