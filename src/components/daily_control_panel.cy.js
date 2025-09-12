/// <reference types="cypress" />

import DailyControlPanel from './daily_control_panel.js';

describe('DailyControlPanel', () => {
  it('should mount and render without errors', () => {
    // Mount the component using the custom cy.mount command
    cy.mount(DailyControlPanel);

    // Verify the main title is visible
    cy.contains('h2', 'Panel de Control Diario').should('be.visible');
  });
});
