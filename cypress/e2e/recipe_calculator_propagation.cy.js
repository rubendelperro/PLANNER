// Cypress E2E: Recipe Calculator & Propagation
// Purpose: verify recipe computed totals and propagation across planner and profiles.
// Assumptions (adjust if your app uses different action names/payloads):
// - CREATE_PROFILE -> payload: { id, name }
// - ADD_RECIPE -> payload: recipe object with `id`, `name`, `ingredients: [{ id, grams }]`
// - ASSIGN_ITEM_TO_SLOT -> payload: { date, slot, id, grams }
// - SET_ACTIVE_PROFILE -> payload: profileId
// - state items are at state.items.byId and planner entries can be found under state.planner (search heuristically)

describe('Recipe calculator propagation', () => {
  it('computes recipe totals and propagates them across planner and profiles', () => {
    cy.visit('index.html');
    cy.window().should('have.property', '__appReady');
    cy.window().then(async (win) => {
      if (typeof win.__appReady === 'function') await win.__appReady();

      const now = new Date();
      const today = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
      const uid = Date.now();

      // 1) Setup Phase: create two profiles UserA and UserB
      const userA = { id: `PRO-A-${uid}`, name: `UserA-${uid}` };
      const userB = { id: `PRO-B-${uid}`, name: `UserB-${uid}` };
      win.__dispatch({ type: 'CREATE_PROFILE', payload: userA });
      win.__dispatch({ type: 'CREATE_PROFILE', payload: userB });

      // 1) Setup Phase: create recipe with known ingredients
      // Ingredients: assume items 'CHICKEN-BREAST' and 'ESPINACAS-FRESCAS' exist in seeded state
      const ing1Id = 'CHICKEN-BREAST';
      const ing2Id = 'ESPINACAS-FRESCAS';
      const ing1Grams = 100;
      const ing2Grams = 50;
      const recipeId = `RECIPE-CALC-${uid}`;

      const recipe = {
        id: recipeId,
        name: `CalcRecipe-${uid}`,
        ingredients: [
          { id: ing1Id, grams: ing1Grams },
          { id: ing2Id, grams: ing2Grams },
        ],
      };

      win.__dispatch({ type: 'ADD_RECIPE', payload: recipe });

      const stateAfterRecipe = win.__getState();

      // Helper: get item nutritions from state; expect item.computed.totals (per 100g) to exist
      function getItemTotals(item) {
        if (!item) return null;
        if (item.computed && item.computed.totals) return item.computed.totals;
        return null;
      }

      const items = stateAfterRecipe.items && stateAfterRecipe.items.byId;
      expect(items, 'items in state').to.exist;

      const item1 = items[ing1Id];
      const item2 = items[ing2Id];
      expect(item1, `ingredient ${ing1Id} exists`).to.exist;
      expect(item2, `ingredient ${ing2Id} exists`).to.exist;

      const totals1 = getItemTotals(item1);
      const totals2 = getItemTotals(item2);
      expect(totals1, `computed totals for ${ing1Id}`).to.exist;
      expect(totals2, `computed totals for ${ing2Id}`).to.exist;

      // Compute expected recipe totals by summing ingredient totals scaled by grams/100
      const expectedRecipeTotals = {};
      [
        { totals: totals1, grams: ing1Grams },
        { totals: totals2, grams: ing2Grams },
      ].forEach(({ totals, grams }) => {
        Object.keys(totals).forEach((k) => {
          const v = Number(totals[k]);
          if (!Number.isFinite(v)) return;
          expectedRecipeTotals[k] =
            (expectedRecipeTotals[k] || 0) + (v * grams) / 100;
        });
      });

      // 2) Initial Verification: verify recipe computed.totals roughly match expected
      const storedRecipe = win.__getState().items.byId[recipeId];
      expect(storedRecipe, 'stored recipe exists').to.exist;
      const storedTotals =
        storedRecipe && storedRecipe.computed && storedRecipe.computed.totals;
      expect(storedTotals, 'stored recipe computed.totals').to.exist;

      // compare keys and numeric closeness
      Object.keys(expectedRecipeTotals).forEach((k) => {
        const exp = expectedRecipeTotals[k];
        const got = Number((storedTotals && storedTotals[k]) || 0);
        expect(Number.isFinite(got), `recipe stored total ${k} is finite`).to.be
          .true;
        // allow small rounding delta
        expect(
          Math.abs(got - exp),
          `recipe total ${k} close to expected`
        ).to.be.lessThan(1e-6 + Math.abs(exp) * 0.01);
      });

      // 3) Planner & Propagation Phase (UserA)
      // Set active profile to UserA
      win.__dispatch({ type: 'SET_ACTIVE_PROFILE', payload: userA.id });

      // Add recipe to today's lunch slot with grams equal to sum of ingredient grams
      const recipeTotalGrams = ing1Grams + ing2Grams;
      win.__dispatch({
        type: 'ASSIGN_ITEM_TO_SLOT',
        payload: {
          date: today,
          slot: 'lunch',
          id: recipeId,
          grams: recipeTotalGrams,
        },
      });

      const stateAfterPlan = win.__getState();

      // Helper: find planned entries for a date by searching planner structure
      function findPlannedEntriesForDate(plannerState, date) {
        if (!plannerState) return [];
        // common shapes: planner[date], planner.byDate[date], planner.days[date]
        if (plannerState[date] && plannerState[date].slots) {
          const day = plannerState[date];
          return Object.values(day.slots).flat();
        }
        if (plannerState.byDate && plannerState.byDate[date]) {
          const day = plannerState.byDate[date];
          if (day.slots) return Object.values(day.slots).flat();
        }
        if (plannerState.days && plannerState.days[date]) {
          const day = plannerState.days[date];
          if (day.slots) return Object.values(day.slots).flat();
        }
        // fallback: search any day-like objects
        const results = [];
        Object.keys(plannerState).forEach((k) => {
          const v = plannerState[k];
          if (v && v.date === date && v.slots) {
            Object.values(v.slots).forEach((arr) => results.push(...arr));
          }
        });
        return results;
      }

      const plannerState = stateAfterPlan.planner;
      const entriesToday = findPlannedEntriesForDate(plannerState, today);
      // assert that our recipe was added
      const found = entriesToday.find((e) => e && e.id === recipeId);
      expect(found, 'recipe added to planner for today').to.exist;

      // Compute totals from planner entries directly (sum item totals scaled by grams/100)
      function computeTotalsFromEntries(entries, itemsMap) {
        const totals = {};
        entries.forEach((entry) => {
          const it = itemsMap[entry.id];
          const itTotals = (it && it.computed && it.computed.totals) || {};
          const grams = entry.grams || 0;
          Object.keys(itTotals).forEach((k) => {
            const v = Number(itTotals[k]);
            if (!Number.isFinite(v)) return;
            totals[k] = (totals[k] || 0) + (v * grams) / 100;
          });
        });
        return totals;
      }

      const plannerTotalsToday = computeTotalsFromEntries(
        entriesToday,
        stateAfterPlan.items.byId
      );

      // We expect plannerTotalsToday to equal expectedRecipeTotals scaled by recipeTotalGrams/recipeTotalGrams (i.e., same)
      Object.keys(expectedRecipeTotals).forEach((k) => {
        const exp = expectedRecipeTotals[k];
        const got = plannerTotalsToday[k] || 0;
        expect(
          Math.abs(got - exp),
          `planner total ${k} equals recipe contribution`
        ).to.be.lessThan(1e-6 + Math.abs(exp) * 0.01);
      });

      // 4) Profile switching and isolation
      // Switch to UserB and assert totals are zero / empty
      win.__dispatch({ type: 'SET_ACTIVE_PROFILE', payload: userB.id });
      const stateAfterSwitchB = win.__getState();
      const entriesB = findPlannedEntriesForDate(
        stateAfterSwitchB.planner,
        today
      );
      // Expect no entries for UserB
      const hasEntryB =
        entriesB && entriesB.some((e) => e && e.id === recipeId);
      expect(hasEntryB, 'UserB should not see UserA planned recipe').to.be
        .false;

      // Switch back to Default/Standard profile (if exists), else switch to first existing profile
      const defaultProfileId =
        stateAfterSwitchB.ui && stateAfterSwitchB.ui.defaultProfileId;
      const standardId =
        defaultProfileId ||
        (stateAfterSwitchB.profiles &&
          stateAfterSwitchB.profiles.allIds &&
          stateAfterSwitchB.profiles.allIds[0]);
      if (standardId) {
        win.__dispatch({ type: 'SET_ACTIVE_PROFILE', payload: standardId });
        const stateAfterStd = win.__getState();
        // just read totals (no strict assertion because default profile may have seeded data)
        expect(stateAfterStd, 'state after switching to default').to.exist;
      }

      // Switch back to UserA and assert the entry returns
      win.__dispatch({ type: 'SET_ACTIVE_PROFILE', payload: userA.id });
      const stateBackToA = win.__getState();
      const entriesA2 = findPlannedEntriesForDate(stateBackToA.planner, today);
      const foundAgain = entriesA2.find((e) => e && e.id === recipeId);
      expect(foundAgain, 'recipe returns for UserA after switching back').to
        .exist;

      // 5) Finalization: done — test completed
    });
  });
});

// Notes: This spec makes reasonable assumptions about action names and planner shape.
// If your app uses different action types or planner schema, update dispatch/action names and search helpers accordingly.
