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
    cy.appReady();
  });

  it('should create, read, update and delete a profile (happy path)', () => {
    // Load fixture data for profile templates and build runtime values
    cy.fixture('profiles/e2e_user.json').then((f) => {
      const ts = Date.now();
      const profileId = `${f.idPrefix}-${ts}`;

      const initial = {
        id: profileId,
        name: `${f.initial.name} ${ts}`,
        email: f.initial.emailTemplate.replace('{{ts}}', ts),
        phone: f.initial.phone,
      };

      const updated = {
        ...initial,
        name: `${f.initial.name} ${f.updated.nameSuffix} ${ts}`,
        email: f.updated.emailTemplate.replace('{{ts}}', ts),
      };

      // CREATE
      cy.createProfile(initial).then((saved) => {
        expect(saved, 'profile created').to.exist;
        expect(saved.name).to.equal(initial.name);
        expect(saved.email).to.equal(initial.email);
      });

      // READ (list)
      cy.getState().then((state) => {
        const list = state.profiles && state.profiles.allIds;
        expect(list, 'profiles list exists').to.be.an('array');
        expect(list).to.include(profileId);
      });

      // UPDATE
      cy.updateProfile(updated).then((saved) => {
        expect(saved, 'profile updated').to.exist;
        expect(saved.name).to.equal(updated.name);
        expect(saved.email).to.equal(updated.email);
      });

      // DELETE
      cy.deleteProfile(profileId).then((deleted) => {
        expect(deleted, 'profile deleted').to.be.true;
      });

      // final check: profile absent (assert directly against state to avoid cached getter issues)
      cy.getState().then((state) => {
        const saved =
          state &&
          state.profiles &&
          state.profiles.byId &&
          state.profiles.byId[profileId];
        expect(saved, 'profile removed from state').to.not.exist;
        const list = state.profiles && state.profiles.allIds;
        if (Array.isArray(list)) expect(list).to.not.include(profileId);
      });
    });
  });
});
