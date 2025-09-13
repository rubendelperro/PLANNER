export function renderNutrientManager(state) {
  const { profiles, ui, items } = state;
  const activeProfile = profiles.byId[ui.activeProfileId];
  const trackedIds = activeProfile?.trackedNutrients || [];
  const untrackedIds = items.allIds.filter(
    (id) => items.byId[id].itemType === 'definicion' && !trackedIds.includes(id)
  );
  const orderedNutrientIds = [...trackedIds, ...untrackedIds];

  return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold mb-4">Gestor de Nutrientes</h2>
            <div id="nutrient-manager-list" class="space-y-2 mb-4 border-b pb-4">
                ${orderedNutrientIds
                  .map((id) => {
                    const def = items.byId[id];
                    const isTracked =
                      activeProfile?.trackedNutrients?.includes(id);
                    return `
                    <div
                        id="manager-nutrient-${id}"
                        class="flex items-center justify-between p-2 rounded-md text-sm ${isTracked ? 'cursor-grab' : 'opacity-60'} ${def.isCustom ? 'bg-blue-50' : 'bg-gray-50'}"
                        draggable="${isTracked}"
                        data-nutrient-id="${id}"
                    >
                        <div class="flex items-center">
                            <label class="relative inline-flex items-center cursor-pointer mr-3">
                                <input type="checkbox" value="${id}" class="sr-only peer nutrient-toggle" ${isTracked ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                            <span>${def.name} (${def.unit})</span>
                        </div>
                        ${def.isCustom ? `<button data-delete-nutrient-id="${id}" class="text-red-500 hover:text-red-700 font-bold px-2">X</button>` : '<div class="w-8"></div>'}
                    </div>
                    `;
                  })
                  .join('')}
            </div>

            <form id="add-nutrient-form" class="space-y-3">
                <h3 class="font-semibold">Añadir Nuevo Nutriente</h3>
                <input type="text" name="name" placeholder="Nombre (ej. Vitamina C)" required class="block w-full rounded-md border-gray-300 shadow-sm text-sm">
                <input type="text" name="unit" placeholder="Unidad (ej. mg)" required class="block w-full rounded-md border-gray-300 shadow-sm text-sm">
                <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">Añadir y Rastrear</button>
            </form>
        </div>
    `;
}
