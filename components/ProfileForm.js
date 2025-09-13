export function renderProfileForm(state) {
  const { profiles, ui } = state;
  const activeProfile = profiles.byId[ui.activeProfileId];
  const isDefaultProfileActive = activeProfile?.isDefault;
  const formDisabledState = isDefaultProfileActive ? 'disabled' : '';
  const formDisabledClasses = isDefaultProfileActive
    ? 'disabled:bg-gray-100 disabled:cursor-not-allowed'
    : '';

  return `
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
  `;
}

export default renderProfileForm;
