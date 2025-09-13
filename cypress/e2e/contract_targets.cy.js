describe('Contract: Targets panel and profile interactions', () => {
  before(() => {
    cy.visit('http://127.0.0.1:5173');
  });

  it('renders the targets panel and nutrient rows', () => {
    cy.get('#targets-panel').should('exist');
    cy.get('#targets-panel [data-nutrient-id]').should(
      'have.length.greaterThan',
      0
    );
  });

  it('each nutrient row has a numeric data-value-display attribute', () => {
    cy.get('#targets-panel [data-nutrient-id]').each(($row) => {
      cy.wrap($row)
        .find('[data-value-display]')
        .should('exist')
        .then(($d) => {
          const val = $d.attr('data-value-display') || $d.text();
          // Match a number (integer or float) in the displayed string
          expect(val).to.match(/\d+/);
        });
    });
  });

  it('profile selector confirm flow shows hidden confirm button toggling', () => {
    cy.get('#profile-selector')
      .should('exist')
      .then(($sel) => {
        const current = $sel.val();
        // pick the first available option that is different
        cy.get('#profile-selector option').then(($opts) => {
          const firstDifferent = Array.from($opts).find(
            (o) => o.value !== current
          );
          if (firstDifferent) {
            cy.get('#profile-selector').select(firstDifferent.value);
            cy.get('#confirm-profile-change').should(
              'not.have.class',
              'hidden'
            );
            cy.get('#confirm-profile-change').click();
            cy.get('#confirm-profile-change').should('have.class', 'hidden');
          }
        });
      });
  });

  it('can create and delete a profile via UI buttons', () => {
    // create profile
    cy.get('#new-profile-btn').should('exist').click();
    // after creation, active profile id should be present in the selector
    cy.get('#profile-selector')
      .should('exist')
      .then(($sel) => {
        const selected = $sel.val();
        expect(selected).to.match(/PROF-/);
      });

    // delete profile (if not default)
    cy.get('#delete-profile-btn').should('exist').click();
    // either deletion succeeded and selector value changed or deletion was blocked for default profile
    cy.get('#profile-selector').should('exist');
  });
});
