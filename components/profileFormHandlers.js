// Lightweight handlers for profile form interactions. Keep pure DOM interactions
// and dispatch usage centralized for easier testing.
export function handleProfileConfirmClick(container, dispatch, getState) {
  return function () {
    const selector = container.querySelector('#profile-selector');
    if (selector) {
      dispatch({
        type: 'SET_ACTIVE_PROFILE',
        payload: selector.value,
      });
    }
  };
}

export function handleNewProfileClick(actions) {
  return function () {
    actions.createProfile();
  };
}

export function handleDeleteProfileClick(dispatch, getState) {
  return function () {
    const state = getState();
    dispatch({
      type: 'DELETE_PROFILE',
      payload: state.ui.activeProfileId,
    });
  };
}

export function createDebouncedProfileUpdater(debounceFn, dispatch, getState) {
  return debounceFn(function (form) {
    const state = getState();
    const formData = new FormData(form);
    const updatedData = { id: state.ui.activeProfileId };
    for (let [key, value] of formData.entries()) {
      updatedData[key] =
        isNaN(parseFloat(value)) || value === '' ? value : parseFloat(value);
    }
    dispatch({ type: 'UPDATE_PROFILE', payload: updatedData });
  }, 500);
}
