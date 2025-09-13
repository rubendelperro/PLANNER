describe('Smoke - App startup', () => {
  it('should load the app without critical errors and initialize the state', () => {
    // Visit root
    cy.visit('/');

    // App container exists and is not empty
    cy.get('#app').should('exist').and('not.be.empty');

    // Wait for the app to signal readiness
    cy.window().its('__appReady').should('be.true');
  });
});
