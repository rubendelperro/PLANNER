import { getState } from '../../state.js';

export function ProfileView() {
  const state = getState();
  const profileError = state.ui && state.ui.profileError;

  // ...existing code...
  return `
    <form id="profile-form">
      <label for="profile-name">Nombre del perfil</label>
      <input id="profile-name" name="profile-name" type="text" />
      ${profileError ? `<p data-cy="profile-error" style="color:red;">${profileError}</p>` : ''}
      <!-- Otros campos y botones del formulario -->
    </form>
  `;
}
