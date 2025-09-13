// Contracts E2E: verify critical DOM contracts to avoid refactor regressions
describe('DOM contracts: critical UI elements', () => {
  beforeEach(() => {
    // Visit the explicitly-set baseUrl (CI sets CYPRESS_baseUrl) and wait for app-ready
    cy.visit('/');
    // Wait for app hook to be available and callable
    cy.window()
      .its('__appReady')
      .should('be.a', 'function')
      .then((fn) => fn());
  });

  it('exposes the new profile button that events.js expects', () => {
    // allow longer timeout in CI
    cy.get('#new-profile-btn', { timeout: 20000 })
      .should('exist')
      .and('be.visible');
  });

  it('renders targets panel and Vitamin D displays 0 when target exists but finalValue unset', () => {
    // Setup: ensure there is an active profile with a target for vitamin_d but without finalValue
    cy.window().then((win) => {
      const dispatch = (a) => win.__dispatch && win.__dispatch(a);

      // create a profile and add a target for vitamin_d with null finalValue
      const id = `E2E-CONTRACT-${Date.now()}`;
      dispatch({
        type: 'CREATE_PROFILE',
        payload: {
          id,
          name: id,
          personalGoals: {},
          trackedNutrients: [],
          referenceSourceId: 'EFSA-2017',
        },
      });

      dispatch({
        type: 'UPDATE_PROFILE',
        payload: {
          id,
          age: 30,
          weight: 70,
          height: 170,
          gender: 'male',
          activityLevel: 'sedentary',
          goal: 'maintain',
        },
      });

      dispatch({
        type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
        payload: { profileId: id, nutrients: ['vitamin_d'] },
      });

      // set target entry but leave finalValue undefined/null
      dispatch({
        type: 'SET_NUTRITIONAL_TARGET',
        payload: { profileId: id, nutrientId: 'vitamin_d', value: null },
      });

      dispatch({ type: 'SET_ACTIVE_PROFILE', payload: id });
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
              expect(['0', '0.0']).to.include(v);
            });
        });
    });
  });
});
// Contracts E2E: verify critical DOM contracts to avoid refactor regressions
describe('DOM contracts: critical UI elements', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.appReady();
  });

  it('exposes the new profile button that events.js expects', () => {
    cy.get('#new-profile-btn').should('exist').and('be.visible');
  });

  it('renders targets panel and Vitamin D displays 0 when target exists but finalValue unset', () => {
    // Setup: ensure there is an active profile with a target for vitamin_d but without finalValue
    cy.window().then(async (win) => {
      if (typeof win.__appReady === 'function') await win.__appReady();
      const dispatch = (a) => win.__dispatch && win.__dispatch(a);
      const getState = () => (win.__getState ? win.__getState() : null);

      // create a profile and add a target for vitamin_d with null finalValue
      const id = `E2E-CONTRACT-${Date.now()}`;
      dispatch({
        type: 'CREATE_PROFILE',
        payload: {
          id,
          name: id,
          personalGoals: {},
          trackedNutrients: [],
          referenceSourceId: 'EFSA-2017',
        },
      });

      dispatch({
        type: 'UPDATE_PROFILE',
        payload: {
          id,
          age: 30,
          weight: 70,
          height: 170,
          gender: 'male',
          activityLevel: 'sedentary',
          goal: 'maintain',
        },
      });

      dispatch({
        type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
        payload: { profileId: id, nutrients: ['vitamin_d'] },
      });

      // set target entry but leave finalValue undefined/null
      dispatch({
        type: 'SET_NUTRITIONAL_TARGET',
        payload: { profileId: id, nutrientId: 'vitamin_d', value: null },
      });

      dispatch({ type: 'SET_ACTIVE_PROFILE', payload: id });

      // allow app to re-render
      cy.wait(200);

      // Assert presence
      cy.get('#targets-panel').should('exist').and('be.visible');
      cy.get('#targets-panel').within(() => {
        cy.get('[data-nutrient-id="vitamin_d"]')
          .should('exist')
          .within(() => {
            cy.get('[data-value-display]')
              .invoke('text')
              .then((text) => {
                // Trim and check; expected to be '0' when target exists but finalValue is null/undefined
                const v = text.trim();
                expect(['0', '0.0']).to.include(v);
              });
          });
      });
    });
  });
});
