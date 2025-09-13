export function renderControlCenter(state) {
  const { profiles, ui, items } = state;
  const activeProfile = profiles.byId[ui.activeProfileId];
  const isDefaultProfileActive = activeProfile?.isDefault;
  const formDisabledState = isDefaultProfileActive ? 'disabled' : '';
  const formDisabledClasses = isDefaultProfileActive
    ? 'disabled:bg-gray-100 disabled:cursor-not-allowed'
    : '';

  return `
    <div class="bg-white p-6 rounded-lg shadow-md">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Centro de Mando</h2>
        <div class="flex items-center gap-2">
          <select id="profile-selector" class="rounded-md border-gray-300 shadow-sm text-sm">
            ${profiles.allIds
              .map(
                (id) => `
              <option value="${id}" ${id === ui.activeProfileId ? 'selected' : ''}>${profiles.byId[id].name}</option>
            `
              )
              .join('')}
          </select>
          <button id="new-profile-btn" title="Crear Nuevo Perfil" class="text-sm bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600">+</button>
        </div>
      </div>
      <button id="confirm-profile-change" class="hidden w-full bg-blue-500 text-white py-2 rounded-md mb-4">Cambiar Perfil</button>
      <form id="profile-form" class="space-y-3 border-b pb-4">
        <input type="text" name="name" value="${activeProfile?.name || ''}" placeholder="Nombre de Perfil" class="block w-full rounded-md border-gray-300 shadow-sm text-sm ${formDisabledClasses}" ${formDisabledState}>
        ${ui.profileError ? `<p data-cy="profile-error" style="color:red;">${ui.profileError}</p>` : ''}
                <div class="grid grid-cols-3 gap-2 mt-3">
                    <input type="number" name="age" min="0" value="${activeProfile?.age || ''}" placeholder="Edad" class="block w-full rounded-md border-gray-300 shadow-sm text-sm ${formDisabledClasses}" ${formDisabledState}>
                    <input type="number" name="weight" min="0" value="${activeProfile?.weight || ''}" placeholder="Peso (kg)" class="block w-full rounded-md border-gray-300 shadow-sm text-sm ${formDisabledClasses}" ${formDisabledState}>
                    <input type="number" name="height" min="0" value="${activeProfile?.height || ''}" placeholder="Altura (cm)" class="block w-full rounded-md border-gray-300 shadow-sm text-sm ${formDisabledClasses}" ${formDisabledState}>
                </div>
                <select name="gender" class="mt-3 block w-full rounded-md border-gray-300 shadow-sm text-sm ${formDisabledClasses}" ${formDisabledState}>
                    <option value="male" ${activeProfile?.gender === 'male' ? 'selected' : ''}>Masculino</option>
                    <option value="female" ${activeProfile?.gender === 'female' ? 'selected' : ''}>Femenino</option>
                </select>
                <select name="activityLevel" class="mt-3 block w-full rounded-md border-gray-300 shadow-sm text-sm ${formDisabledClasses}" ${formDisabledState}>
                    <option value="sedentary" ${activeProfile?.activityLevel === 'sedentary' ? 'selected' : ''}>Sedentario</option>
                    <option value="light" ${activeProfile?.activityLevel === 'light' ? 'selected' : ''}>Ligero</option>
                    <option value="moderate" ${activeProfile?.activityLevel === 'moderate' ? 'selected' : ''}>Moderado</option>
                    <option value="high" ${activeProfile?.activityLevel === 'high' ? 'selected' : ''}>Alto</option>
                    <option value="very_high" ${activeProfile?.activityLevel === 'very_high' ? 'selected' : ''}>Muy Alto</option>
                </select>
                <select name="goal" class="mt-3 block w-full rounded-md border-gray-300 shadow-sm text-sm ${formDisabledClasses}" ${formDisabledState}>
                    <option value="maintain" ${activeProfile?.goal === 'maintain' ? 'selected' : ''}>Mantener</option>
                    <option value="lose" ${activeProfile?.goal === 'lose' ? 'selected' : ''}>Perder</option>
                    <option value="gain" ${activeProfile?.goal === 'gain' ? 'selected' : ''}>Ganar</option>
                </select>
                <div class="mt-4 flex justify-end">
                    <button type="button" id="delete-profile-btn" class="text-sm bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 ${activeProfile?.isDefault ? 'opacity-50 cursor-not-allowed' : ''}" ${activeProfile?.isDefault ? 'disabled' : ''}>Eliminar Perfil</button>
                </div>
            </form>
                <div id="targets-panel" class="mt-4 max-h-60 overflow-y-auto">
                    <h3 class="font-semibold mb-2">Panel de Objetivos</h3>
                    ${(() => {
                      const activeTargets =
                        (typeof window !== 'undefined' && window.__getState
                          ? window.__getState().items
                          : state.items) || {};

                      return (activeProfile?.trackedNutrients || [])
                        .map((nutrientId) => {
                          const def = items.byId[nutrientId];
                          if (!def) return '';

                          const targetInfo =
                            state && state.items
                              ? state.items[nutrientId] || {}
                              : {};
                          const finalValue = targetInfo?.finalValue ?? null;
                          const source = targetInfo?.source ?? null;
                          const sourceName = targetInfo?.sourceName ?? '';
                          let tooltipText = '';
                          switch (source) {
                            case 'reference':
                              tooltipText = `Valor de Referencia (${sourceName})`;
                              break;
                            case 'calculated':
                              tooltipText = 'Objetivo calculado para tu perfil';
                              break;
                            case 'personal':
                              tooltipText = 'Meta personal (modificado)';
                              break;
                            default:
                              tooltipText = '';
                          }
                          const isEditable = !isDefaultProfileActive;

                          return `
                            <div class="text-sm p-2 rounded-md ${isEditable ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-75'}"
                                ${isEditable ? `data-nutrient-id="${nutrientId}"` : ''} title="${tooltipText}">
                                <div class="flex justify-between items-center">
                                    <span class="flex items-center gap-1">${def.name}</span>
                                    <div class="flex items-center gap-2">
                                        ${
                                          finalValue == null
                                            ? `<span class="font-bold text-lg text-gray-500" data-value-display="0${def.unit || ''}">0${def.unit || ''}</span>`
                                            : `<span class="font-bold text-lg ${source === 'personal' ? 'text-blue-600' : 'text-gray-800'}" data-value-display="${finalValue.toFixed(0)}${def.unit || ''}">${finalValue.toFixed(0)}${def.unit || ''}</span>`
                                        }
                                    </div>
                                </div>
                            </div>`;
                        })
                        .join('');
                    })()}
                </div>
        </div>
    `;
}

export default renderControlCenter;
