// Single implementation: renderCategoryManager + renderCategoriesField

export function renderCategoryManager(state = {}) {
  const { categories = { allIds: [], byId: {} } } = state;

  return `
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-2xl font-bold mb-4">Gestor de Categorías</h2>
      <form id="add-category-form" class="flex gap-4 mb-4">
        <input type="text" name="categoryName" placeholder="Nombre de la categoría" required class="block w-full rounded-md border-gray-300 shadow-sm text-sm">
        <button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm">Añadir</button>
      </form>

      <div class="space-y-2">
        ${categories.allIds
          .map((categoryId) => {
            const category = categories.byId[categoryId];
            return `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded-md">
              <div class="text-sm">${category?.name || 'Categoría desconocida'}</div>
              <div>
                <button data-delete-category-id="${categoryId}" class="text-red-500 hover:text-red-700 font-bold px-2 text-sm">Eliminar</button>
              </div>
            </div>`;
          })
          .join('')}
      </div>
    </div>
  `;
}

export function renderCategoriesField(
  selectedCategoryIds = new Set(),
  categories = { allIds: [], byId: {} },
  isEditing = false
) {
  if (isEditing) {
    return `
      <p class="text-xs text-gray-500 mb-2">Marca las categorías que mejor describan este ingrediente. La primera marcada será la principal.</p>
      <div class="mt-1 space-y-2 max-h-32 overflow-y-auto border p-2 rounded-md">
        ${categories.allIds
          .map((categoryId) => {
            const category = categories.byId[categoryId];
            const isSelected = selectedCategoryIds.has(categoryId);
            const isPrimary =
              selectedCategoryIds.size > 0 &&
              Array.from(selectedCategoryIds)[0] === categoryId;
            return `
            <label class="flex items-center ${isPrimary ? 'bg-green-50 p-2 rounded' : ''}">
              <input type="checkbox" name="categoryIds" value="${categoryId}" class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" ${isSelected ? 'checked' : ''}>
              <span class="ml-2 text-sm text-gray-600">
                ${category?.name || categoryId}
                ${isPrimary ? '<span class="text-xs text-green-600 font-semibold"> (Principal)</span>' : ''}
              </span>
            </label>`;
          })
          .join('')}
      </div>
    `;
  }

  return `
    <div class="mt-1 space-y-2">
      ${
        selectedCategoryIds.size > 0
          ? Array.from(selectedCategoryIds)
              .map((categoryId, index) => {
                const category = categories.byId[categoryId];
                const isPrimary = index === 0;
                return `
            <div class="flex items-center justify-between">
              <div class="${isPrimary ? 'text-base font-semibold text-green-600' : 'text-base text-gray-700'}">${category?.name || 'Categoría desconocida'}</div>
              ${isPrimary ? '<div class="text-xs text-green-500 font-medium">Principal</div>' : ''}
            </div>`;
              })
              .join('')
          : '<div class="text-sm text-gray-400 italic">Ninguna categoría seleccionada</div>'
      }
    </div>
  `;
}
