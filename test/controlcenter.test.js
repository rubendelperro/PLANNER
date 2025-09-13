import { describe, it, expect } from 'vitest';
import { renderControlCenter } from '../components/ControlCenter.js';

describe('ControlCenter component', () => {
  it('renders critical DOM selectors and data attributes', () => {
    const mockState = {
      profiles: {
        allIds: ['p1'],
        byId: {
          p1: {
            id: 'p1',
            name: 'Test',
            isDefault: false,
            trackedNutrients: ['n1'],
          },
        },
      },
      ui: { activeProfileId: 'p1', profileError: '' },
      items: {
        allIds: ['n1'],
        byId: {
          n1: { id: 'n1', name: 'Vitamina D', unit: 'µg' },
        },
      },
    };

    const html = renderControlCenter(mockState);

    expect(html).toContain('#new-profile-btn');
    expect(html).toContain('#profile-selector');
    expect(html).toContain('#profile-form');
    expect(html).toContain('#targets-panel');
    expect(html).toContain('data-nutrient-id="n1"');
    expect(html).toContain('data-value-display');
  });
});
