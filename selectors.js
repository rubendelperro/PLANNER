import {
  aggregateNutritionalVectors,
  PRECISION_FACTOR,
  SLOTS,
  getNutrientVectorForPlannedItem as utilGetNutrientVectorForPlannedItem,
  getWeekDates,
} from './utils.js';

// Dependency Injection container for the state accessor
let getState = () => ({});

export function initializeSelectors(getStateFn) {
  getState = getStateFn;
}

const _memoizationCache = {
  weekAnalysis: { signature: null, result: null },
  aggregatedAnalysis: { signature: null, result: null },
};

// ======== MOTOR OPTIMIZADO DE CÁLCULOS ========
export function calculateRecipeTotals(recipe, itemsById) {
  if (!recipe || !recipe.ingredients) {
    return { computedTotals: {}, totalGrams: 0 };
  }
  const ingredientIds = recipe.ingredients.map((ri) => ri.ingredientId);
  const vectors = recipe.ingredients
    .map((ri) => {
      const fullIngredient = itemsById[ri.ingredientId];
      if (!fullIngredient) {
        return null;
      }
      return getNutritionalVectorForItem(fullIngredient, ri.grams, 'gramos');
    })
    .filter(Boolean);

  const totalsInt = aggregateNutritionalVectors(vectors);
  const computedTotals = {};
  for (const key in totalsInt) {
    computedTotals[key] = totalsInt[key] / PRECISION_FACTOR;
  }
  const totalGrams = recipe.ingredients.reduce(
    (sum, ing) => sum + ing.grams,
    0
  );

  // Debugging is gated behind a global flag to avoid noisy output in CI/runs.
  // No-op: diagnostic logging removed in cleanup

  return { computedTotals, totalGrams };
}

export function calculateBaseTargets(profile) {
  const state = getState();
  // La lógica para calcular bmr, tdee y targetCalories es correcta y se mantiene
  if (
    !profile ||
    profile.isDefault ||
    !profile.age ||
    !profile.weight ||
    !profile.height ||
    !profile.gender ||
    !profile.activityLevel ||
    !profile.goal
  ) {
    return {};
  }
  const { age, weight, height, gender, activityLevel, goal } = profile;
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
    very_high: 1.9,
  };
  const goalAdjustments = { lose: 0.85, maintain: 1.0, gain: 1.15 };
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = bmr * activityMultipliers[activityLevel];
  const targetCalories = Math.round(tdee * goalAdjustments[goal]);

  // --- LÓGICA RECONSTRUIDA ---

  const referenceGuide = state.referenceGuides.byId[profile.referenceSourceId];
  const referenceCalories = referenceGuide?.nutrients?.calories || 2000;

  // 1. Calcular el Factor de Escalado
  const scalingFactor = targetCalories / referenceCalories;

  // 2. Crear base de objetivos escalando TODOS los nutrientes de la guía
  const scaledTargets = {};
  if (referenceGuide && referenceGuide.nutrients) {
    for (const nutrientId in referenceGuide.nutrients) {
      scaledTargets[nutrientId] =
        referenceGuide.nutrients[nutrientId] * scalingFactor;
    }
  }

  // 3. Calcular macros con su lógica de porcentajes específica
  let proteinGrams, fatGrams, carbGrams;
  if (goal === 'lose') {
    proteinGrams = Math.round((targetCalories * 0.4) / 4);
    fatGrams = Math.round((targetCalories * 0.3) / 9);
    carbGrams = Math.round((targetCalories * 0.3) / 4);
  } else if (goal === 'gain') {
    proteinGrams = Math.round((targetCalories * 0.3) / 4);
    fatGrams = Math.round((targetCalories * 0.25) / 9);
    carbGrams = Math.round((targetCalories * 0.45) / 4);
  } else {
    // maintain
    proteinGrams = Math.round((targetCalories * 0.3) / 4);
    fatGrams = Math.round((targetCalories * 0.3) / 9);
    carbGrams = Math.round((targetCalories * 0.4) / 4);
  }
  const macroTargets = {
    calories: targetCalories,
    proteins: proteinGrams,
    fats: fatGrams,
    carbs: carbGrams,
  };

  // 4. Fusionar, dando prioridad a los macros
  return { ...scaledTargets, ...macroTargets };
}

export function getActiveNutritionalTargets() {
  const state = getState();
  const activeProfile = state.profiles.byId[state.ui.activeProfileId];
  if (!activeProfile) return {};

  // --- INICIO DE LA CORRECCIÓN ---
  // La fuente de verdad AHORA es el array trackedNutrients.
  const trackedNutrients = activeProfile.trackedNutrients || [];
  const referenceGuide =
    state.referenceGuides.byId[activeProfile.referenceSourceId];

  let baseTargets = {};
  if (!activeProfile.isDefault) {
    baseTargets = calculateBaseTargets(activeProfile);
  } else {
    baseTargets = referenceGuide ? { ...referenceGuide.nutrients } : {};
  }

  const finalTargets = {};
  // El bucle AHORA itera sobre los nutrientes que el usuario quiere ver.
  for (const nutrientId of trackedNutrients) {
    const baseValue = baseTargets[nutrientId];
    const personalValue = activeProfile.personalGoals
      ? activeProfile.personalGoals[nutrientId]
      : undefined;

    if (personalValue !== undefined) {
      finalTargets[nutrientId] = {
        finalValue: personalValue,
        baseValue: baseValue,
        source: 'personal',
        sourceName: referenceGuide?.name,
      };
    } else if (baseValue !== undefined) {
      finalTargets[nutrientId] = {
        finalValue: baseValue,
        baseValue: baseValue,
        source: !activeProfile.isDefault ? 'calculated' : 'reference',
        sourceName: referenceGuide?.name,
      };
    }
    // Si no hay valor base ni personal, no se añade nada. Correcto.
  }

  return finalTargets;
  // --- FIN DE LA CORRECCIÓN ---
}

export function getRecipeWithDetails(itemId) {
  const state = getState();
  const item = state.items.byId[itemId];
  if (!item || item.itemType !== 'receta' || !item.computed) {
    return null;
  }

  return {
    ...item,
    totals: item.computed.totals,
    totalGrams: item.computed.totalGrams,
  };
}

// Adapter to connect utils.getNutrientVectorForPlannedItem with the local getNutritionalVectorForItem
function getNutrientVectorForPlannedItem(plannedItem, state) {
  return utilGetNutrientVectorForPlannedItem(
    plannedItem,
    state,
    getNutritionalVectorForItem
  );
}

export function getPlannerDayTotals(date) {
  const state = getState();
  const dayPlan = state.planner[date];
  if (!dayPlan) return {};

  const vectorsToAggregate = [];
  for (const slot of SLOTS) {
    if (dayPlan[slot]) {
      for (const plannedItem of dayPlan[slot]) {
        const vector = getNutrientVectorForPlannedItem(plannedItem, state);
        if (vector) {
          vectorsToAggregate.push(vector);
        }
      }
    }
  }
  const result = aggregateNutritionalVectors(vectorsToAggregate);
  return result;
}

export function getDayAnalysis(date) {
  const state = getState();
  const dayTotalsInt = getPlannerDayTotals(date);
  const activeTargets = getActiveNutritionalTargets();
  const activeProfile = state.profiles.byId[state.ui.activeProfileId];

  const trackedNutrients = activeProfile ? activeProfile.trackedNutrients : [];
  if (!trackedNutrients || trackedNutrients.length === 0) return [];

  const analysis = [];
  for (const nutrientId of trackedNutrients) {
    const definition = state.items.byId[nutrientId];
    if (!definition) continue;

    const value = (dayTotalsInt[nutrientId] || 0) / PRECISION_FACTOR;
    const targetInfo = activeTargets[nutrientId];
    const targetValue = targetInfo ? targetInfo.finalValue : null;

    const percentage =
      targetValue != null && targetValue > 0
        ? Math.min(100, Math.round((value / targetValue) * 100))
        : 0;

    let status = 'info';
    if (targetValue != null) {
      if (value > targetValue * 1.1) status = 'danger';
      else if (percentage >= 90) status = 'success';
      else status = 'warning';
    }

    analysis.push({
      nutrientId,
      name: definition.name,
      unit: definition.unit,
      value: parseFloat(value.toFixed(2)),
      target: targetValue != null ? parseFloat(targetValue.toFixed(2)) : null,
      percentage,
      status,
    });
  }
  return analysis;
}

export function getWeekAnalysis() {
  const state = getState();
  const { ui, planner, items } = state;

  const weekDates = getWeekDates(new Date(ui.activePlannerDay || new Date()));
  const weekPlannerData = {};
  for (const date of weekDates) {
    const dateString = date.toISOString().split('T')[0];
    if (planner[dateString]) {
      weekPlannerData[dateString] = planner[dateString];
    }
  }

  const signature =
    `${ui.activePlannerDay}-${ui.activeProfileId}-` +
    `${items.allIds.length}-` +
    JSON.stringify(weekPlannerData);

  if (
    _memoizationCache.weekAnalysis &&
    _memoizationCache.weekAnalysis.signature === signature
  ) {
    return _memoizationCache.weekAnalysis.result;
  }

  const result = {};
  for (const date of weekDates) {
    const dateString = date.toISOString().split('T')[0];
    result[dateString] = getDayAnalysis(dateString);
  }
  _memoizationCache.weekAnalysis = { signature, result };
  return result;
}

export function getShoppingList() {
  const state = getState();
  const { planner, items, stores } = state;
  const requiredIngredients = new Map();

  for (const date in planner) {
    for (const slot of SLOTS) {
      if (planner[date][slot]) {
        for (const plannedItem of planner[date][slot]) {
          const itemDetails = items.byId[plannedItem.id];
          if (!itemDetails) continue;

          if (itemDetails.itemType === 'receta') {
            const baseRecipeGrams = itemDetails.computed.totalGrams;
            if (baseRecipeGrams <= 0) continue;
            const scalingFactor = plannedItem.grams / baseRecipeGrams;
            for (const recipeIngredient of itemDetails.ingredients) {
              const requiredAmount = recipeIngredient.grams * scalingFactor;
              const currentAmount =
                requiredIngredients.get(recipeIngredient.ingredientId) || 0;
              requiredIngredients.set(
                recipeIngredient.ingredientId,
                currentAmount + requiredAmount
              );
            }
          } else if (itemDetails.itemType === 'ingrediente') {
            const currentAmount = requiredIngredients.get(plannedItem.id) || 0;
            requiredIngredients.set(
              plannedItem.id,
              currentAmount + plannedItem.grams
            );
          }
        }
      }
    }
  }

  const categorizedList = {
    'Sin Asignar': [],
    'Elección Múltiple': [],
  };

  for (const [ingredientId, totalGrams] of requiredIngredients.entries()) {
    const ingredientDetails = items.byId[ingredientId];
    if (ingredientDetails) {
      const itemForList = {
        ...ingredientDetails,
        totalGrams: parseFloat(totalGrams.toFixed(2)),
      };
      const storeIds = ingredientDetails.logistics.preferredStoreIds || [];

      if (storeIds.length === 0) {
        categorizedList['Sin Asignar'].push(itemForList);
      } else if (storeIds.length === 1) {
        const storeName = stores.byId[storeIds[0]].name;
        if (!categorizedList[storeName]) {
          categorizedList[storeName] = [];
        }
        categorizedList[storeName].push(itemForList);
      } else {
        categorizedList['Elección Múltiple'].push(itemForList);
      }
    }
  }

  return categorizedList;
}

export function getAggregatedAnalysis() {
  const state = getState();
  const { ui, planner } = state;
  const { selectedCells, activePlannerDay } = ui;

  if (!selectedCells || selectedCells.size === 0) {
    return [];
  }

  const vectorsToAggregate = [];
  for (const id of selectedCells) {
    const [date, slot] = id.split('/');
    const dayPlan = planner[date];
    if (dayPlan && dayPlan[slot]) {
      for (const plannedItem of dayPlan[slot]) {
        const vector = getNutrientVectorForPlannedItem(plannedItem, state);
        if (vector) {
          vectorsToAggregate.push(vector);
        }
      }
    }
  }
  const aggregatedTotalsInt = aggregateNutritionalVectors(vectorsToAggregate);

  const dailyTargets = getActiveNutritionalTargets();
  const activeProfile = state.profiles.byId[state.ui.activeProfileId];
  const trackedNutrients = activeProfile ? activeProfile.trackedNutrients : [];
  if (!trackedNutrients || trackedNutrients.length === 0) return [];

  let targetMultiplier;
  if (ui.nexusView === 'week') {
    targetMultiplier = 7;
  } else {
    // 'month'
    const activeDate = new Date(activePlannerDay);
    const year = activeDate.getFullYear();
    const month = activeDate.getMonth();
    targetMultiplier = new Date(year, month + 1, 0).getDate();
  }

  const finalAnalysis = [];
  for (const nutrientId of trackedNutrients) {
    const definition = state.items.byId[nutrientId];
    if (!definition) continue;

    const value = (aggregatedTotalsInt[nutrientId] || 0) / PRECISION_FACTOR;

    const targetInfo = dailyTargets[nutrientId];
    const dailyTargetValue = targetInfo ? targetInfo.finalValue : null;

    const adjustedTarget =
      dailyTargetValue != null ? dailyTargetValue * targetMultiplier : null;

    const percentage =
      adjustedTarget != null && adjustedTarget > 0
        ? Math.min(100, Math.round((value / adjustedTarget) * 100))
        : 0;

    let status = 'info';
    if (adjustedTarget != null) {
      if (value > adjustedTarget * 1.1) status = 'danger';
      else if (percentage >= 90) status = 'success';
      else status = 'warning';
    }

    finalAnalysis.push({
      nutrientId,
      name: definition.name,
      unit: definition.unit,
      value: parseFloat(value.toFixed(2)),
      target:
        adjustedTarget != null ? parseFloat(adjustedTarget.toFixed(2)) : null,
      percentage,
      status,
    });
  }

  return finalAnalysis;
}

export function getInferredItemMetrics(itemId) {
  const state = getState();
  const item = state.items.byId[itemId];
  if (
    !item ||
    !item.logistics ||
    !item.logistics.purchaseInfo ||
    !item.logistics.price ||
    !item.logistics.purchaseInfo.packageValue > 0
  ) {
    return null;
  }
  const { purchaseInfo, price } = item.logistics;
  const gramsPerUnit = purchaseInfo.packageValue / purchaseInfo.servingCount;

  return {
    pricePerGram: price.value / purchaseInfo.packageValue,
    pricePerUnit: price.value / purchaseInfo.servingCount,
    gramsPerUnit: gramsPerUnit,
    unitsPerServing: item.nutrients.servingSizeGrams / gramsPerUnit,
  };
}

export function getNutritionalVectorForItem(item, amount, unit = 'gramos') {
  // Check if item exists and has nutrients (for ingredients) or computed totals (for recipes)
  if (!item) {
    return null;
  }

  if (item.itemType === 'ingrediente' && !item.nutrients) {
    return null;
  }

  if (item.itemType === 'receta' && (!item.computed || !item.computed.totals)) {
    return null;
  }

  let totalGrams = 0;
  if (unit === 'gramos') {
    totalGrams = amount;
  } else if (unit === 'unidades') {
    const metrics = getInferredItemMetrics(item.id);
    if (metrics && metrics.gramsPerUnit) {
      totalGrams = amount * metrics.gramsPerUnit;
    }
  }

  if (totalGrams === 0) return { nutrients: {} };

  let scalingFactor = 1;
  if (item.itemType === 'ingrediente') {
    scalingFactor = totalGrams / 100;
  } else if (
    item.itemType === 'receta' &&
    item.computed &&
    item.computed.totalGrams > 0
  ) {
    scalingFactor = totalGrams / item.computed.totalGrams;
  }

  const scaledNutrients = {};
  const sourceNutrients =
    item.itemType === 'receta' ? item.computed.totals : item.nutrients;

  for (const nutrientId in sourceNutrients) {
    scaledNutrients[nutrientId] = sourceNutrients[nutrientId] * scalingFactor;
  }

  return { nutrients: scaledNutrients };
}

export function findDependentRecipes(itemId) {
  const state = getState();
  return state.items.allIds
    .map((id) => state.items.byId[id])
    .filter(
      (item) =>
        item.itemType === 'receta' &&
        item.ingredients?.some((ing) => ing.ingredientId === itemId)
    )
    .map((recipe) => recipe.name);
}
