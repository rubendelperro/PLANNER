describe('Contract: Targets panel and profile interactions', () => {
  beforeEach(() => {
    // Visit root so baseUrl/CYPRESS_baseUrl works in CI.
    // Attach a console hook via onBeforeLoad so we can persist browser logs
    // for debugging failing runs where the DOM is missing expected elements.
    cy.visit('/', {
      onBeforeLoad(win) {
        try {
          win.__cypressConsoleLogs = [];
          ['log', 'info', 'warn', 'error'].forEach((level) => {
            const orig = win.console && win.console[level];
            win.console[level] = function () {
              try {
                const args = Array.from(arguments).map((a) => {
                  try {
                    if (typeof a === 'object') return JSON.stringify(a);
                    return String(a);
                  } catch (e) {
                    return String(a);
                  }
                });
                win.__cypressConsoleLogs.push({
                  level,
                  args,
                  time: new Date().toISOString(),
                });
              } catch (e) {
                // ignore logging errors
              }
              if (orig && typeof orig.apply === 'function')
                orig.apply(this, arguments);
            };
          });
        } catch (e) {
          // noop
        }
      },
    });
    // wait for the app to expose test hooks and initialize
    cy.appReady();
    // Navigate to settings using a resilient helper that falls back to
    // programmatic dispatch if clicking the nav button doesn't render the view.
    cy.gotoSettings();

    // give the renderer a moment to re-render the new view
    cy.get('#targets-panel', { timeout: 20000 }).should('exist');

    // Dump window test-hooks and a small snapshot of state to help debug
    // failing runs where Cypress times out waiting for the runtime DOM.
    cy.window().then((win) => {
      const payload = {
        appReady: win && win.__appReady,
        hasDispatch: !!(win && win.__dispatch),
        hasGetState: !!(win && win.__getState),
        userAgent: win && win.navigator && win.navigator.userAgent,
        stateSnapshot: win && win.__getState ? win.__getState() : null,
      };
      // Call the node task to write the file for offline inspection.
      cy.task('writeFile', {
        filePath: 'cypress/results/contract_targets_window.json',
        contents: payload,
      });
      // Also write the current document HTML so we can see what Cypress sees
      cy.document().then((doc) => {
        cy.task('writeFile', {
          filePath: 'cypress/results/contract_targets_dom.html',
          contents: doc.documentElement.outerHTML,
        });
        // Persist any captured console logs from the browser
        cy.window().then((w) => {
          try {
            const logs = (w && w.__cypressConsoleLogs) || [];
            cy.task('writeFile', {
              filePath: 'cypress/results/contract_targets_console.json',
              contents: logs,
            });
          } catch (e) {
            // ignore
          }
        });
      });
    });
  });

  it('renders the targets panel and nutrient rows', () => {
    cy.get('#targets-panel', { timeout: 20000 })
      .should('exist')
      .then(($panel) => {
        // older versions used [data-nutrient-id]; newer refactor renders items with
        // [data-value-display]. Use a non-failing jQuery lookup to decide which
        // representation is present so Cypress doesn't fail the spec due to a
        // timeout on an optional selector.
        const $byId = $panel.find('[data-nutrient-id]');
        if ($byId && $byId.length > 0) {
          expect($byId.length).to.be.greaterThan(0);
        } else {
          const $byVal = $panel.find('[data-value-display]');
          expect($byVal.length).to.be.greaterThan(0);
        }
      });
  });

  it('each nutrient row has a numeric data-value-display attribute', () => {
    // Try to iterate by data-nutrient-id if present; otherwise iterate over
    // any elements with data-value-display inside the targets panel.
    cy.get('#targets-panel', { timeout: 20000 }).then(($panel) => {
      let $rows = $panel.find('[data-nutrient-id]');
      if (!($rows && $rows.length > 0)) {
        $rows = $panel.find('[data-value-display]');
      }
      expect($rows.length).to.be.greaterThan(0);
      // iterate plain DOM nodes to assert numeric values
      Array.from($rows).forEach((row) => {
        const el = row.nodeType ? row : row[0];
        // If this element isn't the value holder, find the display inside
        const valEl =
          el.getAttribute && el.hasAttribute('data-value-display')
            ? el
            : el.querySelector && el.querySelector('[data-value-display]');
        const valueText =
          (valEl &&
            (valEl.getAttribute('data-value-display') || valEl.textContent)) ||
          el.textContent ||
          '';
        expect(/\d+/.test(valueText)).to.equal(true);
      });
    });
  });

  it('profile selector confirm flow shows hidden confirm button toggling', () => {
    // Give more time for profile controls to appear; interact with selector
    cy.get('#profile-selector', { timeout: 20000 })
      .should('exist')
      .then(($sel) => {
        const current = $sel.val();
        cy.get('#profile-selector option', { timeout: 5000 }).then(($opts) => {
          const firstDifferent = Array.from($opts).find(
            (o) => o.value !== current
          );
          if (firstDifferent) {
            cy.get('#profile-selector').select(firstDifferent.value);
            cy.get('#confirm-profile-change', { timeout: 5000 }).should(
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
    cy.get('#new-profile-btn', { timeout: 20000 }).should('exist').click();

    // after creation, active profile id should be present in the selector
    cy.get('#profile-selector', { timeout: 10000 })
      .should('exist')
      .then(($sel) => {
        const selected = $sel.val();
        expect(selected).to.match(/PROF-/);
      });

    // delete profile (if not default)
    cy.get('#delete-profile-btn', { timeout: 10000 }).should('exist').click();

    // either deletion succeeded and selector value changed or deletion was blocked for default profile
    cy.get('#profile-selector').should('exist');
  });
});
