import {
  SLOTS,
  SLOT_NAMES,
  PRECISION_FACTOR,
  getWeekDates,
  getMonthDates,
  getRacionesToShow,
} from './utils.js';
import * as selectors from './selectors.js';
import { attachEventListeners } from './events.js';
import { renderNutrientManager } from './components/NutrientManager.js';
import { renderControlCenter } from './components/ControlCenter.js';
import { renderStoreManager } from './components/StoreManager.js';
import { renderCategoryManager } from './components/CategoryManager.js';
import { renderCategoriesField } from './components/CategoryManager.js';
import { renderStoresField } from './components/StoreManager.js';

// Dependency Injection container for the state accessor
let getState = () => ({});

export function initializeRenderer(getStateFn) {
  getState = getStateFn;
}

// --- Módulo: Centro de Mando + Panel de Objetivos ---
function _renderControlCenter(state) {
  // Delegate rendering to the extracted component to keep render.js thin.
  return renderControlCenter(state);
}

// Nutrient manager extracted to components/NutrientManager.js

const renderFunctions = {
  renderSettingsView(state) {
    // Mostrar Centro de Mando, Gestor de Nutrientes y Gestor de Supermercados en 'Mis Ajustes'
    // Cada módulo se envuelve en su propia columna para mantenerlos visualmente separados.
    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="col-span-1">${_renderControlCenter(state)}</div>
            <div class="col-span-1">${renderNutrientManager(state)}</div>
            <div class="col-span-1">${_renderStoreManager(state)}</div>
        </div>
        <div class="mt-6">
            ${_renderCategoryManager(state)}
        </div>
    `;
  },
};

// --- Render Helper Functions ---

function _renderNexusHeader(ui) {
  const { nexusView, activePlannerDay } = ui;
  let title;

  if (nexusView === 'week') {
    const weekDates = getWeekDates(new Date(activePlannerDay || new Date()));
    const startOfWeek = weekDates[0];
    const endOfWeek = weekDates[6];
    const formatMonth = (date) =>
      date.toLocaleDateString('es-ES', { month: 'short' });
    title = `Semana del ${startOfWeek.getDate()} ${formatMonth(startOfWeek)} al ${endOfWeek.getDate()} ${formatMonth(endOfWeek)}, ${endOfWeek.getFullYear()}`;
  } else {
    // month
    title = new Date(activePlannerDay || new Date()).toLocaleDateString(
      'es-ES',
      { month: 'long', year: 'numeric' }
    );
  }

  return `
        <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
            <div class="flex items-center gap-4">
                <h2 class="text-2xl font-bold">Calendario Analítico Nexus</h2>
                <div class="flex items-center bg-gray-100 rounded-md p-1">
                    <button id="view-week-btn" class="px-3 py-1 text-sm rounded-md ${nexusView === 'week' ? 'bg-white shadow' : ''}">Semana</button>
                    <button id="view-month-btn" class="px-3 py-1 text-sm rounded-md ${nexusView === 'month' ? 'bg-white shadow' : ''}">Mes</button>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button id="go-to-today-btn" class="px-3 py-1 text-sm rounded-md bg-gray-200 hover:bg-gray-300">Hoy</button>
                <button id="clear-selection-btn" class="px-3 py-1 text-sm rounded-md bg-red-200 text-red-800 hover:bg-red-300">Limpiar</button>
            </div>
        </div>
        <div class="flex items-center gap-2 mb-4">
            <button id="prev-${nexusView}-btn" class="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300">&lt;</button>
            <span class="text-lg font-semibold text-gray-700 capitalize">${title}</span>
            <button id="next-${nexusView}-btn" class="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300">&gt;</button>
        </div>`;
}

function _renderNexusMonthCell(
  date,
  currentMonth,
  planner,
  isSelected,
  selectionId,
  consumablesMap
) {
  const isGhostDay = date.getMonth() !== currentMonth;
  const dayPlan = planner[date.toISOString().split('T')[0]];
  const mealItems = dayPlan?.[selectionId.split('/')[1]] || [];

  const cellClasses = `p-1 border-r border-b border-gray-200 text-xs ${isGhostDay ? 'is-ghost-day' : ''}`;
  const buttonClasses = `relative w-full h-full text-left p-1 nexus-cell ${isSelected ? 'is-selected' : ''}`;

  return `
        <div class="${cellClasses}">
            <button class="${buttonClasses}" data-selection-type="cell" data-selection-id="${selectionId}">
                <span class="absolute top-1 right-1 font-semibold">${date.getDate()}</span>
                <div class="mt-4 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                    ${mealItems.map((item) => consumablesMap.get(item.id)?.name || '?').join(', ')}
                </div>
            </button>
        </div>
    `;
}

function _renderNexusWeekGrid(ui, planner, consumablesMap) {
  const { activePlannerDay, selectedCells } = ui;
  const weekDates = getWeekDates(new Date(activePlannerDay || new Date()));

  const allIdsInContext = weekDates.flatMap((date) =>
    SLOTS.map((slot) => `${date.toISOString().split('T')[0]}/${slot}`)
  );
  const allSelected =
    allIdsInContext.length > 0 &&
    allIdsInContext.every((id) => selectedCells.has(id));
  const partialSelected =
    !allSelected && allIdsInContext.some((id) => selectedCells.has(id));
  let toggleAllClass = '';
  if (allSelected) toggleAllClass = 'is-fully-selected';
  else if (partialSelected) toggleAllClass = 'is-partially-selected';

  return `
        <div class="grid grid-cols-8 border-t border-l border-gray-200">
            <div class="font-bold text-center p-2 border-r border-b border-gray-200 bg-gray-50">
                <button class="w-full h-full nexus-cell nexus-toggle-all ${toggleAllClass}" data-selection-type="all" title="Seleccionar/Deseleccionar todo">&#10003;</button>
            </div>
            ${weekDates
              .map((date) => {
                const dateStr = date.toISOString().split('T')[0];
                const allDayCellsSelected = SLOTS.every((slot) =>
                  selectedCells.has(`${dateStr}/${slot}`)
                );
                return `<div class="font-bold text-center p-2 border-r border-b border-gray-200 bg-gray-50">
                    <button class="w-full h-full nexus-cell ${allDayCellsSelected ? 'is-fully-selected' : ''}" data-selection-type="day" data-selection-id="${dateStr}">
                        ${date.toLocaleDateString('es-ES', { weekday: 'short' })} ${date.getDate()}
                    </button>
                </div>`;
              })
              .join('')}

            ${SLOTS.map((slot) => {
              const allSlotCellsSelected = weekDates.every((date) =>
                selectedCells.has(`${date.toISOString().split('T')[0]}/${slot}`)
              );
              return `
                    <div class="font-bold text-left p-2 border-r border-b border-gray-200 bg-gray-50">
                        <button class="w-full h-full text-left nexus-cell ${allSlotCellsSelected ? 'is-fully-selected' : ''}" data-selection-type="slotRow" data-selection-id="${slot}">
                            ${SLOT_NAMES[slot]}
                        </button>
                    </div>
                    ${weekDates
                      .map((date) => {
                        const dateString = date.toISOString().split('T')[0];
                        const dayPlan = planner[dateString];
                        const mealItems = dayPlan?.[slot] || [];
                        const selectionId = `${dateString}/${slot}`;
                        return `<div class="p-2 border-r border-b border-gray-200 text-xs">
                            <button class="w-full h-full text-left nexus-cell ${selectedCells.has(selectionId) ? 'is-selected' : ''}" data-selection-type="cell" data-selection-id="${selectionId}">
                                ${mealItems.map((item) => consumablesMap.get(item.id)?.name || '?').join(', ') || '<span class="italic text-gray-400">Vacío</span>'}
                            </button>
                        </div>`;
                      })
                      .join('')}`;
            }).join('')}
        </div>`;
}

function _renderNexusMonthGrid(ui, planner, consumablesMap) {
  const { activePlannerDay, selectedCells } = ui;
  const monthDatesMatrix = getMonthDates(
    new Date(activePlannerDay || new Date())
  );
  const currentMonth = new Date(activePlannerDay || new Date()).getMonth();

  const allIdsInContext = monthDatesMatrix
    .flat()
    .filter((d) => d.getMonth() === currentMonth)
    .flatMap((date) =>
      SLOTS.map((slot) => `${date.toISOString().split('T')[0]}/${slot}`)
    );
  const allSelected =
    allIdsInContext.length > 0 &&
    allIdsInContext.every((id) => selectedCells.has(id));
  const partialSelected =
    !allSelected && allIdsInContext.some((id) => selectedCells.has(id));
  let toggleAllClass = '';
  if (allSelected) toggleAllClass = 'is-fully-selected';
  else if (partialSelected) toggleAllClass = 'is-partially-selected';

  return `
        <div class="grid grid-cols-8 border-t border-l border-gray-200">
            <div class="font-bold text-center p-2 border-r border-b border-gray-200 bg-gray-50">
                <button class="w-full h-full nexus-cell nexus-toggle-all ${toggleAllClass}" data-selection-type="all" title="Seleccionar/Deseleccionar todo">&#10003;</button>
            </div>
            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
              .map((day, index) => {
                const dayIndex = (index + 1) % 7;

                const isColumnSelected = monthDatesMatrix
                  .flat()
                  .filter(
                    (d) =>
                      d.getDay() === dayIndex && d.getMonth() === currentMonth
                  )
                  .every((d) =>
                    SLOTS.every((slot) =>
                      selectedCells.has(
                        `${d.toISOString().split('T')[0]}/${slot}`
                      )
                    )
                  );

                const buttonClass = `w-full h-full p-2 nexus-cell ${isColumnSelected ? 'is-fully-selected' : ''}`;

                return `<div class="font-bold text-center p-0 border-r border-b border-gray-200 bg-gray-50">
                            <button class="${buttonClass}" data-selection-type="day-column" data-selection-id="${dayIndex}">
                                ${day}
                            </button>
                        </div>`;
              })
              .join('')}

            ${monthDatesMatrix
              .map(
                (week) => `
                ${SLOTS.map((slot) => {
                  const allSlotCellsSelected = week.every((date) => {
                    if (date.getMonth() !== currentMonth) return true;
                    return selectedCells.has(
                      `${date.toISOString().split('T')[0]}/${slot}`
                    );
                  });
                  const noCellsInMonthInRow = week.every(
                    (date) => date.getMonth() !== currentMonth
                  );
                  const headerClass = `w-full h-full text-left nexus-cell ${!noCellsInMonthInRow && allSlotCellsSelected ? 'is-fully-selected' : ''}`;

                  return `
                        <div class="font-bold text-left p-2 border-r border-b border-gray-200 bg-gray-50 flex items-center">
                            <button class="${headerClass}" data-selection-type="slotRow" data-selection-id="${slot}">${SLOT_NAMES[slot]}</button>
                        </div>
                        ${week
                          .map((date) => {
                            const selectionId = `${date.toISOString().split('T')[0]}/${slot}`;
                            const isSelected = selectedCells.has(selectionId);
                            return _renderNexusMonthCell(
                              date,
                              currentMonth,
                              planner,
                              isSelected,
                              selectionId,
                              consumablesMap
                            );
                          })
                          .join('')}
                    `;
                }).join('')}
            `
              )
              .join('')}
        </div>`;
}

function _renderItemActionButtons(isEditing, itemId) {
  const baseClass = 'px-4 py-2 rounded-md text-sm w-[160px]';

  return `
        <div class="flex gap-2">
      <button type="button" id="edit-item-btn-${itemId || 'global'}" class="edit-item-btn ${isEditing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white ${baseClass}">
        ${isEditing ? 'Cancelar Edición' : 'Editar Item'}
            </button>
            <button type="button" id="back-to-library-btn" class="bg-green-600 hover:bg-green-700 text-white ${baseClass}">
                ${isEditing ? 'Guardar y Volver' : 'Volver a Biblioteca'}
            </button>
            <button type="button" id="delete-current-item-btn" data-item-id="${itemId}" class="bg-red-600 hover:bg-red-700 text-white ${baseClass}">
                Eliminar
            </button>
        </div>
    `;
}

function _renderRecipeActionButtons(isEditing, recipeId) {
  const baseClass = 'px-4 py-2 rounded-md text-sm w-[160px]';

  return `
        <div class="flex gap-2">
            <button type="button" id="edit-recipe-btn" class="${isEditing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white ${baseClass}">
                ${isEditing ? 'Cancelar Edición' : 'Editar Ingredientes'}
            </button>
            <button type="button" id="back-to-recipes-btn" class="bg-green-600 hover:bg-green-700 text-white ${baseClass}">
                ${isEditing ? 'Guardar y Volver' : 'Volver a Recetas'}
            </button>
            <button type="button" id="delete-current-recipe-btn" data-recipe-id="${recipeId}" class="bg-red-600 hover:bg-red-700 text-white ${baseClass}">
                Eliminar
            </button>
        </div>
    `;
}

function _renderRecipeIngredient(
  ingredient,
  index,
  items,
  isEditing,
  totalGrams
) {
  const ingredientData = items.byId[ingredient.ingredientId];

  if (!ingredientData) {
    return `
            <div class="bg-red-50 border border-red-200 p-3 rounded-md ${isEditing ? 'flex justify-between items-center' : ''}">
                <span class="text-red-600">❌ Ingrediente no encontrado: ${ingredient.ingredientId}</span>
                ${isEditing ? `<button type="button" class="remove-ingredient-btn text-red-600 hover:text-red-800" data-index="${index}">Eliminar</button>` : ''}
            </div>
        `;
  }

  const percentage =
    totalGrams > 0 ? ((ingredient.grams / totalGrams) * 100).toFixed(1) : 0;

  return `
        <div class="bg-white border border-gray-200 p-4 rounded-md">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${ingredientData.name}</h4>
                    <div class="flex items-center gap-4 mt-2">
                        ${
                          isEditing
                            ? `
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-600">Cantidad:</label>
                                <input type="number"
                                       class="ingredient-grams-input w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                       value="${ingredient.grams}"
                                       min="0"
                                       step="0.1"
                                       data-index="${index}">
                                <span class="text-sm text-gray-600">g</span>
                            </div>
                        `
                            : `
                            <span class="text-gray-600">${ingredient.grams}g</span>
                        `
                        }
                        <span class="text-sm text-gray-500">(${percentage}% del total)</span>
                    </div>
                </div>
                ${
                  isEditing
                    ? `
                    <button type="button" class="remove-ingredient-btn text-red-600 hover:text-red-800 ml-4" data-index="${index}">
                        🗑️
                    </button>
                `
                    : ''
                }
            </div>
        </div>
    `;
}

// Sección 'Stock' eliminada: el contenido y el helper han sido suprimidos para simplificar las fichas de ingredientes.

function _renderPriceField(item, isEditing) {
  if (isEditing) {
    return `
            <div class="mt-1 flex gap-2">
                <input type="number" name="priceValue" step="0.01" value="${item.logistics.price.value || ''}" placeholder="Precio" class="block w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
        `;
  } else {
    return `
            <div class="mt-1">
                <div class="text-base text-gray-600">Precio</div>
                <div class="mt-1 text-2xl font-bold text-indigo-600">${item.logistics.price.value ? '€ ' + item.logistics.price.value : '—'}</div>
            </div>
        `;
  }
}

function _renderPackageField(item, isEditing) {
  const grams = item.logistics?.packageGrams || '';
  const units = item.logistics?.unitsPerPackage || '';

  if (isEditing) {
    return `
            <div class="mt-1 grid grid-cols-2 gap-2 items-center">
                <div>
                    <label class="block text-sm text-gray-600">Gramos por paquete</label>
                    <input type="number" name="packageGrams" step="1" min="0" value="${grams}" placeholder="ej: 500" class="block w-full rounded-md border-gray-300 shadow-sm text-sm">
                </div>
                <div>
                    <label class="block text-sm text-gray-600">Unidades por paquete</label>
                    <input type="number" name="unitsPerPackage" step="1" min="0" value="${units}" placeholder="ej: 12" class="block w-full rounded-md border-gray-300 shadow-sm text-sm">
                </div>
            </div>
        `;
  } else {
    if (!grams && !units) {
      return `
                <div class="mt-1 text-sm text-gray-400 italic">Sin información de paquete</div>
            `;
    }

    const parts = [];
    if (grams) parts.push(`${grams} g`);
    if (units) parts.push(`${units} u/paquete`);

    return `
            <div class="mt-1">
                <div class="text-base text-gray-600">Paquete</div>
                <div class="mt-1 text-lg font-semibold text-gray-800">${parts.join(' · ')}</div>
            </div>
        `;
  }
}

function _renderEconomicMetrics(item, isEditing) {
  // Mostrar solo en modo visión (no en edición)
  if (isEditing) return '';

  // Price may be stored as number or string; coerce to number when possible
  const rawPrice = item.logistics?.price?.value;
  const price =
    typeof rawPrice === 'number'
      ? rawPrice
      : rawPrice
        ? parseFloat(rawPrice)
        : undefined;

  // Prefer explicit logistics fields, but fall back to purchaseInfo when present
  const packageGrams =
    item.logistics?.packageGrams ?? item.logistics?.purchaseInfo?.packageValue;
  const units =
    item.logistics?.unitsPerPackage ??
    item.logistics?.purchaseInfo?.servingCount;

  // Necesitamos al menos precio y gramos por paquete para calcular €/kg
  const hasPrice = typeof price === 'number' && !isNaN(price) && price > 0;
  const hasGrams =
    typeof packageGrams === 'number' &&
    !isNaN(packageGrams) &&
    packageGrams > 0;
  const hasUnits = typeof units === 'number' && !isNaN(units) && units > 0;

  if (!hasPrice && !hasGrams && !hasUnits) {
    return `\n            <div class="mt-2 text-sm text-gray-400 italic">Sin información económica</div>\n        `;
  }

  const eurosPerKilo =
    hasPrice && hasGrams ? (price * 1000) / packageGrams : null;
  const eurosPerUnit = hasPrice && hasUnits ? price / units : null;
  const gramsPerUnit = hasGrams && hasUnits ? packageGrams / units : null;

  const fmt = (v, digits = 2) =>
    v == null ? '—' : parseFloat(v).toFixed(digits);

  return `\n        <div class="mt-3 bg-gray-50 p-4 rounded-md border">
            <h4 class="font-semibold text-lg text-gray-800 mb-3">Métricas Económicas</h4>
            <div class="grid grid-cols-1 gap-2 text-gray-700">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">€/kg</span>
                    <span class="text-2xl font-bold text-indigo-600">${eurosPerKilo != null ? '€ ' + fmt(eurosPerKilo, 2) : '—'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">€/unidad</span>
                    <span class="text-xl font-semibold text-indigo-600">${eurosPerUnit != null ? '€ ' + fmt(eurosPerUnit, 3) : '—'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">g / unidad</span>
                    <span class="text-xl font-semibold text-gray-700">${gramsPerUnit != null ? fmt(gramsPerUnit, 0) + ' g' : '—'}</span>
                </div>
            </div>
        </div>\n    `;
}

function _renderItemMetaPanel(
  item,
  isEditing,
  selectedCategoryIds,
  selectedStoreIds,
  stores,
  categories
) {
  // Panel visual refinado: izquierda = Información + Etiquetas; derecha = Economía
  return `
        <div class="bg-white border border-gray-200 p-6 rounded-lg">
            <div class="grid grid-cols-1 gap-4">
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="bg-gray-50 p-6 rounded-lg h-full">
                <h4 class="text-xl font-semibold text-gray-900">Información</h4>
                <div class="mt-4 space-y-4 text-lg text-gray-800">
                                <div>
                    <div class="text-base text-gray-500 mb-1">Categoría</div>
                                    ${_renderCategoriesField(selectedCategoryIds, categories, isEditing)}
                                </div>
                                <div>
                    <div class="text-base text-gray-500 mb-1">Preferencia</div>
                                    ${_renderStoresField(selectedStoreIds, stores, isEditing)}
                                </div>
                                <div>
                    <div class="text-base text-gray-500 mb-1">Etiquetas</div>
                    ${_renderTagsField(item, isEditing)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="w-80">
                        <div class="bg-gray-50 p-6 rounded-lg h-full">
                            <h4 class="text-lg font-semibold text-gray-900">Economía</h4>
                            <div class="mt-4 text-base text-gray-800">
                                ${
                                  isEditing
                                    ? `
                                    <div class="space-y-3">
                                        <div>
                                            <div class="text-sm text-gray-500 mb-1">Precio</div>
                                            ${_renderPriceField(item, isEditing)}
                                        </div>
                                        <div>
                                            <div class="text-sm text-gray-500 mb-1">Paquete</div>
                                            ${_renderPackageField(item, isEditing)}
                                        </div>
                                        ${_renderEconomicMetrics(item, isEditing)}
                                    </div>
                                `
                                    : `
                                    <div class="space-y-3">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm text-gray-600">Precio</span>
                                            <span class="font-semibold">${item.logistics?.price?.value ? '€ ' + item.logistics.price.value : '—'}</span>
                                        </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Peso</span>
                      <span class="font-semibold">${item.logistics?.purchaseInfo?.packageValue ? item.logistics.purchaseInfo.packageValue + ' ' + (item.logistics.purchaseInfo.unit || 'g') : item.logistics?.stock?.value ? item.logistics.stock.value + ' g' : '—'}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Unidades</span>
                      <span class="font-semibold">${item.logistics?.purchaseInfo?.servingCount ?? item.logistics?.unitsPerPackage ?? '—'}</span>
                    </div>
                                        ${_renderEconomicMetrics(item, isEditing)}
                                    </div>
                                `
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function _renderStoresField(selectedStoreIds, stores, isEditing) {
  // Delegate to the StoreManager helper, guard at runtime in case the import
  // was altered by coverage tooling or bundling in CI environments.
  if (typeof renderStoresField === 'function') {
    return renderStoresField(selectedStoreIds, stores, isEditing);
  }
  console.warn(
    'renderStoresField is not available; rendering fallback placeholder'
  );
  return `<div class="text-sm text-gray-500">(Store selector unavailable)</div>`;
}

function _renderStoreManager(state) {
  return renderStoreManager(state);
}

function _renderCategoryManager(state) {
  return renderCategoryManager(state);
}

function _renderCategoriesField(selectedCategoryIds, categories, isEditing) {
  // Delegate to the CategoryManager helper, but guard to avoid uncaught
  // ReferenceErrors in CI when coverage instrumentation may have renamed
  // or removed the function reference.
  if (typeof renderCategoriesField === 'function') {
    return renderCategoriesField(selectedCategoryIds, categories, isEditing);
  }
  console.warn(
    'renderCategoriesField is not available; rendering fallback placeholder'
  );
  if (isEditing) {
    return `<div class="text-sm text-gray-500">(Category selector unavailable)</div>`;
  }
  return `<div class="text-sm text-gray-400 italic">Ninguna categoría disponible</div>`;
}

function _renderTagsField(item, isEditing) {
  if (isEditing) {
    return `
            <div id="item-tags-container" class="mt-1 flex flex-wrap gap-2 items-center">
                ${(item.tags || [])
                  .map(
                    (tag) => `
                    <span data-tag="${tag}" class="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm flex items-center gap-2">
                        <span class="tag-text">${tag}</span>
                        <button type="button" class="remove-tag-btn text-red-600 hover:text-red-800 ml-2 text-sm" data-tag="${tag}" aria-label="Eliminar tag">✕</button>
                    </span>
                `
                  )
                  .join('')}
                <input type="text" name="newTag" placeholder="Añadir tag..." class="flex-grow rounded-md border-gray-300 shadow-sm text-sm">
            </div>
        `;
  } else {
    return `
            <div class="mt-1 flex flex-wrap gap-2 items-center">
                ${(item.tags || []).length > 0 ? (item.tags || []).map((tag) => `<span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-base font-medium">${tag}</span>`).join('') : '<span class="text-sm text-gray-400 italic">Sin tags</span>'}
            </div>
        `;
  }
}

function _renderShoppingList(state) {
  const list = selectors.getShoppingList();
  const categories = Object.keys(list);
  if (categories.every((cat) => list[cat].length === 0)) {
    return `<p class="text-gray-500 text-sm">La lista está vacía.</p>`;
  }

  return categories
    .map((category) => {
      if (list[category].length === 0) return '';
      return `
            <div class="mb-4">
                <h3 class="font-bold text-gray-600 mb-2">${category}</h3>
                <ul class="space-y-2">
                    ${list[category]
                      .map(
                        (item) => `
                        <li class="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <span class="font-medium text-gray-800 text-sm">${item.name}</span>
                            <span class="text-base font-bold text-indigo-600">${item.totalGrams} g</span>
                        </li>
                    `
                      )
                      .join('')}
                </ul>
            </div>
        `;
    })
    .join('');
}

// --- Main View Render Functions ---

function _renderPlannerView() {
  const state = getState();
  const { profiles, ui, items, planner } = state;
  const weekDates = getWeekDates(new Date(ui.activePlannerDay || new Date()));
  // Use imported selectors
  const nexusAnalysis = selectors.getAggregatedAnalysis();
  const consumablesMap = new Map(
    items.allIds.map((id) => [id, items.byId[id]])
  );
  const defaultFormDate =
    ui.activePlannerDay || weekDates[0].toISOString().split('T')[0];
  const activeProfile = profiles.byId[ui.activeProfileId];
  const isDefaultProfileActive = activeProfile?.isDefault;
  const formDisabledState = isDefaultProfileActive ? 'disabled' : '';
  const formDisabledClasses = isDefaultProfileActive
    ? 'disabled:bg-gray-100 disabled:cursor-not-allowed'
    : '';
  const profileError = ui.profileError;
  const trackedIds = activeProfile?.trackedNutrients || [];
  const untrackedIds = items.allIds.filter(
    (id) => items.byId[id].itemType === 'definicion' && !trackedIds.includes(id)
  );
  const orderedNutrientIds = [...trackedIds, ...untrackedIds];

  let nexusTitle = 'Análisis Personalizado';
  if (ui.selectedCells.size > 0) {
    const firstId = Array.from(ui.selectedCells)[0];
    const [date, slot] = firstId.split('/');
    const uniqueDays = new Set(
      Array.from(ui.selectedCells).map((id) => id.split('/')[0])
    );

    if (ui.selectedCells.size === 1) {
      const d = new Date(`${date}T12:00:00`);
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
      nexusTitle = `Análisis: ${dayName} (${SLOT_NAMES[slot]})`;
    } else if (uniqueDays.size === 1) {
      const d = new Date(`${date}T12:00:00`);
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
      nexusTitle = `Análisis: ${dayName} (${ui.selectedCells.size} comidas)`;
    } else {
      nexusTitle = `Análisis Personalizado (${ui.selectedCells.size} items en ${uniqueDays.size} días)`;
    }
  } else {
    nexusTitle = 'Sin Selección';
  }

  const renderNexusCalendar = () => {
    const headerHtml = _renderNexusHeader(ui);
    const gridHtml =
      ui.nexusView === 'week'
        ? _renderNexusWeekGrid(ui, planner, consumablesMap)
        : _renderNexusMonthGrid(ui, planner, consumablesMap);
    return headerHtml + gridHtml;
  };
  function _renderShoppingList(state) {
    const list = selectors.getShoppingList();
    const categories = Object.keys(list);
    if (categories.every((cat) => list[cat].length === 0)) {
      return `<p class="text-gray-500 text-sm">La lista está vacía.</p>`;
    }

    return categories
      .map((category) => {
        if (list[category].length === 0) return '';
        return `
            <div class="mb-4">
                <h3 class="font-bold text-gray-600 mb-2">${category}</h3>
                <ul class="space-y-2">
                    ${list[category]
                      .map(
                        (item) => `
                        <li class="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <span class="font-medium text-gray-800 text-sm">${item.name}</span>
                            <span class="text-base font-bold text-indigo-600">${item.totalGrams} g</span>
                        </li>
                    `
                      )
                      .join('')}
                </ul>
            </div>
        `;
      })
      .join('');
  }

  return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 space-y-8">
        <div id="profile-summary" class="space-y-3 border-b pb-4 mb-8">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-500">Perfil activo</div>
              <div class="text-lg font-semibold">${activeProfile?.name || 'Sin perfil'}</div>
              <div class="text-sm text-gray-600 mt-1">${activeProfile?.age ? activeProfile.age + ' años' : ''} ${activeProfile?.weight ? '· ' + activeProfile.weight + 'kg' : ''} ${activeProfile?.height ? '· ' + activeProfile.height + 'cm' : ''}</div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" data-view="settings" id="edit-profile-quick-btn" class="text-sm bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">Editar Perfil</button>
            </div>
          </div>
          ${profileError ? `<p data-cy="profile-error" style="color:red;">${profileError}</p>` : ''}
        </div>
                <!-- Centro de Mando movido a 'Mis Ajustes' -->
                <!-- Gestor de Nutrientes movido a 'Mis Ajustes' -->
                <!-- Compositor de Recetas movido a la sección 'Recetas' -->
                <!-- Lista de la Compra movida a 'Biblioteca' -->
            </div>
            <div class="lg:col-span-2">
                <div id="planner-container" class="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h2 class="text-2xl font-bold mb-4">Lienzo de Planificación</h2>
                    <form id="planner-assignment-form" class="mb-8 p-4 border rounded-md bg-gray-50 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div class="md:col-span-2"><label for="consumableId" class="block text-sm font-medium text-gray-700">Añadir Comida</label><select name="consumableId" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm">
                            <optgroup label="Recetas">${items.allIds
                              .filter(
                                (id) => items.byId[id].itemType === 'receta'
                              )
                              .map(
                                (id) =>
                                  `<option value="${id}">${items.byId[id].name}</option>`
                              )
                              .join('')}</optgroup>
                            <optgroup label="Ingredientes">${items.allIds
                              .filter(
                                (id) =>
                                  items.byId[id].itemType === 'ingrediente'
                              )
                              .map(
                                (id) =>
                                  `<option value="${id}">${items.byId[id].name}</option>`
                              )
                              .join('')}</optgroup>
                        </select></div>
                        <div><label for="date" class="block text-sm font-medium text-gray-700">Fecha</label><input type="date" name="date" value="${defaultFormDate}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"></div>
                        <div><label for="slot" class="block text-sm font-medium text-gray-700">Franja</label><select name="slot" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm">${SLOTS.map((s) => `<option value="${s}">${SLOT_NAMES[s]}</option>`).join('')}</select></div>
                        <div><label for="grams" class="block text-sm font-medium text-gray-700">Gramos</label><input type="number" min="0" name="grams" placeholder="ej: 150" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"></div>
                        <button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">Asignar</button>
                    </form>
                    <div class="space-y-2 mt-8">
                    ${getWeekDates(new Date(ui.activePlannerDay || new Date()))
                      .map((date) => {
                        const dateString = date.toISOString().split('T')[0];
                        const panelId = `panel-${dateString}`;
                        const isActive = dateString === ui.activePlannerDay;
                        const dayPlan = planner[dateString];
                        const dayAnalysis =
                          selectors.getDayAnalysis(dateString);
                        const statusColors = {
                          success: 'bg-green-500',
                          warning: 'bg-yellow-500',
                          danger: 'bg-red-500',
                          info: 'bg-blue-500',
                        };

                        return `
                        <div class="border rounded-lg overflow-hidden bg-gray-50 shadow-sm">
                            <h3 class="text-lg font-semibold m-0"><button type="button" class="w-full flex justify-between items-center p-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1" data-date="${dateString}" aria-expanded="${isActive}" aria-controls="${panelId}"><span>${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</span><span class="accordion-trigger-icon ${isActive ? 'is-expanded' : ''}">▼</span></button></h3>
                            <div id="${panelId}" class="accordion-content ${isActive ? 'is-expanded' : ''}">
                                <div class="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <h4 class="font-semibold mb-2 text-gray-800">Comidas Planificadas</h4>
                                        <div class="space-y-2 text-sm">
                                        ${SLOTS.map((slot) => {
                                          const itemsInSlot =
                                            dayPlan?.[slot] || [];
                                          return `<div><h5 class="font-bold text-gray-500 capitalize">${SLOT_NAMES[slot]}</h5>${itemsInSlot.length > 0 ? itemsInSlot.map((item, index) => `<p class="pl-2 flex justify-between items-center group">${(consumablesMap.get(item.id) || { name: '?' }).name} <span class="text-gray-500">(${item.grams}g)</span><button class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity ml-2 font-bold text-sm" data-delete-planned-meal data-date="${dateString}" data-slot="${slot}" data-item-id="${item.id}" data-item-index="${index}" title="Eliminar comida">✕</button></p>`).join('') : '<p class="pl-2 text-gray-400 italic">Vacío</p>'}</div>`;
                                        }).join('')}
                                        </div>
                                    </div>
                  <div data-test="daily-control-panel" class="space-y-2 text-sm">
                    ${
                      dayAnalysis.length > 0
                        ? dayAnalysis
                            .map(
                              (nutrient) => `
                  <div>
                    <div class="flex justify-between font-medium"><span>${nutrient.name}</span><span>${nutrient.value}${nutrient.unit} ${nutrient.target ? `/ ${nutrient.target.toFixed(0)}${nutrient.unit}` : ''}</span></div>
                    <div class="progress-bar mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div class="progress-bar-inner ${statusColors[nutrient.status]}" style="width: ${nutrient.percentage}%;"></div>
                    </div>
                  </div>
                `
                            )
                            .join('')
                        : '<p class="text-gray-400 italic">Sin datos para analizar</p>'
                    }
                  </div>
                                </div>
                            </div>
                        </div>`;
                      })
                      .join('')}
                    </div>
                </div>

                <div id="nexus-container" class="bg-white p-6 rounded-lg shadow-md">
                    ${renderNexusCalendar()}

                    <div class="mt-6">
                        <h3 class="text-xl font-bold mb-4">${nexusTitle}</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        ${
                          nexusAnalysis.length > 0
                            ? nexusAnalysis
                                .map((nutrient) => {
                                  const statusColors = {
                                    success: 'text-green-500',
                                    warning: 'text-yellow-500',
                                    danger: 'text-red-500',
                                    info: 'text-blue-500',
                                  };
                                  const circumference = 2 * Math.PI * 45;
                                  const offset =
                                    circumference -
                                    (nutrient.percentage / 100) * circumference;
                                  return `
                            <div class="flex flex-col items-center p-4 rounded-lg bg-gray-50">
                                <div class="relative w-24 h-24">
                                    <svg class="w-full h-full" viewBox="0 0 100 100">
                                        <circle class="text-gray-200" stroke-width="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"/>
                                        <circle class="${statusColors[nutrient.status]}" stroke-width="10" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" style="transition: stroke-dashoffset 0.5s ease-in-out; transform: rotate(-90deg); transform-origin: 50% 50%;" />
                                    </svg>
                                    <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold ${statusColors[nutrient.status]}">${nutrient.percentage}%</span>
                                </div>
                                <div class="text-center mt-2">
                                    <p class="font-bold text-gray-700">${nutrient.name}</p>
                                    <p class="text-sm text-gray-500">${nutrient.value}${nutrient.unit} / ${nutrient.target ? nutrient.target.toFixed(0) + nutrient.unit : '-'}</p>
                                </div>
                            </div>
                            `;
                                })
                                .join('')
                            : '<p class="col-span-full text-gray-500 italic">Selecciona uno o más elementos del calendario para ver el análisis agregado.</p>'
                        }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function _renderItemLibrary() {
  const state = getState();
  const { items, stores } = state;
  const libraryItems = items.allIds.filter(
    (id) =>
      items.byId[id].itemType !== 'definicion' &&
      items.byId[id].type !== 'nutriente' &&
      items.byId[id].itemType !== 'receta'
  );

  return `
    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">Ingredientes</h2>
                <button id="add-ingredient-btn" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm">
                    + Añadir Ingrediente
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                ${libraryItems
                  .map((id) => {
                    const item = items.byId[id];

                    return `
                        <div data-action="${item.itemType === 'receta' ? 'view-recipe' : 'view-item'}" data-${item.itemType === 'receta' ? 'recipe' : 'item'}-id="${item.id}" class="border rounded-lg p-4 flex flex-col justify-between hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer min-h-32">
                            ${
                              item.itemType === 'receta'
                                ? `
                                <div>
                                    <h3 class="font-bold">${item.name}</h3>
                                </div>
                            `
                                : `
                                <div>
                                    <h3 class="font-bold">${item.name}</h3>
                                </div>
                            `
                            }
                        </div>
                    `;
                  })
                  .join('')}
            </div>
    </div>

        <div id="shopping-list-container" class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold mb-4">Lista de la Compra</h2>
            <div class="max-h-60 overflow-y-auto">${_renderShoppingList(state)}</div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Gestor de Supermercados movido a 'Mis Ajustes' -->

            <!-- Gestor de Categorías movido a 'Mis Ajustes' -->
        </div>
    `;
}

function _renderRecipeLibrary() {
  const state = getState();
  const { items } = state;
  const recipes = items.allIds.filter(
    (id) => items.byId[id].itemType === 'receta'
  );

  // Helper: Compositor de Recetas (movido desde Planner)
  function _renderRecipeComposer(state) {
    const { ui, items } = state;
    return `
        <div class="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-2xl font-bold mb-4">Compositor de Recetas</h2>
            <form id="recipe-form" class="space-y-3">
                <input type="text" name="recipeName" value="${ui.recipeBuilder.name}" placeholder="Nombre de la Receta" required class="block w-full rounded-md border-gray-300 shadow-sm text-sm">
                <div class="p-2 border rounded-md bg-gray-50 space-y-2">
                    <div class="flex items-end space-x-2">
                        <div class="flex-grow">
                            <label class="block text-xs font-medium text-gray-700">Ingrediente</label>
                            <select name="ingredientSelect" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm">
                                ${items.allIds
                                  .filter(
                                    (id) =>
                                      items.byId[id].itemType === 'ingrediente'
                                  )
                                  .map(
                                    (id) =>
                                      `<option value="${id}">${items.byId[id].name}</option>`
                                  )
                                  .join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700">Gramos</label>
                            <input type="number" name="grams" min="0" value="100" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm w-24">
                        </div>
                        <button type="button" id="add-ingredient-to-recipe-btn" class="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm">Añadir</button>
                    </div>
                </div>
                <div class="max-h-32 overflow-y-auto space-y-1 text-sm">
                    ${ui.recipeBuilder.ingredients
                      .map((builderIng) => {
                        const ingDetails = items.byId[builderIng.ingredientId];
                        return `<div class="flex justify-between items-center bg-gray-100 p-1 rounded-md"><span>${ingDetails?.name || '?'}</span><span>${builderIng.grams}g</span></div>`;
                      })
                      .join('')}
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">Guardar Receta</button>
            </form>
        </div>
        `;
  }

  return `
        ${_renderRecipeComposer(state)}
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="mb-6">
                <h2 class="text-2xl font-bold">Biblioteca de Recetas</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                ${recipes
                  .map((id) => {
                    const recipe = items.byId[id];

                    return `
                        <div data-action="view-recipe" data-recipe-id="${recipe.id}" class="border rounded-lg p-4 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer h-24 flex items-center justify-center">
                            <div>
                                <h3 class="font-bold text-lg text-gray-800 leading-tight">${recipe.name}</h3>
                            </div>
                        </div>
                    `;
                  })
                  .join('')}
            </div>

            ${
              recipes.length === 0
                ? `
                <div class="text-center py-12">
                    <div class="text-gray-400 text-6xl mb-4">+</div>
                    <h3 class="text-lg font-semibold text-gray-600 mb-2">No hay recetas aún</h3>
                    <p class="text-gray-500 mb-4">Crea tu primera receta para empezar</p>
                    <button class="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors">
                        + Crear Primera Receta
                    </button>
                </div>
            `
                : ''
            }
        </div>
    `;
}

function _renderRecipeDetailView(recipeId) {
  const state = getState();
  const { items, profiles, ui } = state;

  const recipe = items.byId[recipeId];
  if (!recipe || recipe.itemType !== 'receta') {
    return `<p class="text-red-500">Error: Receta no encontrada.</p>`;
  }

  // Determinar si estamos en modo edición
  const isEditing =
    ui.recipeEditor.isEditing && ui.recipeEditor.recipeId === recipeId;

  // Usar ingredientes del editor si estamos editando, sino los de la receta
  const ingredientsToShow = isEditing
    ? ui.recipeEditor.ingredients
    : recipe.ingredients;

  // CÁLCULO DE RACIONES
  const racionesToShow = getRacionesToShow(recipe, ui);

  // Obtener nutrientes tracked del perfil activo
  const activeProfile = profiles.byId[ui.activeProfileId];
  const trackedNutrients = activeProfile?.trackedNutrients || [];

  // Calcular totales usando SIEMPRE el motor optimizado
  let totals = {};
  let totalGrams = 0;

  const recipeToCalculate =
    isEditing && ui.recipeEditor?.ingredients
      ? { ingredients: ui.recipeEditor.ingredients }
      : recipe;

  // Use imported selector
  const { computedTotals, totalGrams: computedGrams } =
    selectors.calculateRecipeTotals(recipeToCalculate, items.byId);

  // Convertir SIEMPRE con PRECISION_FACTOR para compatibilidad (used in the visualization logic below)
  for (const nutrientId in computedTotals) {
    totals[nutrientId] = Math.round(
      computedTotals[nutrientId] * PRECISION_FACTOR
    );
  }
  totalGrams = computedGrams;

  return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-bold text-gray-800">${recipe.name}</h2>
                    <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Receta</span>
                </div>
                ${_renderRecipeActionButtons(isEditing, recipe.id)}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold mb-4 text-gray-800">Información Nutricional</h3>

                    <div class="grid grid-cols-1 gap-4 mb-6">
                        <div class="text-center bg-white p-4 rounded-lg">
                            <div class="text-2xl font-bold text-blue-600">${Math.round(totalGrams / racionesToShow)}g</div>
                            <div class="text-sm text-gray-600">Peso por Ración</div>
                        </div>
                    </div>

                    <h4 class="font-semibold text-gray-700 mb-3">Nutrientes:</h4>

                    <div class="flex mb-4 bg-gray-200 rounded-lg p-1">
                        <button id="per-serving-btn" class="flex-1 py-2 px-4 text-sm font-medium rounded-md bg-white text-gray-900 shadow">Por ración</button>
                        <button id="per-100g-btn" class="flex-1 py-2 px-4 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900">Por 100g</button>
                    </div>

                    <div class="space-y-2 text-sm">${
                      trackedNutrients.length > 0
                        ? trackedNutrients
                            .map((nutrientId) => {
                              const nutrient = items.byId[nutrientId];
                              if (!nutrient) return '';

                              // Solicitar datos correctamente al motor optimizado
                              const rawValue = totals[nutrientId] || 0;
                              const totalValue = rawValue / PRECISION_FACTOR; // Convertir del motor
                              // CÁLCULOS NUTRICIONALES POR RACIÓN Y POR 100G
                              const per100gValue =
                                totalGrams > 0
                                  ? (totalValue * 100) / totalGrams
                                  : 0;
                              const perServingValue =
                                totalValue / racionesToShow; // NUEVO: Valor total ÷ raciones

                              // Formatear para display
                              const per100gDisplay = parseFloat(
                                per100gValue.toFixed(2)
                              );
                              const perServingDisplay = parseFloat(
                                perServingValue.toFixed(2)
                              ); // NUEVO: Display por ración

                              // Obtener objetivo nutricional
                              const activeTargets =
                                selectors.getActiveNutritionalTargets();
                              const targetInfo = activeTargets[nutrientId];
                              const targetValue = targetInfo
                                ? targetInfo.finalValue
                                : null;
                              const targetDisplay =
                                targetValue != null
                                  ? ` / ${targetValue.toFixed(0)}${nutrient.unit}`
                                  : '';

                              // Calcular porcentaje y status para la barra
                              const percentage100g =
                                targetValue != null && targetValue > 0
                                  ? Math.min(
                                      100,
                                      Math.round(
                                        (per100gDisplay / targetValue) * 100
                                      )
                                    )
                                  : 0;
                              const percentagePerServing =
                                targetValue != null && targetValue > 0
                                  ? Math.min(
                                      100,
                                      Math.round(
                                        (perServingDisplay / targetValue) * 100
                                      )
                                    )
                                  : 0; // NUEVO: Por ración

                              let status100g = 'info';
                              let statusPerServing = 'info'; // NUEVO: Status por ración
                              if (targetValue != null) {
                                // Status para 100g
                                if (per100gDisplay > targetValue * 1.1)
                                  status100g = 'danger';
                                else if (percentage100g >= 90)
                                  status100g = 'success';
                                else status100g = 'warning';

                                // Status para por ración (NUEVO)
                                if (perServingDisplay > targetValue * 1.1)
                                  statusPerServing = 'danger';
                                else if (percentagePerServing >= 90)
                                  statusPerServing = 'success';
                                else statusPerServing = 'warning';
                              }

                              const statusColors = {
                                success: 'bg-green-500',
                                warning: 'bg-yellow-500',
                                danger: 'bg-red-500',
                                info: 'bg-blue-500',
                              };

                              return `
                                <div class="space-y-2">
                                    <div class="flex justify-between font-medium">
                                        <span class="text-gray-700">${nutrient.name}</span>
                                        <span class="nutrient-value"
                                              data-per100g="${per100gDisplay}"
                                              data-perserving="${perServingDisplay}"
                                              data-unit="${nutrient.unit}"
                                              data-target="${targetValue || ''}"
                                              data-percentage100g="${percentage100g}"
                                              data-percentageperserving="${percentagePerServing}"
                                              data-status100g="${status100g}"
                                              data-statusperserving="${statusPerServing}">${perServingDisplay.toFixed(0)}${nutrient.unit}${targetDisplay}</span>
                                    </div>
                                    ${
                                      targetValue != null
                                        ? `<div class="progress-bar mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div class="progress-bar-inner h-full ${statusColors[statusPerServing]} transition-all duration-300" style="width: ${percentagePerServing}%;"></div>
                                    </div>`
                                        : ''
                                    }
                                </div>
                            `;
                            })
                            .join('')
                        : '<div class="text-gray-500 italic">No hay nutrientes configurados</div>'
                    }
                    </div>
                </div>

                <div class="bg-gray-50 p-6 rounded-lg">
                    <div class="mb-4">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="text-lg font-semibold text-gray-800">Ingredientes para</span>
                            <input type="number"
                                   id="recipe-servings-input"
                                   data-recipe-id="${recipe.id}"
                                   value="${racionesToShow}"
                                   min="1"
                                   max="20"
                                   class="w-16 text-center text-lg font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                   ${isEditing ? '' : 'readonly'}>
                            <span class="text-lg font-semibold text-gray-800">${racionesToShow === 1 ? 'persona' : 'personas'}</span>
                        </div>

                        ${
                          isEditing
                            ? `
                            <div class="flex gap-3 mb-3">
                                <select id="ingredient-select" class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                                    <option value="">Seleccionar ingrediente...</option>
                                    ${items.allIds
                                      .filter(
                                        (id) =>
                                          items.byId[id].itemType ===
                                          'ingrediente'
                                      )
                                      .map((id) => {
                                        const ingredient = items.byId[id];
                                        return `<option value="${id}">${ingredient.name}</option>`;
                                      })
                                      .join('')}
                                </select>
                                <input type="number" id="ingredient-grams" min="1" placeholder="Gramos"
                                       class="w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                            </div>

                            <div class="flex justify-start">
                                <button type="button" id="add-ingredient-btn" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium">
                                    Añadir Ingrediente
                                </button>
                            </div>
                        `
                            : ''
                        }
                    </div>

                    <div class="space-y-3">
                        ${
                          ingredientsToShow && ingredientsToShow.length > 0
                            ? ingredientsToShow
                                .map((ingredient, index) => {
                                  return _renderRecipeIngredient(
                                    ingredient,
                                    index,
                                    items,
                                    isEditing,
                                    totalGrams
                                  );
                                })
                                .join('')
                            : `
                            <div class="text-center py-8 text-gray-500">
                                <p>${isEditing ? 'No hay ingredientes en esta receta' : 'Esta receta no tiene ingredientes'}</p>
                                ${isEditing ? '<p class="text-sm">Haz clic en "Añadir Ingrediente" para empezar</p>' : ''}
                            </div>
                        `
                        }
                    </div>
                </div>

                ${
                  isEditing
                    ? `
                    `
                    : ''
                }
            </div>
        </div>
    `;
}

function _renderItemDetailView(itemId) {
  const state = getState();
  const item = state.items.byId[itemId];
  if (!item) {
    return `<p class="text-red-500">Error: Item no encontrado.</p>`;
  }
  const { items, profiles, ui, stores, categories } = state;
  const activeProfile = profiles.byId[ui.activeProfileId];
  const trackedNutrients = activeProfile?.trackedNutrients || [];
  const selectedStoreIds = new Set(item.logistics?.preferredStoreIds || []);
  const selectedCategoryIds = new Set(item.categoryIds || []);

  // Detectar si está en modo edición
  const isEditing =
    ui.itemEditor?.isEditing && ui.itemEditor?.itemId === itemId;

  return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            ${isEditing ? `<form id="item-detail-form" data-item-id="${itemId}">` : ''}
        <div class="mb-6 border-b pb-4">
          <div class="flex justify-end mb-3">
            ${_renderItemActionButtons(isEditing, itemId)}
          </div>
          <div>
            ${
              isEditing
                ? `
                  <input type="text" name="name" value="${item.name}" placeholder="Nombre del Item" required class="block w-full text-2xl font-bold rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                `
                : `
                  <h1 class="text-2xl font-bold text-gray-800">${item.name}</h1>
                `
            }
          </div>
        </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4 text-gray-800">Objetivos diarios</h3>
                        <div class="space-y-2">
                            ${trackedNutrients
                              .map((nutrientId) => {
                                const definition = items.byId[nutrientId];
                                if (!definition) return '';

                                let value100g = 0;
                                if (
                                  item.itemType === 'ingrediente' &&
                                  item.nutrients[nutrientId]
                                ) {
                                  value100g = item.nutrients[nutrientId];
                                } else if (
                                  item.itemType === 'receta' &&
                                  item.computed?.totals[nutrientId] &&
                                  item.computed?.totalGrams > 0
                                ) {
                                  const scalingFactor =
                                    100 / item.computed.totalGrams;
                                  // computed.totals stores values already divided by PRECISION_FACTOR (see selectors.js)
                                  value100g =
                                    item.computed.totals[nutrientId] *
                                    scalingFactor;
                                }

                                const coreMacros = [
                                  'calories',
                                  'proteins',
                                  'fats',
                                  'carbs',
                                ];
                                if (
                                  !value100g &&
                                  !coreMacros.includes(nutrientId)
                                )
                                  return '';

                                // Aplicar formato unificado igual que panel diario/recetas
                                const activeTargets =
                                  selectors.getActiveNutritionalTargets();
                                const targetInfo = activeTargets[nutrientId];
                                const targetValue = targetInfo
                                  ? targetInfo.finalValue
                                  : null;

                                // Cálculo de status (igual que panel diario)
                                const percentage =
                                  targetValue && targetValue > 0
                                    ? Math.min(
                                        100,
                                        Math.round(
                                          (value100g / targetValue) * 100
                                        )
                                      )
                                    : 0;
                                let status = 'info';
                                if (targetValue != null) {
                                  if (value100g > targetValue * 1.1)
                                    status = 'danger';
                                  else if (percentage >= 90) status = 'success';
                                  else status = 'warning';
                                }

                                const statusColors = {
                                  success: 'bg-green-500',
                                  warning: 'bg-yellow-500',
                                  danger: 'bg-red-500',
                                  info: 'bg-blue-500',
                                };
                                const targetDisplay = targetValue
                                  ? ` / ${targetValue.toFixed(0)}${definition.unit}`
                                  : '';

                                return `
                                <div class="space-y-2">
                                    <div class="flex justify-between font-medium">
                                        <span class="text-gray-700">${definition.name}</span>
                    <span class="font-bold text-gray-900">${value100g.toFixed(0)}${definition.unit}${targetDisplay}</span>
                                    </div>
                                    ${
                                      targetValue
                                        ? `<div class="progress-bar mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div class="progress-bar-inner h-full ${statusColors[status]} transition-all duration-300" style="width: ${Math.min(100, percentage)}%;"></div>
                                    </div>`
                                        : ''
                                    }
                                </div>
                                `;
                              })
                              .join('')}
                        </div>
                    </div>

                    ${_renderItemMetaPanel(item, isEditing, selectedCategoryIds, selectedStoreIds, stores, categories)}
                </div>

                <!-- Bloque agregado: listado completo de nutrientes desde la base de datos -->
                <div class="mt-6 bg-white p-6 rounded-lg border">
                    <h4 class="font-semibold text-gray-700 mb-3">100g contienen</h4>
                    <div class="space-y-2 text-sm">
                        ${items.allIds
                          .filter(
                            (id) => items.byId[id].itemType === 'definicion'
                          )
                          .map((nutrientId) => {
                            const def = items.byId[nutrientId];
                            if (!def) return '';

                            let value100g = 0;
                            if (
                              item.itemType === 'ingrediente' &&
                              item.nutrients &&
                              item.nutrients[nutrientId] != null
                            ) {
                              value100g = item.nutrients[nutrientId];
                            } else if (
                              item.itemType === 'receta' &&
                              item.computed &&
                              item.computed.totals &&
                              item.computed.totalGrams > 0 &&
                              item.computed.totals[nutrientId] != null
                            ) {
                              const scalingFactor =
                                100 / item.computed.totalGrams;
                              value100g =
                                item.computed.totals[nutrientId] *
                                scalingFactor;
                            }

                            const displayValue = parseFloat(
                              (value100g || 0).toFixed(1)
                            );

                            return `
                                <div class="space-y-2">
                                    <div class="flex justify-between font-medium">
                                        <span class="text-gray-700">${def.name}</span>
                                        ${
                                          isEditing &&
                                          item.itemType === 'ingrediente'
                                            ? `
                                        <input type="number" name="nutrient_${nutrientId}" value="${displayValue}" step="0.1" class="w-24 text-right rounded border-gray-300 text-sm">
                                    `
                                            : `
                                        <span class="font-bold text-gray-900">${displayValue}${def.unit || ''}</span>
                                    `
                                        }
                                    </div>
                                </div>
                            `;
                          })
                          .join('')}
                    </div>
                </div>
                </div>
            ${isEditing ? `</form>` : ''}
        </div>
    `;
}

function _renderDeleteItemModal() {
  const state = getState();
  const { ui, items } = state;
  if (!ui.deleteItemModal.isOpen) return '';

  const item = items.byId[ui.deleteItemModal.itemId];
  const dependentRecipes = ui.deleteItemModal.dependentRecipes;
  const isRecipe = item?.itemType === 'receta';

  return `
        <div id="delete-item-modal" class="modal-overlay">
            <div class="modal-content max-w-md">
                <h3 class="text-lg font-bold mb-4 text-red-600">Confirmar Eliminación</h3>
                <p class="mb-4">¿Estás seguro de que quieres eliminar ${isRecipe ? 'la receta' : 'el ingrediente'} <strong>"${item?.name}"</strong>?</p>

                ${
                  isRecipe
                    ? `
                    <div class="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                        <p class="text-sm text-blue-700">
                            Esta acción eliminará permanentemente la receta. Los ingredientes individuales no se verán afectados.
                        </p>
                    </div>
                `
                    : `
                    ${
                      dependentRecipes.length > 0
                        ? `
                        <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                            <h4 class="font-semibold text-red-800 mb-2">⚠️ No se puede eliminar este ingrediente</h4>
                            <p class="text-sm text-red-700 mb-2">Este ingrediente se usa en las siguientes recetas:</p>
                            <ul class="text-sm text-red-700 list-disc pl-5 mb-2">
                                ${dependentRecipes.map((recipe) => `<li><strong>${recipe}</strong></li>`).join('')}
                            </ul>
                            <p class="text-sm text-red-600 font-medium">
                                Para eliminar este ingrediente, primero debes quitarlo manualmente de cada receta donde se usa.
                            </p>
                        </div>
                    `
                        : `
                        <div class="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                            <p class="text-sm text-green-700">✅ Este ingrediente no se usa en ninguna receta. Es seguro eliminarlo.</p>
                        </div>
                    `
                    }
                `
                }

                <div class="flex justify-end gap-2">
                    <button type="button" id="cancel-delete-item-btn" class="px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                    ${
                      isRecipe || dependentRecipes.length === 0
                        ? `
                        <button type="button" id="confirm-delete-item-btn" class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                            Eliminar ${isRecipe ? 'Receta' : 'Ingrediente'}
                        </button>
                    `
                        : `
                        <button type="button" disabled class="px-4 py-2 text-sm bg-gray-400 text-gray-600 rounded-md cursor-not-allowed">
                            No se puede eliminar
                        </button>
                    `
                    }
                </div>
            </div>
        </div>
    `;
}

// Main Render Function
export function render() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const state = getState();
  const { ui } = state;

  let currentViewHtml;
  switch (ui.activeView) {
    case 'library':
      currentViewHtml = _renderItemLibrary();
      break;
    case 'recipes':
      currentViewHtml = _renderRecipeLibrary();
      break;
    case 'recipeDetail':
      currentViewHtml = _renderRecipeDetailView(ui.editingItemId);
      break;
    case 'itemDetail':
      currentViewHtml = _renderItemDetailView(ui.editingItemId);
      break;
    case 'settings':
      currentViewHtml = renderFunctions.renderSettingsView(state);
      break;
    case 'planner':
    default:
      currentViewHtml = _renderPlannerView();
      break;
  }

  const newHtml = `
        <div class="mb-8">
            <div class="flex justify-between items-center border-b pb-4">
                <h1 class="text-4xl font-bold text-gray-800">Menu Planner</h1>
                <nav class="flex items-center gap-4">
                    <button data-view="planner" class="px-4 py-2 text-sm font-medium rounded-md ${ui.activeView === 'planner' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">Planificador</button>
                    <button data-view="library" class="px-4 py-2 text-sm font-medium rounded-md ${ui.activeView === 'library' || ui.activeView === 'itemDetail' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">Ingredientes</button>
                    <button data-view="recipes" class="px-4 py-2 text-sm font-medium rounded-md ${ui.activeView === 'recipes' || ui.activeView === 'recipeDetail' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">Recetas</button>
                    <button data-view="settings" class="px-4 py-2 text-sm font-medium rounded-md ${ui.activeView === 'settings' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">Mis Ajustes</button>
                </nav>
            </div>
        </div>

        ${currentViewHtml}

        ${_renderDeleteItemModal()}

        <div id="toast-container" class="fixed bottom-4 right-4 space-y-2">
            ${ui.notifications
              .map(
                (n) => `
                <div class="toast toast-${n.type}">
                    ${n.message}
                </div>
            `
              )
              .join('')}
        </div>
    `;

  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = newHtml;

  // Use Morphdom for efficient DOM updates
  window.morphdom(appContainer, tempContainer, {
    childrenOnly: true,
  });

  // Re-attach event listeners after rendering
  attachEventListeners(appContainer);
}
