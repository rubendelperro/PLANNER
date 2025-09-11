// Initial headless-focused E2E spec for Profile Management (CRUD)
// Uses application test hooks: window.__appReady, window.__dispatch, window.__getState

describe('Profile Management (CRUD)', () => {
  // Contract
  // - Inputs: profile payload { id, name, email, phone }
  // - Outputs: state reflects created/updated/deleted profile
  // - Error modes: missing profile after operations

  beforeEach(() => {
    // visit root and wait for the app to expose test hooks
    cy.visit('/');
    cy.window({ timeout: 10000 })
      .its('__appReady', { timeout: 10000 })
      .should('equal', true);
  });

  it('should create, read, update and delete a profile (happy path)', () => {
    const ts = Date.now();
    const profileId = `PROFILE-E2E-${ts}`;
    const initial = {
      id: profileId,
      name: `E2E User ${ts}`,
      email: `e2e+${ts}@example.test`,
      phone: '555-0100',
    };
    const updated = {
      ...initial,
      name: `E2E User Updated ${ts}`,
      email: `e2e.updated+${ts}@example.test`,
    };

    // CREATE
    cy.window().then((win) => {
      // dispatch an action to create profile programmatically
      // Reducer listens for 'CREATE_PROFILE'
      win.__dispatch({ type: 'CREATE_PROFILE', payload: initial });
    });

    // assert profile exists in state
    cy.window().then((win) => {
      const state = win.__getState();
      // defensive checks for expected shapes
      expect(state).to.have.property('profiles');
      const saved =
        state.profiles && state.profiles.byId && state.profiles.byId[profileId];
      expect(saved, 'profile created').to.exist;
      expect(saved.name).to.equal(initial.name);
      expect(saved.email).to.equal(initial.email);
    });

    // READ (list) - verify the profile appears when enumerating
    cy.window().then((win) => {
      const state = win.__getState();
      const list = state.profiles && state.profiles.allIds;
      expect(list, 'profiles list exists').to.be.an('array');
      expect(list).to.include(profileId);
    });

    // UPDATE
    cy.window().then((win) => {
      win.__dispatch({ type: 'UPDATE_PROFILE', payload: updated });
    });

    // assert updated in state
    cy.window().then((win) => {
      const state = win.__getState();
      const saved =
        state.profiles && state.profiles.byId && state.profiles.byId[profileId];
      expect(saved, 'profile updated').to.exist;
      expect(saved.name).to.equal(updated.name);
      expect(saved.email).to.equal(updated.email);
    });

    // DELETE
    cy.window().then((win) => {
      // Reducer expects the profile id (string) as payload for DELETE_PROFILE
      win.__dispatch({ type: 'DELETE_PROFILE', payload: profileId });
    });

    // final assertion: profile should no longer be present
    cy.window().then((win) => {
      const state = win.__getState();
      const saved =
        state.profiles && state.profiles.byId && state.profiles.byId[profileId];
      expect(saved, 'profile deleted').to.not.exist;
      const list = state.profiles && state.profiles.allIds;
      if (Array.isArray(list)) expect(list).to.not.include(profileId);
    });
  });
});
