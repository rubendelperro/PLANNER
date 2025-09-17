import * as selectors from '../selectors.js';
import { renderProfileForm } from './ProfileForm.js';

export function renderControlCenter(state) {
  const { profiles, ui, items } = state;
  const activeProfile = profiles.byId[ui.activeProfileId];
  const isDefaultProfileActive = activeProfile?.isDefault;

  // Precompute active targets using the selector to keep template clean.
  let activeTargetsMap = {};
  try {
    activeTargetsMap = selectors.getActiveNutritionalTargets() || {};
  } catch (err) {
    activeTargetsMap = {};
  }

  return `
    <div class="bg-white p-6 rounded-lg shadow-md">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Perfil</h2>
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
      ${renderProfileForm(state)}

      <div id="targets-panel" class="mt-4 max-h-60 overflow-y-auto">
        <h3 class="font-semibold mb-2">Objetivos nutricionales diarios</h3>
        ${(() => {
          const activeTargets = activeTargetsMap || {};
          return (activeProfile?.trackedNutrients || [])
            .map((nutrientId) => {
              const def = items.byId[nutrientId];
              if (!def) return '';

              let targetInfo = activeTargets[nutrientId] || {};
              if (!targetInfo || Object.keys(targetInfo).length === 0) {
                const stateItems =
                  typeof window !== 'undefined' && window.__getState
                    ? window.__getState().items
                    : state.items;
                targetInfo = (stateItems && stateItems[nutrientId]) || {};
              }

              const finalValue = targetInfo?.finalValue ?? null;
              const source = targetInfo?.source ?? null;
              let tooltipText = '';
              switch (source) {
                case 'reference':
                  tooltipText = `Valor de Referencia`;
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

              let valueHtml = '';
              if (finalValue == null) {
                valueHtml = `<span data-value-display="0" class="font-bold text-lg text-gray-500">0${def.unit || ''}</span>`;
              } else if (
                source === 'personal' &&
                targetInfo &&
                targetInfo.baseValue != null
              ) {
                valueHtml = `
                  <span class="flex items-center">
                    <span class="text-gray-400 line-through mr-3 text-sm">${targetInfo.baseValue.toFixed(0)}${def.unit || ''}</span>
                    <span data-value-display="${finalValue.toFixed(0)}" class="font-bold text-lg text-blue-600">${finalValue.toFixed(0)}${def.unit || ''}</span>
                  </span>`;
              } else {
                valueHtml = `<span data-value-display="${finalValue.toFixed(0)}" class="font-bold text-lg ${source === 'personal' ? 'text-blue-600' : 'text-gray-800'}">${finalValue.toFixed(0)}${def.unit || ''}</span>`;
              }

              return `
                <div class="text-sm p-2 rounded-md ${isEditable ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-75'}" ${isEditable ? `data-nutrient-id="${nutrientId}"` : ''} title="${tooltipText}">
                  <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">${def.name}</span>
                    <div class="flex items-center gap-2">
                      ${valueHtml}
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
