import * as selectors from '../selectors.js';
import { renderProfileForm } from './ProfileForm.js';

export function renderControlCenter(state) {
  const { profiles, ui, items } = state;
  const activeProfile = profiles.byId[ui.activeProfileId];
  const isDefaultProfileActive = activeProfile?.isDefault;
  const formDisabledState = isDefaultProfileActive ? 'disabled' : '';
  const formDisabledClasses = isDefaultProfileActive
    ? 'disabled:bg-gray-100 disabled:cursor-not-allowed'
    : '';

  // Precompute active targets using the selector to keep template clean.
  // The selector relies on injected getState in the real app; in tests it may
  // not be initialized so we guard and fall back to reading from state.items
  let activeTargetsMap = {};
  try {
    activeTargetsMap = selectors.getActiveNutritionalTargets() || {};
  } catch (err) {
    // Selector couldn't run (test env or not-initialized DI). We'll fallback
    // to per-item stored info in state.items when available.
    activeTargetsMap = {};
  }

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
    ${renderProfileForm(state)}
                <div id="targets-panel" class="mt-4 max-h-60 overflow-y-auto">
                    <h3 class="font-semibold mb-2">Panel de Objetivos</h3>
                    ${(() => {
                      // Use the selector as the single source of truth for final target values
                      const activeTargets = activeTargetsMap || {};

                      return (activeProfile?.trackedNutrients || [])
                        .map((nutrientId) => {
                          const def = items.byId[nutrientId];
                          if (!def) return '';

                          let targetInfo = activeTargets[nutrientId] || {};
                          // Fallback for test environments or older state shape
                          if (
                            !targetInfo ||
                            Object.keys(targetInfo).length === 0
                          ) {
                            const stateItems =
                              typeof window !== 'undefined' && window.__getState
                                ? window.__getState().items
                                : state.items;

                            targetInfo =
                              (stateItems && stateItems[nutrientId]) || {};
                          }
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
