import { describe, it, expect, vi } from 'vitest';
import * as selectors from '../selectors.js';
import { renderControlCenter } from '../components/ControlCenter.js';

describe('ControlCenter targets rendering', () => {
  it('displays selector-provided final values in the targets panel', () => {
    const mockState = {
      profiles: {
        allIds: ['p1'],
        byId: {
          p1: {
            id: 'p1',
            name: 'Test',
            isDefault: false,
            trackedNutrients: ['n1'],
            referenceSourceId: 'ref1',
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

    // Stub the selector to simulate computed targets
    const stub = vi
      .spyOn(selectors, 'getActiveNutritionalTargets')
      .mockReturnValue({
        n1: {
          finalValue: 20,
          baseValue: 18,
          source: 'calculated',
          sourceName: 'Ref',
        },
      });

    const html = renderControlCenter(mockState);

    // ensure the final value is included and not the zero placeholder
    expect(html).toContain('data-nutrient-id="n1"');
    expect(html).toContain('data-value-display="20');
    expect(html).toContain('20µg');

    stub.mockRestore();
  });
});
