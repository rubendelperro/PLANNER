import { Logger } from '../utils.js';

// Reducer to handle the 'profiles' slice. Receives the immer draftState and the action.
// Returns true if the action was handled here, false otherwise.
export function profilesReducer(draftState, action) {
  switch (action.type) {
    case 'SAVE_PROFILE': {
      const { name, ...profileData } = action.payload;
      const profile = draftState.profiles.byId[draftState.ui.activeProfileId];
      if (profile && profile.isDefault) {
        return true; // handled
      }
      if (!name || name.trim() === '') {
        if (!draftState.ui) draftState.ui = {};
        draftState.ui.profileError = 'El nombre no puede estar vacío';
        return true;
      }
      // Clear any existing error
      if (!draftState.ui) draftState.ui = {};
      draftState.ui.profileError = null;

      const id =
        profileData.id ||
        (profileData.id === undefined ? undefined : profileData.id);
      if (id) {
        draftState.profiles.byId[id] = {
          ...draftState.profiles.byId[id],
          name: name.trim(),
          ...profileData,
        };
        if (!draftState.profiles.allIds.includes(id)) {
          draftState.profiles.allIds.push(id);
        }
        draftState.ui.activeProfileId = id;
      }
      return true;
    }

    case 'CREATE_PROFILE': {
      const newProfile = action.payload;
      draftState.profiles.byId[newProfile.id] = newProfile;
      draftState.profiles.allIds.push(newProfile.id);
      draftState.ui.activeProfileId = newProfile.id;
      return true;
    }

    case 'DELETE_PROFILE': {
      const profileIdToDelete = action.payload;
      if (draftState.profiles.byId[profileIdToDelete]?.isDefault) {
        Logger.warn(
          'Attempted to delete the default profile. Operation aborted.'
        );
        return true;
      }
      delete draftState.profiles.byId[profileIdToDelete];
      draftState.profiles.allIds = draftState.profiles.allIds.filter(
        (id) => id !== profileIdToDelete
      );
      draftState.ui.activeProfileId = 'DEFAULT-PROFILE';
      return true;
    }

    case 'UPDATE_PROFILE': {
      const { id, ...dataToUpdate } = action.payload;
      const profile = draftState.profiles.byId[id];
      if (!profile || profile.isDefault) return true;

      if (dataToUpdate.age !== undefined)
        dataToUpdate.age = Math.max(0, parseFloat(dataToUpdate.age) || 0);
      if (dataToUpdate.weight !== undefined)
        dataToUpdate.weight = Math.max(0, parseFloat(dataToUpdate.weight) || 0);
      if (dataToUpdate.height !== undefined)
        dataToUpdate.height = Math.max(0, parseFloat(dataToUpdate.height) || 0);

      Object.assign(profile, dataToUpdate);
      return true;
    }

    case 'UPDATE_PROFILE_TRACKED_NUTRIENTS': {
      const { profileId, nutrients } = action.payload;
      const profile = draftState.profiles.byId[profileId];
      if (profile) {
        profile.trackedNutrients = nutrients;
      }
      return true;
    }

    case 'SET_PERSONAL_GOAL': {
      let { profileId, nutrientId, value } = action.payload;
      const profile = draftState.profiles.byId[profileId];
      if (!profile || profile.isDefault) return true;

      if (value !== null && value !== '') {
        value = Math.max(0, parseFloat(value) || 0);
      }

      if (value === null || value === '') {
        delete profile.personalGoals[nutrientId];
      } else {
        profile.personalGoals[nutrientId] = value;
      }
      return true;
    }

    case 'SET_ACTIVE_PROFILE': {
      draftState.ui.activeProfileId = action.payload;
      return true;
    }

    default:
      return false;
  }
}
