// Cypress E2E: Nutrient Manager
// Purpose: Full lifecycle test for a custom nutrient: add -> verify -> toggle on -> verify -> toggle off -> delete

describe('Nutrient Manager', () => {
  it('adds a custom nutrient, toggles it on/off for the active profile, and deletes it', () => {
    const nutrientBaseName = 'Fibra';
    const unit = 'g';
    const nutrientId = `NUT-${nutrientBaseName.toUpperCase()}-${Date.now()}`;

    cy.visit('index.html');
    cy.window().should('have.property', '__appReady');
    cy.window().then(async (win) => {
      if (typeof win.__appReady === 'function') await win.__appReady();

      const state0 = win.__getState ? win.__getState() : {};

      // 1) Add custom nutrient
      const newNutrient = { id: nutrientId, name: nutrientBaseName, unit };
      win.__dispatch({ type: 'ADD_CUSTOM_NUTRIENT', payload: newNutrient });

      const state1 = win.__getState();
      // 2) Verify it appears in manager list (items.byId and items.allIds)
      expect(state1.items.byId[nutrientId], 'nutrient in items.byId').to.exist;
      expect(
        state1.items.allIds.includes(nutrientId),
        'nutrient in items.allIds'
      ).to.be.true;

      // 3) Toggle it ON for the active profile
      const activeProfileId = state1.ui && state1.ui.activeProfileId;
      expect(activeProfileId, 'active profile exists').to.exist;

      const currentTracked =
        (state1.profiles.byId[activeProfileId] &&
          state1.profiles.byId[activeProfileId].trackedNutrients) ||
        [];
      const trackedWithNew = Array.from(
        new Set([...currentTracked, nutrientId])
      );
      win.__dispatch({
        type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
        payload: { profileId: activeProfileId, nutrients: trackedWithNew },
      });

      const state2 = win.__getState();
      const trackedAfterOn =
        (state2.profiles.byId[activeProfileId] &&
          state2.profiles.byId[activeProfileId].trackedNutrients) ||
        [];
      expect(
        trackedAfterOn.includes(nutrientId),
        'nutrient tracked after toggle on'
      ).to.be.true;

      // 4) Toggle it OFF for the active profile
      const trackedOff = trackedAfterOn.filter((id) => id !== nutrientId);
      win.__dispatch({
        type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
        payload: { profileId: activeProfileId, nutrients: trackedOff },
      });

      const state3 = win.__getState();
      const trackedAfterOff =
        (state3.profiles.byId[activeProfileId] &&
          state3.profiles.byId[activeProfileId].trackedNutrients) ||
        [];
      expect(
        trackedAfterOff.includes(nutrientId),
        'nutrient not tracked after toggle off'
      ).to.be.false;

      // 5) Delete the custom nutrient
      win.__dispatch({ type: 'DELETE_ITEM', payload: nutrientId });

      const state4 = win.__getState();
      expect(state4.items.byId[nutrientId], 'nutrient removed from items.byId')
        .to.not.exist;
      expect(
        state4.items.allIds.includes(nutrientId),
        'nutrient removed from items.allIds'
      ).to.be.false;
      // Also ensure no profile still tracks it
      for (const pid of state4.profiles.allIds) {
        const p = state4.profiles.byId[pid];
        if (p && p.trackedNutrients) {
          expect(
            p.trackedNutrients.includes(nutrientId),
            `profile ${pid} no longer tracks nutrient`
          ).to.be.false;
        }
      }
    });
  });
});

// Notes:
// - Uses test hooks exposed on window: __appReady, __getState(), __dispatch(action).
// - Actions used: 'ADD_CUSTOM_NUTRIENT', 'UPDATE_PROFILE_TRACKED_NUTRIENTS', 'DELETE_ITEM'.
// - If your app uses different action names or payload shapes, update the dispatch calls accordingly.
