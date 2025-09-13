import { describe, it, expect } from 'vitest';
import { renderProfileForm } from '../components/ProfileForm.js';

describe('ProfileForm component', () => {
  it('renders inputs with profile values for a normal profile', () => {
    const mockState = {
      profiles: {
        allIds: ['p1'],
        byId: {
          p1: {
            id: 'p1',
            name: 'Ruben',
            isDefault: false,
            age: 30,
            weight: 70,
            height: 175,
            gender: 'male',
            activityLevel: 'moderate',
            goal: 'maintain',
          },
        },
      },
      ui: { activeProfileId: 'p1', profileError: '' },
    };

    const html = renderProfileForm(mockState);
    expect(html).toContain('id="profile-form"');
    expect(html).toContain('value="Ruben"');
    expect(html).toContain('value="30"');
    expect(html).toContain('value="70"');
    expect(html).toContain('value="175"');
    expect(html).toContain('option value="male" selected');
  });

  it('renders disabled form when active profile is default', () => {
    const mockState = {
      profiles: {
        allIds: ['p1'],
        byId: {
          p1: {
            id: 'p1',
            name: 'Default',
            isDefault: true,
          },
        },
      },
      ui: { activeProfileId: 'p1', profileError: '' },
    };

    const html = renderProfileForm(mockState);
    // the rendered inputs should include the disabled attribute
    expect(html).toContain('disabled');
    // delete button should be present but disabled
    expect(html).toContain('id="delete-profile-btn"');
  });
});
