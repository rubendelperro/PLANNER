// Reducer slice for UI state modifications. Receives the immer draftState and the action.
// Returns true if the action was handled here, false otherwise.
export function uiReducer(draftState, action) {
  switch (action.type) {
    case 'SET_NEXUS_VIEW': {
      draftState.ui.nexusView = action.payload;
      return true;
    }

    case 'ADD_NOTIFICATION': {
      const newNotification = {
        id: new Date().getTime(),
        message: action.payload.message,
        type: action.payload.type || 'info',
      };
      draftState.ui.notifications.push(newNotification);
      return true;
    }

    case 'REMOVE_NOTIFICATION': {
      draftState.ui.notifications = draftState.ui.notifications.filter(
        (n) => n.id !== action.payload
      );
      return true;
    }

    case 'SET_ACTIVE_VIEW': {
      draftState.ui.activeView = action.payload;
      return true;
    }

    case 'OPEN_ITEM_MODAL': {
      draftState.ui.isItemModalOpen = true;
      return true;
    }

    case 'CLOSE_ITEM_MODAL': {
      draftState.ui.isItemModalOpen = false;
      draftState.ui.newItemName = '';
      return true;
    }

    case 'OPEN_DELETE_ITEM_MODAL': {
      const { itemId, dependentRecipes } = action.payload;
      draftState.ui.deleteItemModal = {
        isOpen: true,
        itemId,
        dependentRecipes,
      };
      return true;
    }

    case 'CLOSE_DELETE_ITEM_MODAL': {
      draftState.ui.deleteItemModal = {
        isOpen: false,
        itemId: null,
        dependentRecipes: [],
      };
      return true;
    }

    case 'UPDATE_NEW_ITEM_NAME': {
      draftState.ui.newItemName = action.payload;
      return true;
    }

    default:
      return false;
  }
}
