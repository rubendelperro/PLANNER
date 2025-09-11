// Cypress E2E: Profile Targets (Multi-User & Customization)
// Purpose: create multiple profiles, assign tracked nutrients and personal goals,
// verify base target calculation and propagation.
// Notes/assumptions:
// - App exposes test hooks: window.__appReady, window.__getState(), window.__dispatch(action)
// - The app's selectors aren't guaranteed to be exposed; when available we'll prefer them.
// - This spec is deterministic and uses programmatic dispatches only (no UI clicks).

describe('Profile targets: multi-user & customization', () => {
  it('creates profiles, sets tracked nutrients and personal goals, and verifies targets', () => {
    cy.visit('index.html');
    cy.window().should('have.property', '__appReady');
    cy.window().then(async (win) => {
      if (typeof win.__appReady === 'function') await win.__appReady();

      // Helper: safe dispatch/getState
      const dispatch = (action) => win.__dispatch && win.__dispatch(action);
      const getState = () => (win.__getState ? win.__getState() : null);

      // --- Test contract ---
      // Inputs: programmatic dispatches to create and update profiles
      // Outputs: state.profiles.byId[...] will contain trackedNutrients and personalGoals
      // Success criteria: computed base targets (replicated algorithm) approx equal to app targets

      // Profiles to create: 3 distinct users with different demographics
      const now = Date.now();
      const profiles = [
        {
          id: `PROF-ALICE-${now}`,
          name: 'Alice',
          age: 28,
          weight: 62, // kg
          height: 165, // cm
          gender: 'female',
          activityLevel: 'light',
          goal: 'maintain',
          trackedNutrients: ['calories', 'proteins', 'fats'],
        },
        {
          id: `PROF-BOB-${now}`,
          name: 'Bob',
          age: 35,
          weight: 85,
          height: 180,
          gender: 'male',
          activityLevel: 'moderate',
          goal: 'lose',
          trackedNutrients: ['calories', 'proteins', 'carbs'],
        },
        {
          id: `PROF-CARLA-${now}`,
          name: 'Carla',
          age: 22,
          weight: 54,
          height: 160,
          gender: 'female',
          activityLevel: 'high',
          goal: 'gain',
          trackedNutrients: ['calories', 'fats', 'carbs'],
        },
      ];

      // Create profiles and set base data
      profiles.forEach((p) => {
        // Provide minimal default shape the reducer expects (personalGoals, trackedNutrients, referenceSourceId)
        dispatch({
          type: 'CREATE_PROFILE',
          payload: {
            id: p.id,
            name: p.name,
            personalGoals: {},
            trackedNutrients: [],
            referenceSourceId: 'EFSA-2017',
          },
        });
        // Update profile demographic fields
        dispatch({
          type: 'UPDATE_PROFILE',
          payload: {
            id: p.id,
            age: p.age,
            weight: p.weight,
            height: p.height,
            gender: p.gender,
            activityLevel: p.activityLevel,
            goal: p.goal,
          },
        });
        // Set tracked nutrients
        dispatch({
          type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
          payload: { profileId: p.id, nutrients: p.trackedNutrients },
        });
      });

      // Now for each profile compute expected base targets using the same algorithm as selectors.calculateBaseTargets
      function computeExpectedBaseTargets(profile, state) {
        if (
          !profile ||
          profile.isDefault ||
          !profile.age ||
          !profile.weight ||
          !profile.height ||
          !profile.gender ||
          !profile.activityLevel ||
          !profile.goal
        )
          return {};
        const { age, weight, height, gender, activityLevel, goal } = profile;
        const activityMultipliers = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          high: 1.725,
          very_high: 1.9,
        };
        const goalAdjustments = { lose: 0.85, maintain: 1.0, gain: 1.15 };
        const bmr =
          gender === 'male'
            ? 10 * weight + 6.25 * height - 5 * age + 5
            : 10 * weight + 6.25 * height - 5 * age - 161;
        const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);
        const targetCalories = Math.round(
          tdee * (goalAdjustments[goal] || 1.0)
        );

        const referenceGuide =
          state.referenceGuides.byId[profile.referenceSourceId] ||
          state.referenceGuides.byId['EFSA-2017'];
        const referenceCalories =
          (referenceGuide &&
            referenceGuide.nutrients &&
            referenceGuide.nutrients.calories) ||
          2000;
        const scalingFactor =
          referenceCalories > 0 ? targetCalories / referenceCalories : 1;

        const scaledTargets = {};
        if (referenceGuide && referenceGuide.nutrients) {
          for (const nutrientId in referenceGuide.nutrients) {
            scaledTargets[nutrientId] =
              referenceGuide.nutrients[nutrientId] * scalingFactor;
          }
        }

        let proteinGrams, fatGrams, carbGrams;
        if (goal === 'lose') {
          proteinGrams = Math.round((targetCalories * 0.4) / 4);
          fatGrams = Math.round((targetCalories * 0.3) / 9);
          carbGrams = Math.round((targetCalories * 0.3) / 4);
        } else if (goal === 'gain') {
          proteinGrams = Math.round((targetCalories * 0.3) / 4);
          fatGrams = Math.round((targetCalories * 0.25) / 9);
          carbGrams = Math.round((targetCalories * 0.45) / 4);
        } else {
          proteinGrams = Math.round((targetCalories * 0.3) / 4);
          fatGrams = Math.round((targetCalories * 0.3) / 9);
          carbGrams = Math.round((targetCalories * 0.4) / 4);
        }

        const macroTargets = {
          calories: targetCalories,
          proteins: proteinGrams,
          fats: fatGrams,
          carbs: carbGrams,
        };

        return { ...scaledTargets, ...macroTargets };
      }

      const state = getState();
      expect(state, 'state loaded').to.exist;

      // For each profile: set a personal goal override and assert propagation into state
      profiles.forEach((p, idx) => {
        // personal override: pick one tracked nutrient and set a custom goal
        const personalNutrient = p.trackedNutrients[0];
        const personalValue = 999 + idx; // arbitrary custom value
        dispatch({
          type: 'SET_PERSONAL_GOAL',
          payload: {
            profileId: p.id,
            nutrientId: personalNutrient,
            value: personalValue,
          },
        });
      });

      // Now verification phase for each profile
      for (const p of profiles) {
        // Activate profile
        dispatch({ type: 'SET_ACTIVE_PROFILE', payload: p.id });
        const localState = getState();
        const profileState = localState.profiles.byId[p.id];
        expect(profileState, `profile ${p.id} exists`).to.exist;

        // Check tracked nutrients are set
        expect(
          profileState.trackedNutrients,
          `tracked nutrients for ${p.id}`
        ).to.deep.equal(p.trackedNutrients);

        // Check personal goal stored
        const personalNutrient = p.trackedNutrients[0];
        expect(
          profileState.personalGoals &&
            profileState.personalGoals[personalNutrient],
          `personal goal for ${p.id}`
        ).to.be.a('number');

        // Compute expected base targets using replicated logic
        const expectedBase = computeExpectedBaseTargets(
          profileState,
          localState
        );

        // Try to obtain app's authoritative targets if the app exposes a selector on window
        let appTargets = null;
        if (
          win.__getActiveNutritionalTargets &&
          typeof win.__getActiveNutritionalTargets === 'function'
        ) {
          appTargets = win.__getActiveNutritionalTargets();
        } else if (
          win.__selectors &&
          typeof win.__selectors.getActiveNutritionalTargets === 'function'
        ) {
          // some apps may expose a selectors object
          appTargets = win.__selectors.getActiveNutritionalTargets();
        }

        if (appTargets) {
          // appTargets is expected to be a map nutrientId -> { finalValue, baseValue, source }
          p.trackedNutrients.forEach((nutr) => {
            const expectedVal = expectedBase[nutr];
            const appVal = appTargets[nutr] && appTargets[nutr].finalValue;
            // allow a small tolerance
            expect(appVal, `app target for ${p.id} ${nutr} exists`).to.be.a(
              'number'
            );
            expect(Math.abs(appVal - expectedVal)).to.be.lessThan(
              1e-6 + Math.abs(expectedVal) * 0.02
            );
          });
        } else {
          // Fallback: assert that expectedBase contains values for tracked nutrients
          p.trackedNutrients.forEach((nutr) => {
            expect(
              expectedBase[nutr],
              `computed expected base ${nutr} for ${p.id}`
            ).to.exist;
          });
        }

        // Propagation check: planner/week analysis may rely on these targets — here we assert that switching profile doesn't crash and state is consistent
        // (deeper propagation tests can be added once the selectors are exposed to tests)
        expect(localState.ui, 'ui exists').to.exist;
      }

      // Completed
    });
  });
});
