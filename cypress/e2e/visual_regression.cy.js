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

    // Capture baseline snapshots at multiple viewports to improve coverage
    const baselineViewports = [375, 768, 1280];
    if (typeof cy.percySnapshot === 'function') {
      // Percy: capture a named snapshot per width
      cy.wrap(baselineViewports).each((w) => {
        cy.viewport(w, 900);
        cy.wait(200);
        cy.percySnapshot(`planner-main-baseline-${w}`, { widths: [w] });
      });
    } else {
      // Fallback: save regular screenshots per viewport
      cy.wrap(baselineViewports).each((w) => {
        cy.viewport(w, 900);
        cy.wait(200);
        cy.screenshot(`planner-main-baseline-${w}-raw`);
      });
    }
  });

  it('component: Daily Control Panel - snapshot', () => {
    // deterministic viewport for component snapshots
    cy.viewport(1280, 800);

    cy.visit('index.html');
    cy.appReady();

    // ensure app readiness
    cy.window().then(async (win) => {
      if (typeof win.__appReady === 'function') await win.__appReady();
    });

    // freeze CSS animations/transitions to reduce visual noise
    cy.document().then((doc) => {
      const style = doc.createElement('style');
      style.setAttribute('data-test', 'disable-animations');
      style.innerHTML = `* { transition: none !important; animation: none !important; }`;
      doc.head.appendChild(style);
    });

    // deterministic date
    const date = new Date().toISOString().slice(0, 10);

    // Create and activate a dedicated visual E2E profile, then populate planner
    cy.createProfile({
      id: `VIS-E2E-${Date.now()}`,
      name: `Visual E2E ${Date.now()}`,
    }).then((profile) => {
      // Use app dispatch to set the active profile and day
      cy.dispatch({ type: 'SET_ACTIVE_PROFILE', payload: profile.id });
      cy.dispatch({ type: 'SET_ACTIVE_DAY', payload: date });

      // pick a seeded item from the app state to avoid hardcoding ids
      cy.getState().then((s) => {
        const items = s.items && s.items.byId;
        const seededId =
          Object.keys(items || {}).find(
            (id) => items[id] && items[id].itemType !== 'receta'
          ) || Object.keys(items || {})[0];

        // assign a deterministic portion to lunch
        cy.dispatch({
          type: 'ASSIGN_ITEM_TO_SLOT',
          payload: { date, slot: 'lunch', id: seededId, grams: 150 },
        });

        // wait for app to compute totals and render
        cy.wait(300);

        const candidateSelectors = [
          '[data-test="daily-control-panel"]',
          '.daily-control',
          '.daily-panel',
          '#daily-panel',
        ];

        // Try each selector until we find a visible one, otherwise try a text-based heuristic
        function findPanel() {
          return new Cypress.Promise((resolve) => {
            const tryNext = (idx) => {
              if (idx >= candidateSelectors.length) {
                // heuristic: find first element that contains Spanish 'Totales' or 'Totales diarios'
                cy.get('body').then(($b) => {
                  const textMatch = $b
                    .find('*')
                    .filter((i, el) =>
                      /Totales|Totales diarios|Diario/i.test(el.textContent)
                    );
                  if (textMatch && textMatch.length) {
                    resolve(Cypress.$(textMatch[0]));
                  } else {
                    resolve(null);
                  }
                });
                return;
              }
              const sel = candidateSelectors[idx];
              cy.get('body').then(($b) => {
                const found = $b.find(sel);
                if (found && found.length) {
                  resolve(Cypress.$(found[0]));
                } else {
                  tryNext(idx + 1);
                }
              });
            };
            tryNext(0);
          });
        }

        findPanel().then(($panel) => {
          if (!$panel) {
            throw new Error(
              'Daily Control Panel not found. Add data-test="daily-control-panel" to the component or adjust selectors.'
            );
          }

          const panelSelector =
            $panel && $panel.length
              ? $panel
              : '[data-test="daily-control-panel"]';

          // Capture the component at multiple widths (mobile/tablet/desktop)
          const compViewports = [375, 768, 1280];
          cy.wrap(compViewports).each((w) => {
            cy.viewport(w, 900);
            cy.wait(150);

            if (typeof cy.percySnapshot === 'function') {
              // Percy: snapshot the scoped element at this width
              cy.wrap($panel).then(($el) =>
                cy.percySnapshot(`Daily Control Panel - ${w}`, {
                  widths: [w],
                  scope: $el,
                })
              );
            } else {
              // Fallback: screenshot the element alone per viewport
              cy.wrap($panel).screenshot(`daily-control-panel-raw-${w}`);
            }
          });
        });
      });
    });
  });

  it('captures snapshots for all main app sections and details (multi-viewport)', () => {
    const viewports = [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'tablet', width: 1024, height: 900 },
      { name: 'mobile', width: 375, height: 812 },
    ];

    // Sections to snapshot using the nav buttons
    const sections = [
      { id: 'planner', label: 'Planificador' },
      { id: 'library', label: 'Biblioteca' },
      { id: 'recipes', label: 'Recetas' },
      { id: 'settings', label: 'Mis Ajustes' },
    ];

    cy.visit('index.html');
    cy.appReady();

    // disable animations globally
    cy.document().then((doc) => {
      const style = doc.createElement('style');
      style.setAttribute('data-test', 'disable-animations-global');
      style.innerHTML = `* { transition: none !important; animation: none !important; }`;
      doc.head.appendChild(style);
    });

    // Ensure deterministic state: set active day and ensure an active profile exists
    const today = new Date().toISOString().slice(0, 10);
    cy.window().then((win) => {
      if (win.__dispatch) {
        win.__dispatch({ type: 'SET_ACTIVE_DAY', payload: today });
      }
    });

    // Helper to snapshot the full viewport or a scoped element
    const takeSnapshots = (nameSuffix, $scope) => {
      viewports.forEach((vp) => {
        cy.viewport(vp.width, vp.height);
        const snapshotName = `${nameSuffix} -- ${vp.name}`;

        if (typeof cy.percySnapshot === 'function') {
          if ($scope) {
            cy.wrap($scope).then(($el) => {
              return cy.percySnapshot(snapshotName, {
                widths: [vp.width],
                scope: $el,
              });
            });
          } else {
            cy.percySnapshot(snapshotName, { widths: [vp.width] });
          }
        } else {
          // fallback to screenshot: prefer scoped element if provided
          if ($scope) {
            cy.wrap($scope).screenshot(
              snapshotName.replace(/\s+/g, '-').toLowerCase()
            );
          } else {
            cy.screenshot(snapshotName.replace(/\s+/g, '-').toLowerCase());
          }
        }
      });
    };

    // Iterate sections and capture snapshots
    sections.forEach((sec) => {
      // Click the nav button to switch view when present
      cy.get(`button[data-view="${sec.id}"]`).click();
      // Wait for view to render
      cy.wait(250);

      // Prefer to snapshot the main content container if present
      const mainSelector =
        sec.id === 'planner'
          ? '#planner-container'
          : sec.id === 'library'
            ? '#shopping-list-container, #library-container, .bg-white'
            : undefined;

      if (mainSelector) {
        cy.get('body').then(($b) => {
          const found = $b.find(mainSelector).first();

          if (found && found.length) {
            takeSnapshots(`section: ${sec.label}`, found);
            return;
          }

          // fallback to full viewport
          takeSnapshots(`section: ${sec.label}`, null);
        });
      } else {
        // default full viewport snapshot
        takeSnapshots(`section: ${sec.label}`, null);
      }
    });

    // Now capture example detail pages: open first recipe and first item if present
    // 1) Recipes detail
    cy.get('button[data-view="recipes"]').click();
    cy.wait(200);
    cy.get('[data-action="view-recipe"]')
      .first()
      .then(($el) => {
        if ($el && $el.length) {
          cy.wrap($el).click();
          cy.wait(250);
          // snapshot recipe detail container
          cy.get('body').then(($b) => {
            const found = $b
              .find('.bg-white.p-6.rounded-lg, .bg-white.p-6')
              .first();
            takeSnapshots('detail: recipe', found.length ? found : null);
            // open recipe edit mode and snapshot the editor if an edit button exists
            const editBtn = $b.find('#edit-recipe-btn');
            if (editBtn && editBtn.length) {
              cy.wrap(editBtn).click();
              cy.wait(250);
              cy.get('body').then(($bb) => {
                const editor = $bb.find('#recipe-form, .recipe-editor').first();
                takeSnapshots('edit: recipe', editor.length ? editor : null);
              });
            }
          });
        }
      });

    // 2) Item detail from library
    cy.get('button[data-view="library"]').click();
    cy.wait(200);
    cy.get('[data-action="view-item"]')
      .first()
      .then(($el) => {
        if ($el && $el.length) {
          cy.wrap($el).click();
          cy.wait(250);
          cy.get('body').then(($b) => {
            const found = $b
              .find('.bg-white.p-6.rounded-lg, .bg-white.p-6')
              .first();
            takeSnapshots('detail: item', found.length ? found : null);
            // open item edit mode and snapshot the editor if an edit button exists
            const editItemBtn = $b.find('#edit-item-btn');
            if (editItemBtn && editItemBtn.length) {
              cy.wrap(editItemBtn).click();
              cy.wait(250);
              cy.get('body').then(($bb) => {
                const itemEditor = $bb
                  .find('#item-detail-form, .item-editor')
                  .first();
                takeSnapshots(
                  'edit: item',
                  itemEditor.length ? itemEditor : null
                );
              });
            }
          });
        }
      });
  });
});
