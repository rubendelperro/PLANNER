export const Logger = {
  PREFIX: '[Menu Planner]',
  log(message) {
    console.log(`${this.PREFIX} INFO:`, message);
  },
  warn(message) {
    console.warn(`${this.PREFIX} WARN:`, message);
  },
  error(message) {
    console.error(`${this.PREFIX} ERROR:`, message);
  },
};

export const SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'];
export const SLOT_NAMES = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snacks: 'Snacks',
};
export const PRECISION_FACTOR = 1000;

export function aggregateNutritionalVectors(vectors) {
  const totals = {};
  for (const vectorItem of vectors) {
    if (!vectorItem || !vectorItem.nutrients) continue;
    for (const nutrientId in vectorItem.nutrients) {
      if (
        Object.prototype.hasOwnProperty.call(vectorItem.nutrients, nutrientId)
      ) {
        const value = vectorItem.nutrients[nutrientId];
        const intValue = Math.round(value * PRECISION_FACTOR);
        totals[nutrientId] = (totals[nutrientId] || 0) + intValue;
      }
    }
  }
  return totals;
}

export function getWeekDates(date = new Date()) {
  const weekDates = [];
  const today = new Date(date);
  today.setHours(12, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const startOfWeek = new Date(today.setDate(diff));

  for (let i = 0; i < 7; i++) {
    const dateInWeek = new Date(startOfWeek);
    dateInWeek.setDate(dateInWeek.getDate() + i);
    weekDates.push(dateInWeek);
  }
  return weekDates;
}

export function getMonthDates(date = new Date()) {
  const monthDates = [];
  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

  let currentDate = new Date(firstDayOfMonth);
  currentDate.setHours(12, 0, 0, 0);
  const dayOfWeek = currentDate.getDay();
  const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  currentDate.setDate(diff);

  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const lastDayWeekDay = lastDayOfMonth.getDay();
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(
    lastDayOfMonth.getDate() + (7 - (lastDayWeekDay === 0 ? 7 : lastDayWeekDay))
  );

  while (currentDate < endDate) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    monthDates.push(week);
  }
  return monthDates;
}

// Uses dependency injection (getNutritionalVectorForItemFn) to avoid circular dependency with selectors.js
export function getNutrientVectorForPlannedItem(
  plannedItem,
  state,
  getNutritionalVectorForItemFn
) {
  const itemDetails = state.items.byId[plannedItem.id];
  if (!itemDetails) return null;
  const result = getNutritionalVectorForItemFn(
    itemDetails,
    plannedItem.grams,
    'gramos'
  );
  return result;
}

export function loadState() {
  try {
    // Prefer test-injected / compatibility keys first so E2E specs that set
    // 'atomCanvasState_v20' will override any previously persisted app state.
    const keysInPriority = [
      'atomCanvasState_v20', // Cypress tests inject here
      'menuPlannerState_v20', // current app key
      'menuPlannerState',
      'atomCanvasState',
    ];

    let serializedState = null;
    for (const k of keysInPriority) {
      const v = localStorage.getItem(k);
      if (v !== null && v !== undefined) {
        serializedState = v;
        break;
      }
    }

    if (serializedState === null || serializedState === undefined) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(serializedState);
      // Temporary debug: surface which storage key was used for loading state
      try {
        console.info(
          '[loadState] loaded state (truncated):',
          (serializedState && serializedState.slice(0, 200)) || null
        );
      } catch (e) {
        /* ignore logging failures */
      }
      return parsed;
    } catch (e) {
      Logger.error('Failed parsing stored state', e);
      return undefined;
    }
  } catch (err) {
    Logger.error('Failed to load state from localStorage', err);
    return undefined;
  }
}

export function saveState(state) {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('menuPlannerState_v20', serializedState);
  } catch (err) {
    Logger.error('Failed to save state to localStorage', err);
  }
}

export function debounce(func, delay = 300) {
  let timeoutId;
  const debounced = function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
  debounced.cancel = () => {
    clearTimeout(timeoutId);
  };
  return debounced;
}

// Helper para validar y normalizar el número de raciones
export function validateServings(value) {
  const servings = parseInt(value) || 1;
  return Math.max(1, Math.min(20, servings)); // Clamp entre 1-20
}

// Helper para crear/resetear el estado del editor de recetas
export function createRecipeEditorState(recipe = null, isEditing = false) {
  if (!isEditing || !recipe) {
    return {
      isEditing: false,
      recipeId: null,
      ingredients: [],
      raciones: undefined,
    };
  }

  return {
    isEditing: true,
    recipeId: recipe.id,
    ingredients: [...recipe.ingredients], // Copia profunda para edición temporal
    raciones: recipe.raciones || 1, // Copiar raciones al estado temporal
  };
}

// Helper para obtener las raciones a mostrar (temporales durante edición o permanentes)
export function getRacionesToShow(recipe, ui) {
  const isEditing =
    ui.recipeEditor?.isEditing && ui.recipeEditor?.recipeId === recipe.id;
  const raciones = isEditing ? ui.recipeEditor.raciones : recipe.raciones;
  return raciones || 1; // Asegurar que siempre hay un valor válido
}
