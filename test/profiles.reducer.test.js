import { describe, it, expect } from 'vitest';
import { profilesReducer } from '../state_slices/profiles.reducer.js';

describe('profilesReducer', () => {
  it('handles CREATE_PROFILE by adding a new profile and setting activeProfileId', () => {
    const draftState = {
      profiles: { byId: {}, allIds: [] },
      ui: { activeProfileId: null },
    };

    const newProfile = { id: 'P1', name: 'Test', isDefault: false };
    const action = { type: 'CREATE_PROFILE', payload: newProfile };

    const handled = profilesReducer(draftState, action);
    expect(handled).toBe(true);
    expect(draftState.profiles.byId.P1).toEqual(newProfile);
    expect(draftState.profiles.allIds).toContain('P1');
    expect(draftState.ui.activeProfileId).toBe('P1');
  });

  it('handles DELETE_PROFILE and prevents deleting default profile', () => {
    const draftState = {
      profiles: {
        byId: {
          'DEFAULT-PROFILE': { id: 'DEFAULT-PROFILE', isDefault: true },
          P2: { id: 'P2' },
        },
        allIds: ['DEFAULT-PROFILE', 'P2'],
      },
      ui: { activeProfileId: 'P2' },
    };

    // Attempt to delete default profile should be ignored (handled true)
    const deleteDefault = {
      type: 'DELETE_PROFILE',
      payload: 'DEFAULT-PROFILE',
    };
    const handledDefault = profilesReducer(draftState, deleteDefault);
    expect(handledDefault).toBe(true);
    expect(draftState.profiles.byId['DEFAULT-PROFILE']).toBeDefined();

    // Delete non-default profile
    const deleteP2 = { type: 'DELETE_PROFILE', payload: 'P2' };
    const handledP2 = profilesReducer(draftState, deleteP2);
    expect(handledP2).toBe(true);
    expect(draftState.profiles.byId.P2).toBeUndefined();
    expect(draftState.profiles.allIds).not.toContain('P2');
    expect(draftState.ui.activeProfileId).toBe('DEFAULT-PROFILE');
  });

  it('ignores UPDATE_PROFILE when target is default profile', () => {
    const draftState = {
      profiles: {
        byId: {
          'DEFAULT-PROFILE': {
            id: 'DEFAULT-PROFILE',
            isDefault: true,
            name: 'Est',
          },
        },
        allIds: ['DEFAULT-PROFILE'],
      },
      ui: { activeProfileId: 'DEFAULT-PROFILE' },
    };

    const action = {
      type: 'UPDATE_PROFILE',
      payload: { id: 'DEFAULT-PROFILE', name: 'Changed' },
    };
    const handled = profilesReducer(draftState, action);
    expect(handled).toBe(true);
    // name should remain unchanged
    expect(draftState.profiles.byId['DEFAULT-PROFILE'].name).toBe('Est');
  });

  it('sets active profile id on SET_ACTIVE_PROFILE', () => {
    const draftState = {
      profiles: { byId: {}, allIds: [] },
      ui: { activeProfileId: 'X' },
    };
    const action = { type: 'SET_ACTIVE_PROFILE', payload: 'NEW' };
    const handled = profilesReducer(draftState, action);
    expect(handled).toBe(true);
    expect(draftState.ui.activeProfileId).toBe('NEW');
  });
});
