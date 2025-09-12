import {
  Logger,
  loadState,
  saveState,
  debounce,
  SLOTS,
  createRecipeEditorState,
} from './utils.js';
import { calculateRecipeTotals, initializeSelectors } from './selectors.js';
import { render, initializeRenderer } from './render.js';
import { initializeEvents } from './events.js';

// State Singleton
let state = {};

export function getState() {
  return state;
}

// Initialize dependencies for other modules (Dependency Injection)
initializeSelectors(getState);
initializeRenderer(getState);

let _debouncedSaveState;

export function dispatch(action) {
  // Apply changes via the reducer
  state = reducer(state, action);
  // Persist state (debounced)
  if (_debouncedSaveState) {
    _debouncedSaveState(state);
  }
  // Re-render the UI
  render();
}

// Main Reducer (using Immer for immutability)
const reducer = immer.produce((draftState, action) => {
  switch (action.type) {
    case 'SAVE_PROFILE': {
      const { name, ...profileData } = action.payload;
      const profile = draftState.profiles.byId[draftState.ui.activeProfileId];
      if (profile && profile.isDefault) {
        return;
      }
      if (!name || name.trim() === '') {
        if (!draftState.ui) draftState.ui = {};
        draftState.ui.profileError = 'El nombre no puede estar vacío';
        break;
      }
      // Limpiar error si existía
      if (!draftState.ui) draftState.ui = {};
      draftState.ui.profileError = null;
      // Lógica normal para guardar el perfil
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
      break;
    }
    case 'INIT_DATA': {
      Object.assign(draftState, action.payload);
      break;
    }
    case 'CREATE_PROFILE': {
      const newProfile = action.payload;
      draftState.profiles.byId[newProfile.id] = newProfile;
      draftState.profiles.allIds.push(newProfile.id);
      draftState.ui.activeProfileId = newProfile.id;
      break;
    }
    case 'DELETE_PROFILE': {
      const profileIdToDelete = action.payload;
      if (draftState.profiles.byId[profileIdToDelete]?.isDefault) {
        Logger.warn(
          'Attempted to delete the default profile. Operation aborted.'
        );
        break;
      }
      delete draftState.profiles.byId[profileIdToDelete];
      draftState.profiles.allIds = draftState.profiles.allIds.filter(
        (id) => id !== profileIdToDelete
      );
      draftState.ui.activeProfileId = 'DEFAULT-PROFILE';
      break;
    }
    case 'UPDATE_PROFILE': {
      const { id, ...dataToUpdate } = action.payload;
      const profile = draftState.profiles.byId[id];
      if (!profile || profile.isDefault) break;

      if (dataToUpdate.age !== undefined)
        dataToUpdate.age = Math.max(0, parseFloat(dataToUpdate.age) || 0);
      if (dataToUpdate.weight !== undefined)
        dataToUpdate.weight = Math.max(0, parseFloat(dataToUpdate.weight) || 0);
      if (dataToUpdate.height !== undefined)
        dataToUpdate.height = Math.max(0, parseFloat(dataToUpdate.height) || 0);

      Object.assign(profile, dataToUpdate);
      break;
    }
    case 'UPDATE_PROFILE_TRACKED_NUTRIENTS': {
      const { profileId, nutrients } = action.payload;
      const profile = draftState.profiles.byId[profileId];
      if (profile) {
        profile.trackedNutrients = nutrients;
      }
      break;
    }
    case 'SET_PERSONAL_GOAL': {
      let { profileId, nutrientId, value } = action.payload;
      const profile = draftState.profiles.byId[profileId];
      if (!profile || profile.isDefault) break;

      if (value !== null && value !== '') {
        value = Math.max(0, parseFloat(value) || 0);
      }

      if (value === null || value === '') {
        delete profile.personalGoals[nutrientId];
      } else {
        profile.personalGoals[nutrientId] = value;
      }
      break;
    }
    case 'SET_ACTIVE_PROFILE': {
      draftState.ui.activeProfileId = action.payload;
      break;
    }
    case 'CREATE_ITEM': {
      const { name } = action.payload;
      const id = `ING-${name.toUpperCase().replace(/\s/g, '_')}-${new Date().getTime()}`;
      const newItem = {
        id,
        name,
        type: 'alimento',
        itemType: 'ingrediente',
        nutrients: {},
        tags: [],
        logistics: {
          stock: { value: 0, unit: 'gramos' },
          price: {},
        },
      };
      draftState.items.byId[id] = newItem;
      draftState.items.allIds.push(id);
      draftState.ui.isItemModalOpen = false;
      draftState.ui.newItemName = '';
      break;
    }
    case 'START_EDITING_ITEM':
      draftState.ui.activeView = 'itemDetail';
      draftState.ui.editingItemId = action.payload.itemId;
      // Crear estado de edición para items
      draftState.ui.itemEditor = {
        isEditing: true,
        itemId: action.payload.itemId,
      };
      break;
    case 'CANCEL_EDITING_ITEM':
      // Cancelar edición pero mantener en vista de detalle (como las recetas)
      draftState.ui.itemEditor = null;
      break;
      break;
    case 'CLEAR_EDITING_ITEM':
      draftState.ui.editingItemId = null;
      break;
    case 'UPDATE_RECIPE_COMPUTED': {
      const { recipeId, computedTotals, totalGrams } = action.payload;
      const recipe = draftState.items.byId[recipeId];
      if (recipe) {
        recipe.computed = { totals: computedTotals, totalGrams };
      }
      break;
    }
    case 'VIEW_RECIPE_DETAIL': {
      const { recipeId } = action.payload;
      draftState.ui.activeView = 'recipeDetail';
      draftState.ui.editingItemId = recipeId;
      break;
    }
    case 'VIEW_ITEM_DETAIL': {
      const { itemId } = action.payload;
      draftState.ui.activeView = 'itemDetail';
      draftState.ui.editingItemId = itemId;
      // Asegurar que no está en modo edición
      draftState.ui.itemEditor = null;
      break;
    }
    case 'UPDATE_ITEM_DETAIL': {
      const { itemId, updates } = action.payload;
      const item = draftState.items.byId[itemId];
      if (item) {
        if (updates.name) item.name = updates.name;
        const { preferredStoreIds, ...otherLogistics } = updates.logistics;
        item.logistics.preferredStoreIds = preferredStoreIds;
        Object.assign(item.logistics, otherLogistics);
        item.categoryIds = updates.categoryIds;
        item.tags = updates.tags;

        // Actualizar valores nutricionales si se proporcionan
        if (updates.nutrients && item.itemType === 'ingrediente') {
          Object.assign(item.nutrients, updates.nutrients);
        }
      }
      draftState.ui.activeView = 'library';
      draftState.ui.editingItemId = null;
      draftState.ui.itemEditor = null;
      break;
    }
    case 'UPDATE_INGREDIENT_LOGISTICS': {
      const { ingredientId, stockInGrams, newPriceEntry } = action.payload;
      const ingredient = draftState.items.byId[ingredientId];
      if (!ingredient) break;
      if (stockInGrams !== undefined)
        ingredient.logistics.stock.value = stockInGrams;
      if (newPriceEntry) ingredient.logistics.price = newPriceEntry;
      break;
    }
    case 'ADD_CUSTOM_NUTRIENT': {
      const newNutrient = action.payload;
      draftState.items.byId[newNutrient.id] = newNutrient;
      draftState.items.allIds.push(newNutrient.id);
      break;
    }
    case 'ADD_ITEM': {
      const newItem = action.payload;
      draftState.items.byId[newItem.id] = newItem;
      draftState.items.allIds.push(newItem.id);
      break;
    }
    case 'DELETE_ITEM': {
      const itemIdToDelete = action.payload;
      const item = draftState.items.byId[itemIdToDelete];
      if (item && item.itemType === 'definicion') {
        // Purge from profiles
        for (const profileId of draftState.profiles.allIds) {
          const profile = draftState.profiles.byId[profileId];
          if (profile.trackedNutrients) {
            profile.trackedNutrients = profile.trackedNutrients.filter(
              (id) => id !== itemIdToDelete
            );
          }
          if (
            profile.personalGoals &&
            profile.personalGoals[itemIdToDelete] !== undefined
          ) {
            delete profile.personalGoals[itemIdToDelete];
          }
        }
        // Purge from ingredients
        for (const iId of draftState.items.allIds) {
          const ing = draftState.items.byId[iId];
          if (ing.nutrients && ing.nutrients[itemIdToDelete] !== undefined) {
            delete ing.nutrients[itemIdToDelete];
          }
        }
      }
      delete draftState.items.byId[itemIdToDelete];
      draftState.items.allIds = draftState.items.allIds.filter(
        (id) => id !== itemIdToDelete
      );
      break;
    }
    case 'DELETE_TAG': {
      const tagIdToDelete = action.payload;
      delete draftState.tags.byId[tagIdToDelete];
      draftState.tags.allIds = draftState.tags.allIds.filter(
        (id) => id !== tagIdToDelete
      );
      break;
    }
    case 'ADD_STORE': {
      const newStore = action.payload;
      draftState.stores.byId[newStore.id] = newStore;
      draftState.stores.allIds.push(newStore.id);
      break;
    }
    case 'DELETE_STORE': {
      const storeIdToDelete = action.payload;
      delete draftState.stores.byId[storeIdToDelete];
      draftState.stores.allIds = draftState.stores.allIds.filter(
        (id) => id !== storeIdToDelete
      );

      // Remover el supermercado de todos los ingredientes que lo usen
      for (const itemId of draftState.items.allIds) {
        const item = draftState.items.byId[itemId];
        if (item.logistics && item.logistics.preferredStoreIds) {
          item.logistics.preferredStoreIds =
            item.logistics.preferredStoreIds.filter(
              (id) => id !== storeIdToDelete
            );
        }
      }
      break;
    }
    case 'ADD_CATEGORY': {
      const newCategory = action.payload;
      draftState.categories.byId[newCategory.id] = newCategory;
      draftState.categories.allIds.push(newCategory.id);
      break;
    }
    case 'DELETE_CATEGORY': {
      const categoryIdToDelete = action.payload;
      delete draftState.categories.byId[categoryIdToDelete];
      draftState.categories.allIds = draftState.categories.allIds.filter(
        (id) => id !== categoryIdToDelete
      );

      // Remover la categoría de todos los ingredientes que la usen
      for (const itemId of draftState.items.allIds) {
        const item = draftState.items.byId[itemId];
        if (item.categoryIds) {
          item.categoryIds = item.categoryIds.filter(
            (id) => id !== categoryIdToDelete
          );
        }
      }
      break;
    }
    case 'ADD_RECIPE': {
      const newRecipeData = action.payload;

      // Use the imported selector function
      const { computedTotals, totalGrams } = calculateRecipeTotals(
        newRecipeData,
        draftState.items.byId
      );

      const finalRecipe = {
        ...newRecipeData,
        type: 'alimento',
        itemType: 'receta',
        computed: {
          totals: computedTotals,
          totalGrams: totalGrams,
        },
      };
      draftState.items.byId[finalRecipe.id] = finalRecipe;
      draftState.items.allIds.push(finalRecipe.id);
      break;
    }
    case 'ASSIGN_ITEM_TO_SLOT': {
      const { date, slot, id, grams } = action.payload;
      const newItem = { id, grams };
      const datePlan = draftState.planner[date] || {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      };
      datePlan[slot].push(newItem);
      draftState.planner[date] = datePlan;
      break;
    }
    case 'REMOVE_PLANNED_MEAL': {
      const { date, slot, itemIndex } = action.payload;
      if (
        draftState.planner[date] &&
        draftState.planner[date][slot] &&
        itemIndex >= 0 &&
        itemIndex < draftState.planner[date][slot].length
      ) {
        draftState.planner[date][slot].splice(itemIndex, 1);
      }
      break;
    }
    case 'SET_ACTIVE_DAY': {
      const newActiveDayId = action.payload;
      draftState.ui.activePlannerDay =
        newActiveDayId === draftState.ui.activePlannerDay
          ? null
          : newActiveDayId;
      break;
    }
    case 'UPDATE_RECIPE_BUILDER_NAME': {
      draftState.ui.recipeBuilder.name = action.payload;
      break;
    }
    case 'ADD_INGREDIENT_TO_BUILDER': {
      draftState.ui.recipeBuilder.ingredients.push(action.payload);
      break;
    }
    case 'CLEAR_RECIPE_BUILDER': {
      draftState.ui.recipeBuilder = { name: '', ingredients: [] };
      break;
    }
    // INICIO DE EDICIÓN DE RECETAS
    case 'START_RECIPE_EDITING': {
      const recipe = draftState.items.byId[action.payload.recipeId];
      if (recipe) {
        draftState.ui.recipeEditor = createRecipeEditorState(recipe, true);
      }
      break;
    }
    // ACTUALIZACIÓN DE RACIONES DURANTE EDICIÓN
    case 'UPDATE_RECIPE_SERVINGS': {
      const { recipeEditor } = draftState.ui;
      if (
        recipeEditor.isEditing &&
        recipeEditor.recipeId === action.payload.recipeId
      ) {
        if (recipeEditor.raciones !== action.payload.servings) {
          recipeEditor.raciones = action.payload.servings;
        }
      }
      break;
    }
    case 'ADD_INGREDIENT_TO_EDITOR': {
      draftState.ui.recipeEditor.ingredients.push(action.payload);
      break;
    }
    case 'REMOVE_INGREDIENT_FROM_EDITOR': {
      draftState.ui.recipeEditor.ingredients =
        draftState.ui.recipeEditor.ingredients.filter(
          (_, index) => index !== action.payload.index
        );
      break;
    }
    case 'UPDATE_INGREDIENT_IN_EDITOR': {
      const { index, grams } = action.payload;
      if (draftState.ui.recipeEditor.ingredients[index]) {
        draftState.ui.recipeEditor.ingredients[index].grams = grams;
      }
      break;
    }
    // GUARDADO DE CAMBIOS EN RECETA
    case 'SAVE_RECIPE_EDITS': {
      const recipe = draftState.items.byId[draftState.ui.recipeEditor.recipeId];
      if (recipe) {
        recipe.ingredients = [...draftState.ui.recipeEditor.ingredients];
        recipe.raciones = draftState.ui.recipeEditor.raciones || 1;

        // Recalcular totales después de guardar
        const { computedTotals, totalGrams } = calculateRecipeTotals(
          recipe,
          draftState.items.byId
        );
        recipe.computed = { totals: computedTotals, totalGrams };
      }
      draftState.ui.recipeEditor = createRecipeEditorState();
      break;
    }
    // CANCELACIÓN DE EDICIÓN
    case 'CANCEL_RECIPE_EDITING': {
      draftState.ui.recipeEditor = createRecipeEditorState();
      break;
    }
    case 'COMPLEX_TOGGLE': {
      const { type, value, context } = action.payload;
      const isMonthView = draftState.ui.nexusView === 'month';
      const currentMonth = isMonthView
        ? new Date(draftState.ui.activePlannerDay).getMonth()
        : null;

      let idsToToggle = new Set();

      if (type === 'cell') {
        idsToToggle.add(value);
      } else if (type === 'day-column') {
        const dayIndex = parseInt(value, 10);
        context.dates.forEach((date) => {
          if (date.getDay() === dayIndex && date.getMonth() === currentMonth) {
            SLOTS.forEach((slot) => {
              idsToToggle.add(`${date.toISOString().split('T')[0]}/${slot}`);
            });
          }
        });
      } else if (type === 'slotRow') {
        const slot = value;
        context.dates.forEach((date) => {
          if (!isMonthView || date.getMonth() === currentMonth) {
            idsToToggle.add(`${date.toISOString().split('T')[0]}/${slot}`);
          }
        });
      } else if (type === 'day') {
        const dateStr = value;
        if (
          !isMonthView ||
          new Date(dateStr + 'T12:00:00').getMonth() === currentMonth
        ) {
          SLOTS.forEach((slot) => {
            idsToToggle.add(`${dateStr}/${slot}`);
          });
        }
      } else if (type === 'all') {
        context.dates.forEach((date) => {
          if (!isMonthView || date.getMonth() === currentMonth) {
            SLOTS.forEach((slot) => {
              idsToToggle.add(`${date.toISOString().split('T')[0]}/${slot}`);
            });
          }
        });
      }

      const allIdsAreSelected =
        idsToToggle.size > 0 &&
        Array.from(idsToToggle).every((id) =>
          draftState.ui.selectedCells.has(id)
        );

      if (allIdsAreSelected) {
        idsToToggle.forEach((id) => draftState.ui.selectedCells.delete(id));
      } else {
        idsToToggle.forEach((id) => draftState.ui.selectedCells.add(id));
      }
      break;
    }
    case 'CHANGE_WEEK': {
      const { direction } = action.payload;
      const currentDate = new Date(
        draftState.ui.activePlannerDay || new Date()
      );
      const newDate = new Date(currentDate);
      const dayAdjustment = direction === 'next' ? 7 : -7;
      newDate.setDate(currentDate.getDate() + dayAdjustment);
      draftState.ui.activePlannerDay = newDate.toISOString().split('T')[0];
      break;
    }
    case 'CHANGE_MONTH': {
      const { direction } = action.payload;
      const currentDate = new Date(
        draftState.ui.activePlannerDay || new Date()
      );
      const newDate = new Date(currentDate);
      const monthAdjustment = direction === 'next' ? 1 : -1;
      newDate.setMonth(currentDate.getMonth() + monthAdjustment);
      draftState.ui.activePlannerDay = newDate.toISOString().split('T')[0];
      break;
    }
    case 'SET_NEXUS_VIEW': {
      draftState.ui.nexusView = action.payload;
      break;
    }
    case 'GO_TO_TODAY': {
      const todayStr = new Date().toISOString().split('T')[0];
      draftState.ui.activePlannerDay = todayStr;
      break;
    }
    case 'CLEAR_SELECTION': {
      draftState.ui.selectedCells.clear();
      break;
    }
    case 'ADD_NOTIFICATION': {
      const newNotification = {
        id: new Date().getTime(),
        message: action.payload.message,
        type: action.payload.type || 'info',
      };
      draftState.ui.notifications.push(newNotification);
      break;
    }
    case 'REMOVE_NOTIFICATION': {
      draftState.ui.notifications = draftState.ui.notifications.filter(
        (n) => n.id !== action.payload
      );
      break;
    }
    case 'SET_ACTIVE_VIEW':
      draftState.ui.activeView = action.payload;
      break;
    case 'OPEN_ITEM_MODAL':
      draftState.ui.isItemModalOpen = true;
      break;
    case 'CLOSE_ITEM_MODAL':
      draftState.ui.isItemModalOpen = false;
      draftState.ui.newItemName = ''; // Limpiar al cerrar
      break;
    case 'OPEN_DELETE_ITEM_MODAL': {
      const { itemId, dependentRecipes } = action.payload;
      draftState.ui.deleteItemModal = {
        isOpen: true,
        itemId,
        dependentRecipes,
      };
      break;
    }
    case 'CLOSE_DELETE_ITEM_MODAL':
      draftState.ui.deleteItemModal = {
        isOpen: false,
        itemId: null,
        dependentRecipes: [],
      };
      break;
    case 'DELETE_INGREDIENT': {
      const itemId = action.payload;
      // Eliminar de items
      delete draftState.items.byId[itemId];
      draftState.items.allIds = draftState.items.allIds.filter(
        (id) => id !== itemId
      );

      // Eliminar de todas las recetas y recalcularlas
      for (const recipeId of draftState.items.allIds) {
        const recipe = draftState.items.byId[recipeId];
        if (recipe.itemType === 'receta' && recipe.ingredients) {
          const originalLength = recipe.ingredients.length;
          recipe.ingredients = recipe.ingredients.filter(
            (ing) => ing.ingredientId !== itemId
          );
          if (recipe.ingredients.length !== originalLength) {
            // Recalcular si se eliminó el ingrediente
            const { computedTotals, totalGrams } = calculateRecipeTotals(
              recipe,
              draftState.items.byId
            );
            recipe.computed = { totals: computedTotals, totalGrams };
          }
        }
      }

      // Eliminar del planificador
      for (const dateKey in draftState.planner) {
        for (const slot in draftState.planner[dateKey]) {
          draftState.planner[dateKey][slot] = draftState.planner[dateKey][
            slot
          ].filter((item) => item.id !== itemId);
        }
      }

      // Cerrar modal
      draftState.ui.deleteItemModal = {
        isOpen: false,
        itemId: null,
        dependentRecipes: [],
      };
      break;
    }
    case 'UPDATE_NEW_ITEM_NAME':
      draftState.ui.newItemName = action.payload;
      break;
    case 'NO_OP': {
      break;
    }
    default:
      break;
  }
});

// Migration Logic
function migrateStateTo_20_0_0(legacyState) {
  try {
    const stateCopy = JSON.parse(JSON.stringify(legacyState));
    const newState = {
      referenceGuides: {
        byId: {
          'EFSA-2017': {
            id: 'EFSA-2017',
            name: 'Guía de Referencia EFSA 2017',
            nutrients: { calories: 2000, proteins: 50, fats: 70, carbs: 260 },
          },
          'FDA-2020': {
            id: 'FDA-2020',
            name: 'Guía de Referencia FDA 2020',
            nutrients: { calories: 2000, proteins: 50, fats: 78, carbs: 275 },
          },
        },
        allIds: ['EFSA-2017', 'FDA-2020'],
      },
      items: { byId: {}, allIds: [] },
      tags: { byId: {}, allIds: [] },
      profiles: stateCopy.profiles,
      planner: stateCopy.planner,
      ui: {}, // UI state is not migrated
    };

    for (const profileId in newState.profiles.byId) {
      if (!newState.profiles.byId[profileId].referenceSourceId) {
        newState.profiles.byId[profileId].referenceSourceId = 'EFSA-2017';
      }
    }

    if (stateCopy.nutrientDefinitions) {
      for (const id of stateCopy.nutrientDefinitions.allIds) {
        const nutrient = stateCopy.nutrientDefinitions.byId[id];
        newState.items.byId[id] = {
          id: nutrient.id,
          name: nutrient.name,
          unit: nutrient.unit,
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: nutrient.isCustom || false,
        };
        newState.items.allIds.push(id);
      }
    }

    if (stateCopy.ingredients) {
      for (const id of stateCopy.ingredients.allIds) {
        const ingredient = stateCopy.ingredients.byId[id];
        newState.items.byId[id] = {
          id: ingredient.id,
          name: ingredient.name,
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: ingredient.nutrients || {},
          tags: [],
          logistics: {
            stock: {
              value: ingredient.logistics?.stockInGrams || 0,
              unit: 'gramos',
            },
            price:
              ingredient.logistics?.prices?.length > 0
                ? ingredient.logistics.prices[
                    ingredient.logistics.prices.length - 1
                  ]
                : {},
          },
        };
        newState.items.allIds.push(id);
      }
    }

    if (stateCopy.recipes) {
      for (const id of stateCopy.recipes.allIds) {
        const recipe = stateCopy.recipes.byId[id];
        newState.items.byId[id] = {
          id: recipe.id,
          name: recipe.name,
          type: 'alimento',
          itemType: 'receta',
          ingredients: recipe.ingredients,
          computed: recipe.computed,
          tags: [],
        };
        newState.items.allIds.push(id);
      }
    }

    return newState;
  } catch (err) {
    Logger.error('Migration to v20.0.0 failed', err);
    return null;
  }
}

// Initialization
export function init() {
  _debouncedSaveState = debounce(saveState, 500);

  let persistedState = loadState();

  const todayStr = new Date().toISOString().split('T')[0];
  let initialData = {
    referenceGuides: {
      byId: {
        'EFSA-2017': {
          id: 'EFSA-2017',
          name: 'Guía de Referencia EFSA 2017',
          nutrients: {
            calories: 2000,
            proteins: 50,
            fats: 70,
            carbs: 260,
            vitamin_c: 80,
            calcium: 800,
            iron: 11,
            potassium: 2000,
            sodium: 2000,
          },
        },
        'FDA-2020': {
          id: 'FDA-2020',
          name: 'Guía de Referencia FDA 2020',
          nutrients: {
            calories: 2000,
            proteins: 50,
            fats: 78,
            carbs: 275,
            vitamin_d: 20,
            calcium: 1300,
            iron: 18,
            potassium: 4700,
            sodium: 2300,
          },
        },
      },
      allIds: ['EFSA-2017', 'FDA-2020'],
    },
    stores: {
      byId: {
        'STORE-MERCADONA': { id: 'STORE-MERCADONA', name: 'Mercadona' },
        'STORE-LIDL': { id: 'STORE-LIDL', name: 'Lidl' },
        'STORE-SUPERMERCADO': {
          id: 'STORE-SUPERMERCADO',
          name: 'Supermercado',
        },
      },
      allIds: ['STORE-MERCADONA', 'STORE-LIDL', 'STORE-SUPERMERCADO'],
    },
    categories: {
      byId: {
        'CAT-CARNES': { id: 'CAT-CARNES', name: 'Carnes' },
        'CAT-PESCADOS': { id: 'CAT-PESCADOS', name: 'Pescados' },
        'CAT-FRUTAS': { id: 'CAT-FRUTAS', name: 'Frutas' },
        'CAT-VERDURAS': { id: 'CAT-VERDURAS', name: 'Verduras' },
        'CAT-DULCES': { id: 'CAT-DULCES', name: 'Dulces' },
        'CAT-LEGUMBRES': { id: 'CAT-LEGUMBRES', name: 'Legumbres' },
        'CAT-CEREALES': { id: 'CAT-CEREALES', name: 'Cereales' },
        'CAT-LACTEOS': { id: 'CAT-LACTEOS', name: 'Lácteos' },
      },
      allIds: [
        'CAT-CARNES',
        'CAT-PESCADOS',
        'CAT-FRUTAS',
        'CAT-VERDURAS',
        'CAT-DULCES',
        'CAT-LEGUMBRES',
        'CAT-CEREALES',
        'CAT-LACTEOS',
      ],
    },
    tags: {
      byId: {},
      allIds: [],
    },
    items: {
      byId: {
        // NUTRIENT DEFINITIONS
        calories: {
          id: 'calories',
          name: 'Calorías',
          unit: 'kcal',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        proteins: {
          id: 'proteins',
          name: 'Proteínas',
          unit: 'g',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        carbs: {
          id: 'carbs',
          name: 'Carbohidratos',
          unit: 'g',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        fats: {
          id: 'fats',
          name: 'Grasas',
          unit: 'g',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        vitamin_c: {
          id: 'vitamin_c',
          name: 'Vitamina C',
          unit: 'mg',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        vitamin_d: {
          id: 'vitamin_d',
          name: 'Vitamina D',
          unit: 'mcg',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        calcium: {
          id: 'calcium',
          name: 'Calcio',
          unit: 'mg',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        iron: {
          id: 'iron',
          name: 'Hierro',
          unit: 'mg',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        potassium: {
          id: 'potassium',
          name: 'Potasio',
          unit: 'mg',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },
        sodium: {
          id: 'sodium',
          name: 'Sodio',
          unit: 'mg',
          type: 'nutriente',
          itemType: 'definicion',
          isCustom: false,
        },

        // INGREDIENTS
        'CHICKEN-BREAST': {
          id: 'CHICKEN-BREAST',
          name: 'Pechuga de Pollo',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 165,
            proteins: 31,
            fats: 3.6,
            carbs: 0,
            vitamin_c: 0,
            vitamin_d: 0,
            calcium: 11,
            iron: 1,
            potassium: 256,
            sodium: 74,
            servingSizeGrams: 100,
          },
          tags: [],
          categoryIds: ['CAT-CARNES'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: {},
            preferredStoreIds: [],
          },
        },
        'MANZANA-FUJI': {
          id: 'MANZANA-FUJI',
          name: 'Manzana Fuji',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 52,
            proteins: 0.3,
            fats: 0.2,
            carbs: 14,
            vitamin_c: 4.6,
            vitamin_d: 0,
            calcium: 6,
            iron: 0.1,
            potassium: 107,
            sodium: 1,
            servingSizeGrams: 180,
          },
          tags: [],
          categoryIds: ['CAT-FRUTAS'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: {},
            preferredStoreIds: [],
          },
        },
        'ESPINACAS-FRESCAS': {
          id: 'ESPINACAS-FRESCAS',
          name: 'Espinacas Frescas',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 23,
            proteins: 2.9,
            fats: 0.4,
            carbs: 3.6,
            vitamin_c: 28,
            vitamin_d: 0,
            calcium: 99,
            iron: 2.7,
            potassium: 558,
            sodium: 79,
            servingSizeGrams: 85,
          },
          tags: [],
          categoryIds: ['CAT-VERDURAS'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: { value: 1.5 },
            preferredStoreIds: ['STORE-MERCADONA'],
            purchaseInfo: {
              packageValue: 250,
              unit: 'gramos',
              servingCount: 2.94,
            },
          },
        },
        'SALMON-FILLET': {
          id: 'SALMON-FILLET',
          name: 'Filete de Salmón',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 208,
            proteins: 20,
            fats: 13,
            carbs: 0,
            vitamin_c: 0,
            vitamin_d: 13.6,
            calcium: 9,
            iron: 0.3,
            potassium: 363,
            sodium: 59,
            servingSizeGrams: 140,
          },
          tags: [],
          categoryIds: ['CAT-PESCADOS'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: { value: 8.99 },
            preferredStoreIds: ['STORE-MERCADONA'],
            purchaseInfo: {
              packageValue: 280,
              unit: 'gramos',
              servingCount: 2,
            },
          },
        },
        'PATATA-GRANDE': {
          id: 'PATATA-GRANDE',
          name: 'Patata Grande',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 77,
            proteins: 2,
            fats: 0.1,
            carbs: 17,
            vitamin_c: 19.7,
            vitamin_d: 0,
            calcium: 12,
            iron: 0.8,
            potassium: 429,
            sodium: 6,
            servingSizeGrams: 200,
          },
          tags: [],
          categoryIds: ['CAT-VERDURAS'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: {},
            preferredStoreIds: [],
          },
        },
        'GALLETAS-CHOCOLATE': {
          id: 'GALLETAS-CHOCOLATE',
          name: 'Galletas con Chocolate',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 502,
            proteins: 5.3,
            fats: 24,
            carbs: 68,
            vitamin_c: 0,
            vitamin_d: 0,
            calcium: 20,
            iron: 2,
            potassium: 150,
            sodium: 170,
            servingSizeGrams: 20,
          },
          tags: [],
          categoryIds: ['CAT-DULCES'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: { value: 2.1 },
            preferredStoreIds: ['STORE-SUPERMERCADO'],
            purchaseInfo: {
              packageValue: 200,
              unit: 'gramos',
              servingCount: 10,
            },
          },
        },
        'DORITOS-TEX-MEX': {
          id: 'DORITOS-TEX-MEX',
          name: 'Doritos Tex-Mex',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 498,
            proteins: 6.5,
            fats: 26,
            carbs: 57,
            vitamin_c: 0,
            vitamin_d: 0,
            calcium: 0,
            iron: 0,
            potassium: 0,
            sodium: 810,
            servingSizeGrams: 30,
          },
          tags: [],
          categoryIds: ['CAT-DULCES'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: { value: 1.85 },
            preferredStoreIds: ['STORE-SUPERMERCADO'],
            purchaseInfo: {
              packageValue: 170,
              unit: 'gramos',
              servingCount: 5.66,
            },
          },
        },
        'ARROZ-BLANCO': {
          id: 'ARROZ-BLANCO',
          name: 'Arroz Blanco (crudo)',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 365,
            proteins: 7.1,
            fats: 0.7,
            carbs: 80,
            vitamin_c: 0,
            vitamin_d: 0,
            calcium: 28,
            iron: 0.8,
            potassium: 115,
            sodium: 5,
            servingSizeGrams: 45,
          },
          tags: [],
          categoryIds: ['CAT-CEREALES'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: { value: 1.2 },
            preferredStoreIds: ['STORE-SUPERMERCADO'],
            purchaseInfo: {
              packageValue: 1000,
              unit: 'gramos',
              servingCount: 22.22,
            },
          },
        },
        'ATUN-LATA-ACEITE': {
          id: 'ATUN-LATA-ACEITE',
          name: 'Atún en Lata (aceite, escurrido)',
          type: 'alimento',
          itemType: 'ingrediente',
          nutrients: {
            calories: 184,
            proteins: 29,
            fats: 7,
            carbs: 0,
            vitamin_c: 0,
            vitamin_d: 2,
            calcium: 10,
            iron: 1.5,
            potassium: 257,
            sodium: 392,
            servingSizeGrams: 52,
          },
          tags: [],
          categoryIds: ['CAT-PESCADOS'],
          logistics: {
            stock: { value: 0, unit: 'gramos' },
            price: { value: 2.5 },
            preferredStoreIds: ['STORE-SUPERMERCADO'],
            purchaseInfo: {
              packageValue: 156,
              unit: 'gramos',
              servingCount: 3,
            },
          },
        },

        // RECIPES
        'REC-ENSALADA-ESPINACAS': {
          id: 'REC-ENSALADA-ESPINACAS',
          name: 'Ensalada de Espinacas y Manzana',
          type: 'alimento',
          itemType: 'receta',
          ingredients: [
            { ingredientId: 'ESPINACAS-FRESCAS', grams: 120 },
            { ingredientId: 'MANZANA-FUJI', grams: 80 },
          ], // Total: 200g
          tags: [],
          computed: {},
        },
        'REC-SALMON-PATATAS': {
          id: 'REC-SALMON-PATATAS',
          name: 'Salmón con Patatas',
          type: 'alimento',
          itemType: 'receta',
          ingredients: [
            { ingredientId: 'SALMON-FILLET', grams: 150 },
            { ingredientId: 'PATATA-GRANDE', grams: 200 },
          ], // Total: 350g
          tags: [],
          computed: {},
        },
        'REC-POLLO-ARROZ': {
          id: 'REC-POLLO-ARROZ',
          name: 'Pollo con Arroz',
          type: 'alimento',
          itemType: 'receta',
          ingredients: [
            { ingredientId: 'CHICKEN-BREAST', grams: 120 },
            { ingredientId: 'ARROZ-BLANCO', grams: 80 },
          ], // Total: 200g
          tags: [],
          computed: {},
        },
        'REC-ENSALADA-ATUN': {
          id: 'REC-ENSALADA-ATUN',
          name: 'Ensalada de Atún',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'ATUN-LATA-ACEITE', grams: 100 },
            { ingredientId: 'ESPINACAS-FRESCAS', grams: 100 },
          ], // Total: 200g
          tags: [],
          computed: {},
        },
        'REC-SALMON-ESPINACAS': {
          id: 'REC-SALMON-ESPINACAS',
          name: 'Salmón con Espinacas',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'SALMON-FILLET', grams: 140 },
            { ingredientId: 'ESPINACAS-FRESCAS', grams: 110 },
          ], // Total: 250g
          tags: [],
          computed: {},
        },
        'REC-POLLO-PATATAS': {
          id: 'REC-POLLO-PATATAS',
          name: 'Pollo con Patatas Asadas',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'CHICKEN-BREAST', grams: 130 },
            { ingredientId: 'PATATA-GRANDE', grams: 170 },
          ], // Total: 300g
          tags: [],
          computed: {},
        },
        'REC-ARROZ-ATUN': {
          id: 'REC-ARROZ-ATUN',
          name: 'Arroz con Atún',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'ARROZ-BLANCO', grams: 70 },
            { ingredientId: 'ATUN-LATA-ACEITE', grams: 80 },
          ], // Total: 150g
          tags: [],
          computed: {},
        },
        'REC-ENSALADA-POLLO': {
          id: 'REC-ENSALADA-POLLO',
          name: 'Ensalada de Pollo y Manzana',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'CHICKEN-BREAST', grams: 100 },
            { ingredientId: 'MANZANA-FUJI', grams: 60 },
            { ingredientId: 'ESPINACAS-FRESCAS', grams: 80 },
          ], // Total: 240g
          tags: [],
          computed: {},
        },
        'REC-PATATA-ATUN': {
          id: 'REC-PATATA-ATUN',
          name: 'Patatas con Atún',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'PATATA-GRANDE', grams: 180 },
            { ingredientId: 'ATUN-LATA-ACEITE', grams: 90 },
          ], // Total: 270g
          tags: [],
          computed: {},
        },
        'REC-BOWL-SALMON': {
          id: 'REC-BOWL-SALMON',
          name: 'Bowl de Salmón y Arroz',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'SALMON-FILLET', grams: 120 },
            { ingredientId: 'ARROZ-BLANCO', grams: 60 },
            { ingredientId: 'ESPINACAS-FRESCAS', grams: 70 },
          ], // Total: 250g
          tags: [],
          computed: {},
        },
        'REC-MANZANA-POLLO': {
          id: 'REC-MANZANA-POLLO',
          name: 'Pollo Asado con Manzana',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'CHICKEN-BREAST', grams: 140 },
            { ingredientId: 'MANZANA-FUJI', grams: 90 },
          ], // Total: 230g
          tags: [],
          computed: {},
        },
        'REC-BOWL-COMPLETO': {
          id: 'REC-BOWL-COMPLETO',
          name: 'Bowl Completo Nutritivo',
          type: 'alimento',
          itemType: 'receta',
          raciones: 1,
          ingredients: [
            { ingredientId: 'CHICKEN-BREAST', grams: 90 },
            { ingredientId: 'ARROZ-BLANCO', grams: 50 },
            { ingredientId: 'ESPINACAS-FRESCAS', grams: 70 },
            { ingredientId: 'MANZANA-FUJI', grams: 40 },
          ], // Total: 250g
          tags: [],
          computed: {},
        },
      },
      allIds: [
        'calories',
        'proteins',
        'carbs',
        'fats',
        'vitamin_c',
        'vitamin_d',
        'calcium',
        'iron',
        'potassium',
        'sodium',
        'CHICKEN-BREAST',
        'MANZANA-FUJI',
        'ESPINACAS-FRESCAS',
        'SALMON-FILLET',
        'PATATA-GRANDE',
        'GALLETAS-CHOCOLATE',
        'DORITOS-TEX-MEX',
        'ARROZ-BLANCO',
        'ATUN-LATA-ACEITE',
        'REC-ENSALADA-ESPINACAS',
        'REC-SALMON-PATATAS',
        'REC-POLLO-ARROZ',
        'REC-ENSALADA-ATUN',
        'REC-SALMON-ESPINACAS',
        'REC-POLLO-PATATAS',
        'REC-ARROZ-ATUN',
        'REC-ENSALADA-POLLO',
        'REC-PATATA-ATUN',
        'REC-BOWL-SALMON',
        'REC-MANZANA-POLLO',
        'REC-BOWL-COMPLETO',
      ],
    },
    profiles: {
      byId: {
        'DEFAULT-PROFILE': {
          id: 'DEFAULT-PROFILE',
          name: 'Estándar',
          isDefault: true,
          personalGoals: {},
          trackedNutrients: ['calories', 'proteins', 'fats', 'carbs'],
          referenceSourceId: 'EFSA-2017',
        },
      },
      allIds: ['DEFAULT-PROFILE'],
    },
    planner: {},
    ui: {
      activePlannerDay: todayStr,
      activeProfileId: 'DEFAULT-PROFILE',
      recipeBuilder: { name: '', ingredients: [] },
      recipeEditor: createRecipeEditorState(), // Estado inicial: no editando
      selectedCells: new Set(),
      nexusView: 'week',
      notifications: [],
      activeView: 'planner',
      isItemModalOpen: false,
      deleteItemModal: { isOpen: false, itemId: null, dependentRecipes: [] },
      newItemName: '',
      editingItemId: null,
    },
  };

  // Recompute totals for all recipes on init
  Object.values(initialData.items.byId).forEach((item) => {
    if (item.itemType === 'receta') {
      const { computedTotals, totalGrams } = calculateRecipeTotals(
        item,
        initialData.items.byId
      );
      item.computed = { totals: computedTotals, totalGrams };
    }
  });

  // Handle Migration
  if (
    persistedState &&
    (persistedState.ingredients ||
      persistedState.recipes ||
      !persistedState.referenceGuides)
  ) {
    Logger.log('Legacy state detected. Attempting migration...');
    const migratedState = migrateStateTo_20_0_0(persistedState);
    if (migratedState) {
      persistedState = migratedState;
      Logger.log('Migration successful.');
      localStorage.removeItem('atomCanvasState'); // Clean up old state
    } else {
      Logger.error(
        'Migration failed. Backing up legacy state and starting fresh.'
      );
      localStorage.setItem(
        'atomCanvasState_backup_failed_migration',
        JSON.stringify(persistedState)
      );
      persistedState = undefined;
    }
  }

  const finalInitialState = {
    ...initialData,
    ...persistedState,
    ui: initialData.ui,
  };

  // Forzar actualización de referenceGuides para asegurar que tengan la definición completa de EFSA
  finalInitialState.referenceGuides = initialData.referenceGuides;

  // Also recompute totals for persisted recipes
  if (persistedState) {
    Object.values(finalInitialState.items.byId).forEach((item) => {
      if (item.itemType === 'receta') {
        const { computedTotals, totalGrams } = calculateRecipeTotals(
          item,
          finalInitialState.items.byId
        );
        item.computed = { totals: computedTotals, totalGrams };
      }
    });
  }

  // Initialize the event system now that state and dependencies are ready
  initializeEvents(dispatch, getState);

  // Load the initial state into the system
  dispatch({ type: 'INIT_DATA', payload: finalInitialState });
  // Signal to E2E tests that the app finished initialization
  try {
    window.__appReady = true;
  } catch (e) {
    /* ignore in restricted contexts */
  }

  // Expose lightweight test hooks for E2E specs. These are safe and read-only.
  if (typeof window !== 'undefined') {
    try {
      window.__getState = getState;
      // Expose dispatch so E2E tests can programmatically mutate state when needed
      window.__dispatch = dispatch;
      // Mark app as ready for tests that check a global flag
      window.__appReady = true;
    } catch (err) {
      // In restricted environments this may fail; ignore silently
      Logger.debug('Could not expose test hooks on window', err);
    }
  }
}
