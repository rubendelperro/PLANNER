import { describe, it, expect, vi } from 'vitest';
import {
  handleProfileConfirmClick,
  handleNewProfileClick,
  handleDeleteProfileClick,
  createDebouncedProfileUpdater,
} from '../components/profileFormHandlers.js';

describe('profileFormHandlers', () => {
  it('dispatches SET_ACTIVE_PROFILE when confirm clicked', () => {
    const container = document.createElement('div');
    const select = document.createElement('select');
    select.id = 'profile-selector';
    const opt = document.createElement('option');
    opt.value = 'PROF-1';
    opt.textContent = 'Profile 1';
    select.appendChild(opt);
    select.value = 'PROF-1';
    container.appendChild(select);

    const dispatch = vi.fn();
    const getState = vi.fn();

    const handler = handleProfileConfirmClick(container, dispatch, getState);
    handler();

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_PROFILE',
      payload: 'PROF-1',
    });
  });

  it('calls actions.createProfile when new profile clicked', () => {
    const actions = { createProfile: vi.fn() };
    const handler = handleNewProfileClick(actions);
    handler();
    expect(actions.createProfile).toHaveBeenCalled();
  });

  it('dispatches DELETE_PROFILE with active id when delete clicked', () => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({ ui: { activeProfileId: 'PROF-XYZ' } }));
    const handler = handleDeleteProfileClick(dispatch, getState);
    handler();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'DELETE_PROFILE',
      payload: 'PROF-XYZ',
    });
  });

  it('createDebouncedProfileUpdater calls dispatch with updated data', () => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({ ui: { activeProfileId: 'PROF-42' } }));

    // Dummy debounce that returns the original function for sync execution
    const passthroughDebounce = (fn) => fn;

    const updater = createDebouncedProfileUpdater(
      passthroughDebounce,
      dispatch,
      getState
    );

    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'someValue';
    input.value = '123';
    form.appendChild(input);

    // Use FormData polyfill via HTMLFormElement support in jsdom
    updater(form);

    expect(dispatch).toHaveBeenCalled();
    const call = dispatch.mock.calls[0][0];
    expect(call.type).toBe('UPDATE_PROFILE');
    expect(call.payload.id).toBe('PROF-42');
  });
});
