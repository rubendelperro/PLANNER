/// <reference types="cypress" />

// First component test for the Daily Control Panel

describe('Component: Daily Control Panel', () => {
  it('mounts and displays the daily control panel', () => {
    // Provide a minimal deterministic state that the selectors expect
    const state = {
      profiles: {
        byId: {
          'profile-1': {
            id: 'profile-1',
            name: 'E2E User',
            isDefault: false,
            trackedNutrients: ['calories', 'proteins'],
            personalGoals: {},
            referenceSourceId: 'ref-1',
          },
        },
        allIds: ['profile-1'],
      },
      ui: {
        activeView: 'planner',
        activeProfileId: 'profile-1',
        activePlannerDay: new Date().toISOString().split('T')[0],
        selectedCells: new Set(),
        nexusView: 'week',
      },
      items: {
        allIds: ['calories', 'proteins'],
        byId: {
          calories: {
            id: 'calories',
            name: 'Calorías',
            unit: 'kcal',
            itemType: 'definicion',
          },
          proteins: {
            id: 'proteins',
            name: 'Proteínas',
            unit: 'g',
            itemType: 'definicion',
          },
        },
      },
      planner: {},
      referenceGuides: {
        byId: {
          'ref-1': { name: 'Ref', nutrients: { calories: 2000, proteins: 50 } },
        },
      },
      stores: { allIds: [], byId: {} },
      categories: { allIds: [], byId: {} },
      notifications: [],
    };

    // Mount the fragment using the support helper. The helper will marshal the state into the AUT.
    cy.mountAppFragment(() => state);

    // Assert the daily control panel exists and is visible
    cy.get('[data-test="daily-control-panel"]', { timeout: 5000 })
      .should('exist')
      .and('be.visible');

    // Take a visual snapshot (Percy or screenshot fallback)
    cy.visualSnapshot('daily-control-panel-ct');
  });
});
