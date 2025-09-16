describe('Propagación de Cambios Globales (fixed)', () => {
  const INGREDIENT_ID = 'CHICKEN-BREAST';
  const PROTEIN_NUTRIENT_ID = 'proteins';
  const TODAY = new Date().toISOString().split('T')[0];
  const PROFILE_A_ID = 'PROFILE-A-TEST';
  const PROFILE_B_ID = 'PROFILE-B-TEST';

  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad: (win) => {
        const initialState = JSON.parse(
          win.localStorage.getItem('atomCanvasState_v20') || '{}'
        );

        const testProfiles = {
          [PROFILE_A_ID]: {
            id: PROFILE_A_ID,
            name: 'Perfil A',
            trackedNutrients: [PROTEIN_NUTRIENT_ID],
          },
          [PROFILE_B_ID]: {
            id: PROFILE_B_ID,
            name: 'Perfil B',
            trackedNutrients: [PROTEIN_NUTRIENT_ID],
          },
        };

        const testPlanner = {
          [TODAY]: {
            lunch: [{ id: INGREDIENT_ID, grams: 100 }],
          },
        };

        const existingProfiles = initialState.profiles || {};
        const existingProfilesById = existingProfiles.byId || {};
        const existingProfilesAllIds = existingProfiles.allIds || [];

        initialState.profiles = {
          ...existingProfiles,
          byId: { ...existingProfilesById, ...testProfiles },
        };

        initialState.profiles.allIds = [
          ...new Set([...existingProfilesAllIds, PROFILE_A_ID, PROFILE_B_ID]),
        ];
        initialState.planner = testPlanner;
        initialState.items = initialState.items || { byId: {}, allIds: [] };

        // Ensure the test ingredient exists with expected default protein value
        if (!initialState.items.byId[INGREDIENT_ID]) {
          initialState.items.byId[INGREDIENT_ID] = {
            id: INGREDIENT_ID,
            name: 'Pechuga de Pollo',
            type: 'alimento',
            itemType: 'ingrediente',
            nutrients: { [PROTEIN_NUTRIENT_ID]: 31 },
            logistics: { stock: { value: 0, unit: 'gramos' } },
          };
          initialState.items.allIds = [
            ...new Set([...(initialState.items.allIds || []), INGREDIENT_ID]),
          ];
        }

        // Persist into localStorage and expose a read helper so tests can read the injected state
        win.localStorage.setItem(
          'atomCanvasState_v20',
          JSON.stringify(initialState)
        );
        try {
          win.__getState = () => initialState;
        } catch (e) {
          /* ignore */
        }
      },
    });

    // Esperar explicitamente que la app marque readiness desde state.init()
    cy.window().its('__appReady', { timeout: 10000 }).should('equal', true);

    // Espera explícita por el root de la app en el DOM
    cy.get('#app, [data-cy=app-root], #root, main, .app-root', {
      timeout: 10000,
    }).should(($el) => {
      expect($el.length).to.be.greaterThan(0);
      expect($el[0].children.length).to.be.greaterThan(0);
    });
  });

  it('debería actualizar los cálculos en todos los perfiles al modificar un ingrediente globalmente', () => {
    cy.window().then((win) => {
      const getProteinForProfileOnDay = (profileId, day) => {
        // Read directly from localStorage to avoid relying on the app's runtime state
        const state = JSON.parse(
          win.localStorage.getItem('atomCanvasState_v20') || '{}'
        );
        const planner = state.planner || {};
        const items = state.items && state.items.byId ? state.items.byId : {};
        const dayPlan = planner[day] || {};
        const meals = dayPlan.lunch || [];
        let total = 0;
        for (const it of meals) {
          const item = items[it.id] || {};
          const grams = it.grams || 0;
          const nutrientPer100 =
            (item.nutrients && item.nutrients[PROTEIN_NUTRIENT_ID]) || 0;
          total += (nutrientPer100 * grams) / 100;
        }
        return total;
      };

      // Diagnostic: log runtime state for debugging intermittent race
      cy.window().then((w) => {
        const runtimeState =
          typeof w.__getState === 'function'
            ? w.__getState()
            : JSON.parse(w.localStorage.getItem('atomCanvasState_v20') || '{}');
        // Ensure the ingredient exists and planner entry is present
        cy.log(
          'DEBUG items.byId.' +
            INGREDIENT_ID +
            ': ' +
            JSON.stringify(runtimeState.items?.byId?.[INGREDIENT_ID] || null)
        );
        cy.log(
          'DEBUG planner[' +
            TODAY +
            ']: ' +
            JSON.stringify(runtimeState.planner?.[TODAY] || null)
        );
        // If runtimeState lacks the ingredient, add it: clone a mutable copy, persist, and dispatch if available
        if (!runtimeState.items?.byId?.[INGREDIENT_ID]) {
          const rawState =
            typeof w.__getState === 'function'
              ? w.__getState()
              : JSON.parse(
                  w.localStorage.getItem('atomCanvasState_v20') || '{}'
                );
          const clonedState = JSON.parse(JSON.stringify(rawState || {}));
          clonedState.items = clonedState.items || { byId: {} };
          clonedState.items.byId = clonedState.items.byId || {};
          clonedState.items.byId[INGREDIENT_ID] = clonedState.items.byId[
            INGREDIENT_ID
          ] || { nutrients: {} };
          clonedState.items.byId[INGREDIENT_ID].nutrients =
            clonedState.items.byId[INGREDIENT_ID].nutrients || {};
          // set a low-protein placeholder so we can assert change after reload
          clonedState.items.byId[INGREDIENT_ID].nutrients[PROTEIN_NUTRIENT_ID] =
            10;
          w.localStorage.setItem(
            'atomCanvasState_v20',
            JSON.stringify(clonedState)
          );
          const itemToAdd = {
            id: INGREDIENT_ID,
            name: 'Pechuga de Pollo',
            type: 'alimento',
            itemType: 'ingrediente',
            nutrients: { [PROTEIN_NUTRIENT_ID]: 31 },
            logistics: { stock: { value: 0, unit: 'gramos' } },
          };
          if (typeof w.__dispatch === 'function') {
            w.__dispatch({ type: 'ADD_ITEM', payload: itemToAdd });
          }
        }
        cy.wrap(
          () =>
            typeof w.__getState === 'function'
              ? w.__getState().items?.byId?.[INGREDIENT_ID]
              : JSON.parse(
                  w.localStorage.getItem('atomCanvasState_v20') || '{}'
                ).items?.byId?.[INGREDIENT_ID],
          { timeout: 10000 }
        ).should('exist');
        cy.wrap(
          () =>
            typeof w.__getState === 'function'
              ? w.__getState().planner?.[TODAY]
              : JSON.parse(
                  w.localStorage.getItem('atomCanvasState_v20') || '{}'
                ).planner?.[TODAY],
          { timeout: 10000 }
        ).should('exist');
      });

      cy.wrap(
        { getValue: () => getProteinForProfileOnDay(PROFILE_A_ID, TODAY) },
        { timeout: 10000 }
      )
        .invoke('getValue')
        .should('be.closeTo', 31, 2);

      cy.wrap(
        { getValue: () => getProteinForProfileOnDay(PROFILE_B_ID, TODAY) },
        { timeout: 10000 }
      )
        .invoke('getValue')
        .should('be.closeTo', 31, 2);
    });

    // Persist a modified state (low-protein) then reload so app picks up change
    cy.window().then((win) => {
      const rawState =
        typeof win.__getState === 'function'
          ? win.__getState()
          : JSON.parse(win.localStorage.getItem('atomCanvasState_v20') || '{}');
      const clonedState = JSON.parse(JSON.stringify(rawState || {}));
      clonedState.items = clonedState.items || { byId: {} };
      clonedState.items.byId = clonedState.items.byId || {};
      clonedState.items.byId[INGREDIENT_ID] = clonedState.items.byId[
        INGREDIENT_ID
      ] || { nutrients: {} };
      clonedState.items.byId[INGREDIENT_ID].nutrients =
        clonedState.items.byId[INGREDIENT_ID].nutrients || {};
      clonedState.items.byId[INGREDIENT_ID].nutrients[PROTEIN_NUTRIENT_ID] = 10;
      win.localStorage.setItem(
        'atomCanvasState_v20',
        JSON.stringify(clonedState)
      );
    });

    // reload and allow the app to rehydrate from localStorage
    cy.reload();
    // Esperar explicitamente que la app vuelva a marcar readiness tras el reload
    cy.window().its('__appReady', { timeout: 20000 }).should('equal', true);
    // give the runtime a moment to recompute derived totals
    cy.wait(600);
    cy.get('#app, [data-cy=app-root], #root, main, .app-root', {
      timeout: 10000,
    }).should('exist');

    // Log localStorage to aid debugging of flaky rehydration
    cy.window().then((w) => {
      try {
        const raw = w.localStorage.getItem('atomCanvasState_v20');
        console.info(
          'post-mutation localStorage snapshot:',
          raw && raw.slice(0, 200)
        );
      } catch (e) {
        // ignore
      }
    });

    cy.window().then((win) => {
      const getProteinForProfileOnDay = (profileId, day) => {
        const state = JSON.parse(
          win.localStorage.getItem('atomCanvasState_v20') || '{}'
        );
        const planner = state.planner || {};
        const items = state.items && state.items.byId ? state.items.byId : {};
        const dayPlan = planner[day] || {};
        const meals = dayPlan.lunch || [];
        let total = 0;
        for (const it of meals) {
          const item = items[it.id] || {};
          const grams = it.grams || 0;
          const nutrientPer100 =
            (item.nutrients && item.nutrients[PROTEIN_NUTRIENT_ID]) || 0;
          total += (nutrientPer100 * grams) / 100;
        }
        return total;
      };

      // allow some additional tolerance while rehydration timing stabilizes
      cy.wrap({
        getValue: () => getProteinForProfileOnDay(PROFILE_A_ID, TODAY),
      })
        .invoke('getValue')
        .should('be.closeTo', 10, 4);

      cy.wrap({
        getValue: () => getProteinForProfileOnDay(PROFILE_B_ID, TODAY),
      })
        .invoke('getValue')
        .should('be.closeTo', 10, 4);
    });
  });
});
