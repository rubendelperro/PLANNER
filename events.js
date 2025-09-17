import {
  debounce,
  Logger,
  validateServings,
  getMonthDates,
  getWeekDates,
  getRacionesToShow,
} from './utils.js';
import { findDependentRecipes, calculateRecipeTotals } from './selectors.js';
import {
  handleProfileConfirmClick,
  handleNewProfileClick,
  handleDeleteProfileClick,
  createDebouncedProfileUpdater,
} from './components/profileFormHandlers.js';

// Dependency Injection containers
let dispatch = () => {};
let getState = () => ({});

let _debouncedProfileUpdate;
let _debouncedRecipeUpdate;
// Failsafe: listener global para navegación (se añade sólo una vez)
let _navListenerAttached = false;

export function initializeEvents(dispatchFn, getStateFn) {
  dispatch = dispatchFn;
  getState = getStateFn;

  // Initialize debounced functions specific to event handling
  _debouncedProfileUpdate = createDebouncedProfileUpdater(
    debounce,
    dispatch,
    getState
  );

  _debouncedRecipeUpdate = debounce(function (form) {
    if (form && form.elements.recipeName) {
      dispatch({
        type: 'UPDATE_RECIPE_BUILDER_NAME',
        payload: form.elements.recipeName.value,
      });
    }
  }, 500);
}

// Action Creators (Helper functions that create and dispatch actions)
export const actions = {
  requestDeletion(entityId, entityType) {
    const state = getState();
    let dependencies = [];
    let dependencyMessage = '';
    let deleteActionType = '';

    // El Guardián opera aquí
    switch (entityType) {
      // (Cases 'ingrediente' and 'tag' removed as they are handled via DELETE_ITEM_MODAL now)

      case 'nutriente_definicion':
        const dependentIngredients = Object.values(state.items.byId).filter(
          (item) =>
            item.itemType === 'ingrediente' &&
            item.nutrients &&
            item.nutrients[entityId] !== undefined
        );
        const dependentProfiles = Object.values(state.profiles.byId).filter(
          (profile) =>
            (profile.trackedNutrients &&
              profile.trackedNutrients.includes(entityId)) ||
            (profile.personalGoals &&
              profile.personalGoals[entityId] !== undefined)
        );

        if (dependentIngredients.length > 0 || dependentProfiles.length > 0) {
          dependencies = [...dependentIngredients, ...dependentProfiles];
          dependencyMessage = `Error: Nutriente en uso por ${dependentIngredients.length} ingrediente(s) y ${dependentProfiles.length} perfil(es).`;
        }
        deleteActionType = 'DELETE_ITEM';
        break;

      default:
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            message: `Error: Tipo de entidad desconocido o no manejado por requestDeletion '${entityType}'.`,
            type: 'error',
          },
        });
        return;
    }

    // Decisión final centralizada
    if (dependencies.length > 0) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: dependencyMessage, type: 'error' },
      });
      const currentState = getState(); // Get state after dispatch
      const notificationId =
        currentState.ui.notifications[currentState.ui.notifications.length - 1]
          .id;
      setTimeout(
        () =>
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId }),
        3000
      );
    } else {
      // Solo si es seguro, se despacha la acción de borrado real
      dispatch({ type: deleteActionType, payload: entityId });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: 'Elemento eliminado con éxito.', type: 'success' },
      });
      const currentState = getState(); // Get state after dispatch
      const notificationId =
        currentState.ui.notifications[currentState.ui.notifications.length - 1]
          .id;
      setTimeout(
        () =>
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId }),
        3000
      );
    }
  },

  createAndTrackNutrient(name, unit) {
    const state = getState();
    const id = `NUTRIENTE-${name.toUpperCase().replace(/\s/g, '_')}`;
    if (state.items.byId[id]) {
      Logger.warn(`Nutrient with id ${id} already exists.`);
      return;
    }

    const newNutrient = {
      id,
      name,
      unit,
      type: 'nutriente',
      itemType: 'definicion',
      isCustom: true,
    };

    dispatch({
      type: 'ADD_CUSTOM_NUTRIENT',
      payload: newNutrient,
    });

    const activeProfile = state.profiles.byId[state.ui.activeProfileId];
    const trackedNutrients = [...(activeProfile.trackedNutrients || []), id];
    dispatch({
      type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
      payload: {
        profileId: state.ui.activeProfileId,
        nutrients: trackedNutrients,
      },
    });
  },
  createProfile() {
    const newProfile = {
      id: `PROF-${new Date().getTime()}`,
      name: 'Nuevo Perfil',
      personalGoals: {},
      referenceSourceId: 'EFSA-2017',
      trackedNutrients: ['calories', 'proteins', 'fats', 'carbs'],
    };
    dispatch({ type: 'CREATE_PROFILE', payload: newProfile });
  },

  // Helpers for Recipe Editing
  getIngredientFormElements() {
    return {
      ingredientSelect:
        document.getElementById('ingredient-select') ||
        document.getElementById('ingredient-selector-inline'),
      gramsInput:
        document.getElementById('ingredient-grams') ||
        document.getElementById('ingredient-grams-inline'),
    };
  },

  validateIngredientInput(ingredientId, grams) {
    const state = getState();
    if (!ingredientId) {
      return { isValid: false, error: 'Por favor selecciona un ingrediente' };
    }

    if (grams <= 0 || isNaN(grams)) {
      return {
        isValid: false,
        error: 'Por favor ingresa una cantidad válida en gramos',
      };
    }

    if (!state.items.byId[ingredientId]) {
      return {
        isValid: false,
        error: 'El ingrediente seleccionado no es válido',
      };
    }

    return { isValid: true, error: null };
  },

  addIngredientToRecipe() {
    const { ingredientSelect, gramsInput } = this.getIngredientFormElements();

    if (!ingredientSelect || !gramsInput) {
      console.error(
        'No se encontraron los elementos del selector de ingredientes'
      );
      return;
    }

    const selectedIngredientId = ingredientSelect.value;
    const grams = parseFloat(gramsInput.value) || 0;

    const validation = this.validateIngredientInput(
      selectedIngredientId,
      grams
    );
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    dispatch({
      type: 'ADD_INGREDIENT_TO_EDITOR',
      payload: {
        ingredientId: selectedIngredientId,
        grams: grams,
      },
    });

    this.clearAndFocusIngredientForm(ingredientSelect, gramsInput);
    // Render is automatically called by dispatch
  },

  clearAndFocusIngredientForm(selectElement, inputElement) {
    selectElement.value = '';
    inputElement.value = '';
    selectElement.focus();
  },
};

// Main Event Listener Attachment
export function attachEventListeners(container) {
  if (!container) return;

  // Failsafe: attach a single global nav listener to ensure buttons with data-view
  // remain responsive even if re-rendering or delegate attachment had issues.
  if (!_navListenerAttached) {
    document.addEventListener('click', (event) => {
      const navButton =
        event.target.closest && event.target.closest('button[data-view]');
      if (navButton) {
        // dispatch may be initialized later; if so, this will be a noop until ready
        try {
          dispatch({
            type: 'SET_ACTIVE_VIEW',
            payload: navButton.dataset.view,
          });
        } catch (e) {
          // swallow errors to avoid breaking UI
        }
      }
    });
    _navListenerAttached = true;
  }

  // Attach delegate listener only once
  if (!container.dataset.mainDelegateAttached) {
    container.addEventListener('click', (event) => {
      const state = getState();

      // Navigation
      const navButton = event.target.closest('button[data-view]');
      if (navButton) {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: navButton.dataset.view });
        return;
      }

      // Item Actions (Library View)
      const viewItemButton = event.target.closest('[data-action="view-item"]');
      if (viewItemButton) {
        dispatch({
          type: 'VIEW_ITEM_DETAIL',
          payload: { itemId: viewItemButton.dataset.itemId },
        });
        return;
      }

      // Recipe Actions (Library View)
      const viewRecipeButton = event.target.closest(
        '[data-action="view-recipe"]'
      );
      if (viewRecipeButton) {
        const recipeId = viewRecipeButton.dataset.recipeId;
        dispatch({ type: 'VIEW_RECIPE_DETAIL', payload: { recipeId } });
        return;
      }

      // Remove tag button (inside tag spans)
      const removeTagBtn = event.target.closest('.remove-tag-btn');
      if (removeTagBtn) {
        event.stopPropagation();
        const tag = removeTagBtn.dataset.tag;
        const tagSpan = removeTagBtn.closest('span[data-tag]');
        if (tagSpan) tagSpan.remove();
        // No immediate dispatch: the save flow collects current spans and updates tags when the form is saved.
        return;
      }

      // --- Recipe Detail View Handlers ---

      // Toggle Nutrients View (DOM manipulation only, no state change)
      const per100gBtn = event.target.closest('#per-100g-btn');
      const perServingBtn = event.target.closest('#per-serving-btn');
      const perPackageBtn = event.target.closest('#per-package-btn');
      const perUnitBtn = event.target.closest('#per-unit-btn');

      if (per100gBtn || perServingBtn || perPackageBtn || perUnitBtn) {
        const per100gButton = container.querySelector('#per-100g-btn');
        const perServingButton = container.querySelector('#per-serving-btn');
        const perPackageButton = container.querySelector('#per-package-btn');
        const perUnitButton = container.querySelector('#per-unit-btn');

        // Find the panel that contains the clicked toggle buttons and limit
        // updates to only nutrient-value elements inside that panel. This
        // prevents other sections (for example the global "100g contienen"
        // list) from being overwritten by the toggle logic.
        const clickedBtn =
          per100gBtn || perServingBtn || perPackageBtn || perUnitBtn;
        let panelRoot = container;
        if (clickedBtn) {
          // Start from the button and walk up until we find an ancestor that
          // contains .nutrient-value elements, or until we reach the container.
          let p = clickedBtn.closest('div') || clickedBtn.parentElement;
          while (p && p !== container && !p.querySelector('.nutrient-value')) {
            p = p.parentElement;
          }
          if (p && p.querySelector('.nutrient-value')) panelRoot = p;
        }
        const nutrientValues = panelRoot.querySelectorAll('.nutrient-value');

        // Small helper to set button classes
        const baseInactive =
          'flex-1 py-2 px-4 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900';
        const baseActive =
          'flex-1 py-2 px-4 text-sm font-medium rounded-md bg-white text-gray-900 shadow';
        const setActive = (active) => {
          if (per100gButton) {
            per100gButton.className =
              active === 'per100g' ? baseActive : baseInactive;
          }
          if (perServingButton) {
            perServingButton.className =
              active === 'perserving' ? baseActive : baseInactive;
          }
          if (perPackageButton) {
            perPackageButton.className =
              active === 'perpackage' ? baseActive : baseInactive;
          }
          if (perUnitButton) {
            perUnitButton.className =
              active === 'perunit' ? baseActive : baseInactive;
          }
        };

        let mode = 'per100g';
        if (perServingBtn) mode = 'perserving';
        else if (perPackageBtn) mode = 'perpackage';
        else if (perUnitBtn) mode = 'perunit';

        // Persist the selected display mode on the app container so it survives re-renders
        try {
          const appRoot = container.closest('#app') || container;
          if (appRoot) appRoot.dataset.nutrientMode = mode;
        } catch (e) {
          /* ignore */
        }

        setActive(mode);

        nutrientValues.forEach((valueElement) => {
          const dbg = () => !!(window && window.__DEBUG_NUTRIENT_TOGGLE);
          const unit = valueElement.dataset.unit || '';
          const targetRaw = valueElement.dataset.target;
          const target = targetRaw ? parseFloat(targetRaw) : null;

          const valueMap = {
            per100g: valueElement.dataset.per100g,
            perserving: valueElement.dataset.perserving,
            perpackage: valueElement.dataset.perpackage,
            perunit: valueElement.dataset.perunit,
          };

          let rawValue = valueMap[mode];
          let numericValue =
            rawValue !== undefined && rawValue !== ''
              ? parseFloat(rawValue)
              : NaN;

          // If user selected 'perserving' but the element lacks a data-perserving
          // value (common for ingredients rendered without that field), compute
          // per-serving on the fly using the item from state (servingSizeGrams).
          if (
            mode === 'perserving' &&
            (rawValue === undefined || rawValue === '')
          ) {
            try {
              const currentItemId = state.ui.editingItemId;
              const currentItem = state.items.byId[currentItemId];
              if (dbg())
                console.debug(
                  '[nutrient-toggle] entering perserving fallback',
                  {
                    currentItemId,
                    rawValue,
                    per100g: valueElement.dataset.per100g,
                  }
                );
              if (currentItem && currentItem.itemType === 'ingrediente') {
                const per100gAttr = parseFloat(valueElement.dataset.per100g);
                const per100gNum = !isNaN(per100gAttr) ? per100gAttr : 0;
                if (dbg())
                  console.debug('[nutrient-toggle] per100gNum', per100gNum);
                let servingGrams = null;
                if (
                  currentItem.nutrients &&
                  typeof currentItem.nutrients.servingSizeGrams !==
                    'undefined' &&
                  currentItem.nutrients.servingSizeGrams !== null
                ) {
                  servingGrams = Number(currentItem.nutrients.servingSizeGrams);
                } else if (
                  currentItem.nutrients &&
                  typeof currentItem.nutrients.servingSize !== 'undefined' &&
                  currentItem.nutrients.servingSize !== null
                ) {
                  servingGrams = Number(currentItem.nutrients.servingSize);
                }
                if (
                  typeof servingGrams === 'number' &&
                  !isNaN(servingGrams) &&
                  servingGrams > 0
                ) {
                  const computedPerServing = (per100gNum * servingGrams) / 100;
                  const rounded = parseFloat(computedPerServing.toFixed(2));
                  rawValue = String(rounded);
                  numericValue = rounded;
                  if (dbg())
                    console.debug('[nutrient-toggle] computed perServing', {
                      servingGrams,
                      computedPerServing,
                      rounded,
                    });
                  // Persist the computed value into the DOM so future toggles can read it
                  try {
                    valueElement.dataset.perserving = rawValue;
                    if (dbg())
                      console.debug(
                        '[nutrient-toggle] dataset.perserving set',
                        valueElement.dataset.perserving
                      );
                  } catch (e) {
                    /* ignore DOM write errors */
                  }
                  if (dbg() && window.__DEBUG_NUTRIENT_TOGGLE_BREAK) {
                    debugger; // optional break
                  }
                }
              }
            } catch (e) {
              if (dbg())
                console.error(
                  '[nutrient-toggle] error computing perserving',
                  e
                );
              // Fallback to existing behavior if something goes wrong
            }
          }
          // Format numeric values for display: integers without decimals, otherwise 2 decimals
          const formatForDisplay = (v) => {
            if (v == null || isNaN(v)) return '—';
            return Number.isInteger(v) ? String(v) : parseFloat(v).toFixed(2);
          };

          const displayValue = !isNaN(numericValue)
            ? formatForDisplay(numericValue)
            : rawValue !== undefined &&
                rawValue !== '' &&
                !isNaN(parseFloat(rawValue))
              ? formatForDisplay(parseFloat(rawValue))
              : '—';

          const targetDisplay =
            target != null ? ` / ${parseFloat(target).toFixed(0)}${unit}` : '';
          valueElement.textContent = `${displayValue}${unit}${targetDisplay}`;

          const containerNode = valueElement.closest('.space-y-2');
          const progressBar = containerNode
            ? containerNode.querySelector('.progress-bar-inner')
            : null;

          if (progressBar && target != null && !isNaN(numericValue)) {
            const percentage = Math.min(
              100,
              Math.round((numericValue / target) * 100)
            );
            let status = 'info';
            if (numericValue > target * 1.1) status = 'danger';
            else if (percentage >= 90) status = 'success';
            else status = 'warning';

            const statusColors = {
              success: 'bg-green-500',
              warning: 'bg-yellow-500',
              danger: 'bg-red-500',
              info: 'bg-blue-500',
            };
            progressBar.className = `progress-bar-inner h-full ${statusColors[status]} transition-all duration-300`;
            progressBar.style.width = `${percentage}%`;
          }
        });
        return;
      }

      const backToRecipesBtn = event.target.closest('#back-to-recipes-btn');
      if (backToRecipesBtn) {
        if (state.ui.recipeEditor?.isEditing) {
          // Save edits and then show the saved recipe in view mode instead
          // of navigating back to the recipes list. This preserves context
          // for the user who wants to review the saved recipe.
          dispatch({ type: 'SAVE_RECIPE_EDITS' });
          const recipeId =
            state.ui.editingItemId ||
            (document.getElementById('recipe-detail-form') &&
              document.getElementById('recipe-detail-form').dataset.itemId);
          if (recipeId) {
            dispatch({ type: 'VIEW_RECIPE_DETAIL', payload: { recipeId } });
          } else {
            // Fallback to recipes list if we cannot determine the recipe id
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'recipes' });
          }
        } else {
          // If not in edit mode, preserve previous behavior
          dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'recipes' });
        }
        return;
      }

      const editRecipeBtn = event.target.closest('#edit-recipe-btn');
      if (editRecipeBtn) {
        const recipeId = state.ui.editingItemId;
        if (state.ui.recipeEditor?.isEditing) {
          dispatch({ type: 'CANCEL_RECIPE_EDITING' });
        } else {
          dispatch({ type: 'START_RECIPE_EDITING', payload: { recipeId } });
        }
        return;
      }

      const deleteCurrentRecipeBtn = event.target.closest(
        '#delete-current-recipe-btn'
      );
      if (deleteCurrentRecipeBtn) {
        event.stopPropagation();
        const recipeId = deleteCurrentRecipeBtn.dataset.recipeId;
        dispatch({
          type: 'OPEN_DELETE_ITEM_MODAL',
          payload: { itemId: recipeId, dependentRecipes: [] },
        });
        return;
      }

      // ============ ITEM DETAIL HANDLERS ============

      const backToLibraryBtn = event.target.closest('#back-to-library-btn');
      if (backToLibraryBtn) {
        const isEditing = state.ui.itemEditor?.isEditing;
        if (isEditing) {
          // Guardar cambios (submit form logic moved here from submit handler)
          const form = document.getElementById('item-detail-form');
          if (form) {
            const formData = new FormData(form);
            const itemId = form.dataset.itemId;

            const updates = {
              name: formData.get('name'),
              logistics: {
                // Stock inputs were removed from the UI; keep stock unchanged by default.
                price: {
                  value: parseFloat(formData.get('priceValue')) || 0,
                  unit: 'euros',
                },
                preferredStoreIds: Array.from(
                  formData.getAll('preferredStoreIds')
                ),
                // Campos para cálculos económicos (no afectan al motor de nutrientes)
                packageGrams:
                  formData.get('packageGrams') !== null &&
                  formData.get('packageGrams') !== ''
                    ? parseInt(formData.get('packageGrams'), 10)
                    : undefined,
                unitsPerPackage:
                  formData.get('unitsPerPackage') !== null &&
                  formData.get('unitsPerPackage') !== ''
                    ? parseInt(formData.get('unitsPerPackage'), 10)
                    : undefined,
              },
              categoryIds: Array.from(formData.getAll('categoryIds')),
              nutrients: {},
            };

            // Handle tags (which are not standard form elements)
            const tagContainer = document.getElementById('item-tags-container');
            // Leer solo spans que contienen data-tag para evitar duplicados y capturar correctamente el valor
            const currentTags = tagContainer
              ? Array.from(tagContainer.querySelectorAll('span[data-tag]')).map(
                  (span) => span.dataset.tag
                )
              : [];
            const newTagInput = form.elements.newTag;
            const newTag = newTagInput ? newTagInput.value.trim() : '';
            if (newTag && !currentTags.includes(newTag)) {
              currentTags.push(newTag);
            }
            updates.tags = currentTags;

            // Obtener valores nutricionales si es un ingrediente
            for (const [key, value] of formData.entries()) {
              if (key.startsWith('nutrient_')) {
                const nutrientId = key.replace('nutrient_', '');
                updates.nutrients[nutrientId] = parseFloat(value) || 0;
              }
            }

            // Persist servingSizeGrams if provided in the form (use FormData to be safe)
            const servingSizeVal = formData.get('servingSizeGrams');
            if (servingSizeVal !== null && servingSizeVal !== '') {
              updates.nutrients = updates.nutrients || {};
              updates.nutrients.servingSizeGrams =
                parseInt(servingSizeVal, 10) || 0;
            }

            // Dispatch update, then ensure we exit edit mode and open the item's detail in view mode
            dispatch({
              type: 'UPDATE_ITEM_DETAIL',
              payload: { itemId, updates },
            });
            // Clear editing state if present
            dispatch({ type: 'CANCEL_EDITING_ITEM' });
            // Show the saved item in view mode
            dispatch({ type: 'VIEW_ITEM_DETAIL', payload: { itemId } });
          }
        } else {
          dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'library' });
        }
        return;
      }

      const editItemBtn = event.target.closest('.edit-item-btn');
      if (editItemBtn) {
        // Determine the item id from the current editing context if available,
        // otherwise try to extract it from the button id (which we render as edit-item-btn-<itemId>)
        let itemId = state.ui.editingItemId;
        if (!itemId) {
          const parts =
            editItemBtn.id && editItemBtn.id.split('edit-item-btn-');
          if (parts && parts.length === 2) itemId = parts[1];
        }
        if (state.ui.itemEditor?.isEditing) {
          dispatch({ type: 'CANCEL_EDITING_ITEM' });
        } else {
          dispatch({ type: 'START_EDITING_ITEM', payload: { itemId } });
        }
        return;
      }

      const deleteCurrentItemBtn = event.target.closest(
        '#delete-current-item-btn'
      );
      if (deleteCurrentItemBtn) {
        event.stopPropagation();
        const itemId = deleteCurrentItemBtn.dataset.itemId;

        // Use imported selector
        const dependentRecipes = findDependentRecipes(itemId);

        dispatch({
          type: 'OPEN_DELETE_ITEM_MODAL',
          payload: { itemId, dependentRecipes },
        });
        return;
      }

      // ============ RECIPE EDITING HANDLERS ============

      // Eliminar ingrediente específico durante edición
      const removeIngredientBtn = event.target.closest(
        '.remove-ingredient-btn'
      );
      if (removeIngredientBtn) {
        const index = parseInt(removeIngredientBtn.dataset.index);
        dispatch({ type: 'REMOVE_INGREDIENT_FROM_EDITOR', payload: { index } });
        return;
      }

      // Add ingredient button (used in two places: library header and recipe composer)
      const addIngredientBtn = event.target.closest('#add-ingredient-btn');
      if (addIngredientBtn) {
        // If the button is inside the recipe composer form, delegate to the
        // existing recipe-adding flow.
        const recipeForm =
          addIngredientBtn.closest('#recipe-form') ||
          addIngredientBtn.closest('[data-recipe-id]');
        if (recipeForm) {
          actions.addIngredientToRecipe();
          return;
        }

        // Otherwise this is the library-level "+ Añadir Ingrediente" button.
        // Create a new blank ingredient and open it in edit mode.
        try {
          const id = `ING-NEW-${Date.now()}`;
          const newItem = {
            id,
            name: '',
            type: 'alimento',
            itemType: 'ingrediente',
            nutrients: {},
            tags: [],
            categoryIds: [],
            logistics: {
              stock: { value: 0, unit: 'gramos' },
              price: {},
            },
          };

          dispatch({ type: 'ADD_ITEM', payload: newItem });
          // Switch to item detail view and start editing the new item
          dispatch({ type: 'START_EDITING_ITEM', payload: { itemId: id } });
        } catch (e) {
          // swallow errors to avoid breaking the UI
        }

        return;
      }

      // ============ MODAL HANDLERS ============

      if (
        event.target.id === 'cancel-delete-item-btn' ||
        event.target.closest('#cancel-delete-item-btn')
      ) {
        event.stopPropagation();
        dispatch({ type: 'CLOSE_DELETE_ITEM_MODAL' });
        return;
      }

      if (event.target.id === 'confirm-delete-item-btn') {
        event.stopPropagation();
        const itemId = state.ui.deleteItemModal.itemId;
        const item = state.items.byId[itemId];

        if (item) {
          switch (item.itemType) {
            case 'receta':
              dispatch({ type: 'DELETE_ITEM', payload: itemId });
              dispatch({ type: 'CANCEL_EDITING_ITEM' });
              // Navigate back if still viewing the deleted recipe
              if (
                state.ui.activeView === 'recipeDetail' &&
                state.ui.editingItemId === itemId
              ) {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'recipes' });
              }
              break;
            case 'ingrediente':
              dispatch({ type: 'DELETE_INGREDIENT', payload: itemId });
              // Navigate back if still viewing the deleted item
              if (
                state.ui.activeView === 'itemDetail' &&
                state.ui.editingItemId === itemId
              ) {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'library' });
              }
              break;
            case 'definicion':
              dispatch({ type: 'DELETE_ITEM', payload: itemId });
              break;
            default:
              dispatch({ type: 'DELETE_ITEM', payload: itemId });
              break;
          }
        }
        dispatch({ type: 'CLOSE_DELETE_ITEM_MODAL' });
        return;
      }

      // Cerrar modal al hacer clic en el overlay
      if (
        event.target.id === 'delete-item-modal' &&
        !event.target.closest('.modal-content')
      ) {
        dispatch({ type: 'CLOSE_DELETE_ITEM_MODAL' });
        return;
      }

      // ============ PLANNER VIEW HANDLERS ============

      const plannerButton = event.target.closest(
        'button[data-date]:not([data-delete-planned-meal])'
      );
      if (
        plannerButton &&
        !event.target.closest('[data-delete-planned-meal]')
      ) {
        const newDate = plannerButton.dataset.date;
        dispatch({ type: 'SET_ACTIVE_DAY', payload: newDate });
        return;
      }

      const addIngredientToRecipeBtn = event.target.closest(
        '#add-ingredient-to-recipe-btn'
      );
      if (addIngredientToRecipeBtn) {
        // Recipe Builder (Planner View)
        const form = addIngredientToRecipeBtn.closest('form');
        const ingredientId = form.elements.ingredientSelect.value;
        const grams = parseFloat(form.elements.grams.value);
        if (ingredientId && state.items.byId[ingredientId] && grams > 0) {
          dispatch({
            type: 'ADD_INGREDIENT_TO_BUILDER',
            payload: { ingredientId, grams },
          });
        }
        return;
      }

      // Profile Management
      const confirmProfileButton = event.target.closest(
        '#confirm-profile-change'
      );
      if (confirmProfileButton) {
        _debouncedProfileUpdate.cancel();
        // delegate to profile form handler
        handleProfileConfirmClick(container, dispatch, getState)();
        return;
      }

      const newProfileBtn = event.target.closest('#new-profile-btn');
      if (newProfileBtn) {
        _debouncedProfileUpdate.cancel();
        handleNewProfileClick(actions)();
        return;
      }

      const deleteProfileBtn = event.target.closest('#delete-profile-btn');
      if (deleteProfileBtn) {
        _debouncedProfileUpdate.cancel();
        handleDeleteProfileClick(dispatch, getState)();
        return;
      }

      // Nutrient Manager
      const deleteNutrientBtn = event.target.closest(
        '[data-delete-nutrient-id]'
      );
      if (deleteNutrientBtn) {
        const nutrientId = deleteNutrientBtn.dataset.deleteNutrientId;
        actions.requestDeletion(nutrientId, 'nutriente_definicion');
        return;
      }

      // Store/Category Management
      const deleteStoreBtn = event.target.closest('[data-delete-store-id]');
      if (deleteStoreBtn) {
        const storeId = deleteStoreBtn.dataset.deleteStoreId;
        dispatch({ type: 'DELETE_STORE', payload: storeId });
        return;
      }

      const deleteCategoryBtn = event.target.closest(
        '[data-delete-category-id]'
      );
      if (deleteCategoryBtn) {
        const categoryId = deleteCategoryBtn.dataset.deleteCategoryId;
        dispatch({ type: 'DELETE_CATEGORY', payload: categoryId });
        return;
      }

      const deletePlannedMealBtn = event.target.closest(
        '[data-delete-planned-meal]'
      );
      if (deletePlannedMealBtn) {
        event.stopPropagation(); // Prevent accordion from closing
        const date = deletePlannedMealBtn.dataset.date;
        const slot = deletePlannedMealBtn.dataset.slot;
        const itemIndex = parseInt(deletePlannedMealBtn.dataset.itemIndex);
        dispatch({
          type: 'REMOVE_PLANNED_MEAL',
          payload: { date, slot, itemIndex },
        });
        return;
      }

      // Target Panel Editing
      const targetElement = event.target.closest('[data-nutrient-id]');
      if (
        targetElement &&
        container.querySelector('#targets-panel')?.contains(targetElement) &&
        !targetElement.querySelector('input')
      ) {
        const valueDisplay = targetElement.querySelector(
          '[data-value-display]'
        );
        if (!valueDisplay) return;

        if (state.profiles.byId[state.ui.activeProfileId]?.isDefault) {
          // UX: If the active profile is the default (read-only), offer to
          // duplicate it into a new personal profile so the user can edit
          // targets. This keeps the default profile immutable but provides a
          // clear path to customize targets.
          const confirmCreate = window.confirm(
            'Estás viendo el perfil estándar, que no puede editarse.\n¿Quieres crear un perfil personal basado en el estándar para poder editar los objetivos?'
          );
          if (!confirmCreate) return;

          // Build a shallow clone of the default profile with a new id
          const defaultProfile = state.profiles.byId[state.ui.activeProfileId];
          const newId = `PROF-${new Date().getTime()}`;
          const newProfile = {
            ...defaultProfile,
            id: newId,
            name: `${defaultProfile.name} (Personal)`,
            isDefault: false,
            // Ensure personalGoals object exists so edits will persist
            personalGoals: { ...(defaultProfile.personalGoals || {}) },
          };

          // Dispatch actions to create and activate the new profile
          dispatch({ type: 'CREATE_PROFILE', payload: newProfile });
          // Update local state reference after dispatch
          // Proceed with the rest of the handler so the input is created below
        }

        const nutrientId = targetElement.dataset.nutrientId;

        // Extract value from data attribute (set during render)
        const displayValue = valueDisplay.getAttribute('data-value-display');
        const currentValue = parseFloat(displayValue) || '';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = 0;
        input.value = currentValue ? parseFloat(currentValue).toFixed(0) : '';
        input.className =
          'font-bold text-lg text-blue-600 bg-gray-100 border border-blue-300 rounded-md text-right w-24';

        const persistChange = () => {
          const valueStr = input.value;
          const newValue = valueStr === '' ? null : parseFloat(valueStr);
          if (newValue === null || !isNaN(newValue)) {
            // Read freshest state to ensure we target the (possibly newly-created) active profile
            const freshState = getState();
            const targetProfileId =
              freshState.ui.activeProfileId || state.ui.activeProfileId;
            dispatch({
              type: 'SET_PERSONAL_GOAL',
              payload: {
                profileId: targetProfileId,
                nutrientId,
                value: newValue,
              },
            });
          } else {
            dispatch({ type: 'NO_OP' });
          }
        };

        input.addEventListener('blur', persistChange);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur();
          if (e.key === 'Escape') dispatch({ type: 'NO_OP' });
        });

        valueDisplay.replaceWith(input);
        input.focus();
        input.select();
        return;
      }

      // Nexus Calendar Interactions
      const nexusCell = event.target.closest('.nexus-cell');
      if (nexusCell) {
        const selectionId = nexusCell.dataset.selectionId;
        const selectionType = nexusCell.dataset.selectionType;
        if (selectionType) {
          let datesContext;
          if (state.ui.nexusView === 'month') {
            datesContext = getMonthDates(
              new Date(state.ui.activePlannerDay || new Date())
            ).flat();
          } else {
            datesContext = getWeekDates(
              new Date(state.ui.activePlannerDay || new Date())
            );
          }
          dispatch({
            type: 'COMPLEX_TOGGLE',
            payload: {
              type: selectionType,
              value: selectionId,
              context: { dates: datesContext },
            },
          });
        }
        return;
      }

      if (
        event.target.closest('#prev-week-btn') ||
        event.target.closest('#prev-month-btn')
      ) {
        const type =
          state.ui.nexusView === 'week' ? 'CHANGE_WEEK' : 'CHANGE_MONTH';
        dispatch({ type: type, payload: { direction: 'prev' } });
        return;
      }
      if (
        event.target.closest('#next-week-btn') ||
        event.target.closest('#next-month-btn')
      ) {
        const type =
          state.ui.nexusView === 'week' ? 'CHANGE_WEEK' : 'CHANGE_MONTH';
        dispatch({ type: type, payload: { direction: 'next' } });
        return;
      }
      if (event.target.closest('#view-week-btn')) {
        dispatch({ type: 'SET_NEXUS_VIEW', payload: 'week' });
        return;
      }
      if (event.target.closest('#view-month-btn')) {
        dispatch({ type: 'SET_NEXUS_VIEW', payload: 'month' });
        return;
      }
      if (event.target.closest('#go-to-today-btn')) {
        dispatch({ type: 'GO_TO_TODAY' });
        return;
      }
      if (event.target.closest('#clear-selection-btn')) {
        dispatch({ type: 'CLEAR_SELECTION' });
        return;
      }
    });

    // --- Input/Change/Submit Listeners ---

    container.addEventListener('input', (event) => {
      const state = getState();
      // Handler para cambios en cantidad de ingredientes durante edición
      if (
        event.target.classList.contains('ingredient-grams-input') &&
        state.ui.recipeEditor.isEditing
      ) {
        const index = parseInt(event.target.dataset.index);
        const grams = parseFloat(event.target.value) || 0;
        dispatch({
          type: 'UPDATE_INGREDIENT_IN_EDITOR',
          payload: { index, grams },
        });
        return;
      }

      // Profile Form (Debounced)
      if (event.target.closest('#profile-form')) {
        _debouncedProfileUpdate(event.target.closest('#profile-form'));
      }

      // Recipe Builder Form (Debounced)
      const recipeForm = event.target.closest('#recipe-form');
      if (recipeForm && event.target.name === 'recipeName') {
        _debouncedRecipeUpdate(recipeForm);
      }

      // Recipe Servings Input
      if (
        event.target.id === 'recipe-servings-input' &&
        !event.target.readOnly
      ) {
        const validServings = validateServings(event.target.value);
        const recipeId = event.target.dataset.recipeId;
        const currentServings = state.ui.recipeEditor?.raciones;

        // Auto-corrección
        if (parseInt(event.target.value) !== validServings) {
          event.target.value = validServings;
        }

        // Optimización: solo despachar si hay cambios reales
        if (recipeId && currentServings !== validServings) {
          dispatch({
            type: 'UPDATE_RECIPE_SERVINGS',
            payload: { recipeId, servings: validServings },
          });
          // Dispatch triggers re-render automatically.
        }
      }
    });

    container.addEventListener('keydown', (event) => {
      // Tag input handling (Item Detail View)
      if (event.target.name === 'newTag' && event.key === 'Enter') {
        event.preventDefault(); // CRÍTICO: Prevenir el envío del formulario
        const newTagInput = event.target;
        const tagContainer = newTagInput.closest('#item-tags-container');
        const newTagValue = newTagInput.value.trim();

        if (newTagValue) {
          // Crear span con botón de borrado para la nueva etiqueta
          const newTagElement = document.createElement('span');
          newTagElement.setAttribute('data-tag', newTagValue);
          newTagElement.className =
            'bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm flex items-center gap-2';

          const textSpan = document.createElement('span');
          textSpan.className = 'tag-text';
          textSpan.textContent = newTagValue;

          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className =
            'remove-tag-btn text-red-600 hover:text-red-800 ml-2 text-sm';
          removeBtn.setAttribute('data-tag', newTagValue);
          removeBtn.setAttribute('aria-label', 'Eliminar tag');
          removeBtn.textContent = '✕';

          newTagElement.appendChild(textSpan);
          newTagElement.appendChild(removeBtn);

          const existingTags = Array.from(
            tagContainer.querySelectorAll('span[data-tag]')
          ).map((span) => span.dataset.tag);
          if (!existingTags.includes(newTagValue)) {
            tagContainer.insertBefore(newTagElement, newTagInput);
          }

          newTagInput.value = ''; // Limpiar para el siguiente tag
        }
      }
    });

    container.addEventListener('submit', (event) => {
      event.preventDefault();
      const formId = event.target.id;
      const state = getState();

      if (formId === 'planner-assignment-form') {
        const formElements = event.target.elements;
        const id = formElements.consumableId.value;
        const payload = {
          id,
          date: formElements.date.value,
          slot: formElements.slot.value,
          grams: parseFloat(formElements.grams.value) || 0,
        };
        if (payload.id && payload.date && payload.slot && payload.grams > 0) {
          dispatch({ type: 'ASSIGN_ITEM_TO_SLOT', payload });
        }
      } else if (formId === 'recipe-form') {
        const { name, ingredients } = state.ui.recipeBuilder;
        if (name && ingredients.length > 0) {
          const newRecipe = {
            id: `REC-${new Date().getTime()}`,
            name: name,
            ingredients: ingredients,
          };
          dispatch({ type: 'ADD_RECIPE', payload: newRecipe });
          dispatch({ type: 'CLEAR_RECIPE_BUILDER' });

          const notificationAction = {
            type: 'ADD_NOTIFICATION',
            payload: { message: 'Receta guardada con éxito', type: 'success' },
          };
          dispatch(notificationAction);
          const newState = getState(); // Get updated state
          const newNotifications = newState.ui.notifications;
          if (newNotifications.length > 0) {
            const newNotificationId =
              newNotifications[newNotifications.length - 1].id;
            setTimeout(() => {
              dispatch({
                type: 'REMOVE_NOTIFICATION',
                payload: newNotificationId,
              });
            }, 3000);
          }
        }
      } else if (formId === 'add-nutrient-form') {
        const form = event.target;
        const name = form.elements.name.value;
        const unit = form.elements.unit.value;
        if (name && unit) {
          actions.createAndTrackNutrient(name, unit);
          form.reset();
        }
      } else if (formId === 'add-store-form') {
        const form = event.target;
        const storeName = form.elements.storeName.value.trim();
        if (storeName) {
          const newStore = {
            id: `STORE-${storeName.toUpperCase().replace(/\s/g, '_')}-${Date.now()}`,
            name: storeName,
          };
          dispatch({ type: 'ADD_STORE', payload: newStore });
          form.reset();
        }
      } else if (formId === 'add-category-form') {
        const form = event.target;
        const categoryName = form.elements.categoryName.value.trim();
        if (categoryName) {
          const newCategory = {
            id: `CAT-${categoryName.toUpperCase().replace(/\s/g, '_')}-${Date.now()}`,
            name: categoryName,
          };
          dispatch({ type: 'ADD_CATEGORY', payload: newCategory });
          form.reset();
        }
      }
      // Note: 'item-detail-form' submission is handled by the 'back-to-library-btn' click handler when editing.
    });

    container.addEventListener('change', (event) => {
      const state = getState();
      if (event.target.id === 'profile-selector') {
        _debouncedProfileUpdate.cancel();
        const confirmBtn = container.querySelector('#confirm-profile-change');
        if (event.target.value !== state.ui.activeProfileId) {
          confirmBtn.classList.remove('hidden');
        } else {
          confirmBtn.classList.add('hidden');
        }
      }
      if (event.target.matches('.nutrient-toggle')) {
        const activeProfile = state.profiles.byId[state.ui.activeProfileId];
        let trackedNutrients = [...(activeProfile.trackedNutrients || [])];
        const nutrientId = event.target.value;
        if (event.target.checked) {
          if (!trackedNutrients.includes(nutrientId)) {
            trackedNutrients.push(nutrientId);
          }
        } else {
          trackedNutrients = trackedNutrients.filter((id) => id !== nutrientId);
        }
        // ORDENAR PARA MANTENER LA CONSISTENCIA
        const nutrientDefinitions = state.items.byId;
        trackedNutrients.sort((a, b) =>
          nutrientDefinitions[a].name.localeCompare(nutrientDefinitions[b].name)
        );
        dispatch({
          type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
          payload: {
            profileId: state.ui.activeProfileId,
            nutrients: trackedNutrients,
          },
        });
      }
    });

    // --- Drag and Drop Handlers (Nutrient Manager) ---
    const nutrientManager = container.querySelector('#nutrient-manager-list');
    if (nutrientManager) {
      let draggedElementId = null;
      let currentDragOverElement = null;

      nutrientManager.addEventListener('dragstart', (event) => {
        const target = event.target.closest(
          '[data-nutrient-id][draggable="true"]'
        );
        if (target) {
          draggedElementId = target.dataset.nutrientId;
          event.dataTransfer.setData('text/plain', draggedElementId);
          setTimeout(() => target.classList.add('dragging'), 0);
        }
      });

      nutrientManager.addEventListener('dragend', (event) => {
        if (currentDragOverElement) {
          currentDragOverElement.classList.remove(
            'drag-over-top',
            'drag-over-bottom'
          );
        }
        const target = event.target.closest('[data-nutrient-id]');
        if (target) {
          target.classList.remove('dragging');
        }
        draggedElementId = null;
        currentDragOverElement = null;
      });

      nutrientManager.addEventListener('dragover', (event) => {
        event.preventDefault();
        const target = event.target.closest(
          '[data-nutrient-id][draggable="true"]'
        );

        if (target && target.dataset.nutrientId !== draggedElementId) {
          if (currentDragOverElement && currentDragOverElement !== target) {
            currentDragOverElement.classList.remove(
              'drag-over-top',
              'drag-over-bottom'
            );
          }
          currentDragOverElement = target;

          const rect = target.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (event.clientY < midpoint) {
            target.classList.add('drag-over-top');
            target.classList.remove('drag-over-bottom');
          } else {
            target.classList.add('drag-over-bottom');
            target.classList.remove('drag-over-top');
          }
        } else if (!target) {
          const lastElement = nutrientManager.querySelector(
            '[data-nutrient-id][draggable="true"]:last-child'
          );
          if (lastElement) {
            if (
              currentDragOverElement &&
              currentDragOverElement !== lastElement
            ) {
              currentDragOverElement.classList.remove(
                'drag-over-top',
                'drag-over-bottom'
              );
            }
            lastElement.classList.add('drag-over-bottom');
            lastElement.classList.remove('drag-over-top');
            currentDragOverElement = lastElement;
          }
        }
      });

      nutrientManager.addEventListener('dragleave', (event) => {
        if (
          event.relatedTarget === null ||
          !nutrientManager.contains(event.relatedTarget)
        ) {
          if (currentDragOverElement) {
            currentDragOverElement.classList.remove(
              'drag-over-top',
              'drag-over-bottom'
            );
            currentDragOverElement = null;
          }
        }
      });

      nutrientManager.addEventListener('drop', (event) => {
        event.preventDefault();
        const state = getState();
        const droppedOnElement = event.target.closest(
          '[data-nutrient-id][draggable="true"]'
        );

        if (currentDragOverElement) {
          currentDragOverElement.classList.remove(
            'drag-over-top',
            'drag-over-bottom'
          );
        }

        if (!droppedOnElement && draggedElementId) {
          const activeProfile = state.profiles.byId[state.ui.activeProfileId];
          if (!activeProfile) return;

          const originalTracked = [...activeProfile.trackedNutrients];
          const itemToMove = originalTracked.find(
            (id) => id === draggedElementId
          );
          if (!itemToMove) return;

          const temporaryTracked = originalTracked.filter(
            (id) => id !== draggedElementId
          );
          temporaryTracked.push(itemToMove);

          dispatch({
            type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
            payload: {
              profileId: state.ui.activeProfileId,
              nutrients: temporaryTracked,
            },
          });
          draggedElementId = null;
          return;
        }

        if (
          !droppedOnElement ||
          !draggedElementId ||
          draggedElementId === droppedOnElement.dataset.nutrientId
        ) {
          return;
        }

        const activeProfile = state.profiles.byId[state.ui.activeProfileId];
        if (!activeProfile) return;

        const isDroppingOnBottomHalf =
          droppedOnElement.classList.contains('drag-over-bottom');

        const originalTracked = [...activeProfile.trackedNutrients];
        const itemToMove = originalTracked.find(
          (id) => id === draggedElementId
        );
        if (!itemToMove) return;

        const temporaryTracked = originalTracked.filter(
          (id) => id !== draggedElementId
        );
        const dropTargetId = droppedOnElement.dataset.nutrientId;
        let newDropIndex = temporaryTracked.indexOf(dropTargetId);

        if (isDroppingOnBottomHalf) {
          temporaryTracked.splice(newDropIndex + 1, 0, itemToMove);
        } else {
          temporaryTracked.splice(newDropIndex, 0, itemToMove);
        }

        dispatch({
          type: 'UPDATE_PROFILE_TRACKED_NUTRIENTS',
          payload: {
            profileId: state.ui.activeProfileId,
            nutrients: temporaryTracked,
          },
        });

        draggedElementId = null;
      });
    }

    container.dataset.mainDelegateAttached = 'true';
  }

  // Post-render updates (ensure draggable status is correct)
  const state = getState();
  const nutrientManagerList = container.querySelector('#nutrient-manager-list');
  if (nutrientManagerList) {
    const activeProfile = state.profiles.byId[state.ui.activeProfileId];
    const trackedNutrients = activeProfile?.trackedNutrients || [];

    const allNutrientDivs =
      nutrientManagerList.querySelectorAll('[data-nutrient-id]');
    allNutrientDivs.forEach((div) => {
      const nutrientId = div.dataset.nutrientId;
      const shouldBeDraggable = trackedNutrients.includes(nutrientId);
      const isCurrentlyDraggable = div.getAttribute('draggable') === 'true';

      if (shouldBeDraggable && !isCurrentlyDraggable) {
        div.setAttribute('draggable', 'true');
      } else if (!shouldBeDraggable && isCurrentlyDraggable) {
        div.setAttribute('draggable', 'false');
      }
    });
  }
}
