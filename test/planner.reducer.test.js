import { describe, it, expect } from 'vitest';
import { plannerReducer } from '../state_slices/planner.reducer.js';

describe('plannerReducer', () => {
  it('ASSIGN_ITEM_TO_SLOT adds an item to the given date and slot', () => {
    const draftState = { planner: {}, ui: { selectedCells: new Set() } };
    const action = {
      type: 'ASSIGN_ITEM_TO_SLOT',
      payload: { date: '2025-09-12', slot: 'lunch', id: 'ITEM1', grams: 150 },
    };

    const handled = plannerReducer(draftState, action);
    expect(handled).toBe(true);
    expect(draftState.planner['2025-09-12']).toBeDefined();
    expect(draftState.planner['2025-09-12'].lunch).toBeDefined();
    expect(draftState.planner['2025-09-12'].lunch.length).toBe(1);
    expect(draftState.planner['2025-09-12'].lunch[0]).toEqual({
      id: 'ITEM1',
      grams: 150,
    });
  });

  it('REMOVE_PLANNED_MEAL removes an item at the specified index', () => {
    const draftState = {
      planner: {
        '2025-09-12': {
          lunch: [
            { id: 'ITEM1', grams: 150 },
            { id: 'ITEM2', grams: 100 },
          ],
        },
      },
      ui: { selectedCells: new Set() },
    };
    const action = {
      type: 'REMOVE_PLANNED_MEAL',
      payload: { date: '2025-09-12', slot: 'lunch', itemIndex: 0 },
    };

    const handled = plannerReducer(draftState, action);
    expect(handled).toBe(true);
    expect(draftState.planner['2025-09-12'].lunch.length).toBe(1);
    expect(draftState.planner['2025-09-12'].lunch[0].id).toBe('ITEM2');
  });

  it('SET_ACTIVE_DAY toggles the activePlannerDay in ui', () => {
    const draftState = {
      planner: {},
      ui: { activePlannerDay: null, selectedCells: new Set() },
    };
    const action = { type: 'SET_ACTIVE_DAY', payload: '2025-09-12' };

    const handled = plannerReducer(draftState, action);
    expect(handled).toBe(true);
    expect(draftState.ui.activePlannerDay).toBe('2025-09-12');

    // toggling same day should unset
    const handled2 = plannerReducer(draftState, action);
    expect(handled2).toBe(true);
    expect(draftState.ui.activePlannerDay).toBeNull();
  });

  it('CLEAR_SELECTION empties the selectedCells set', () => {
    const s = new Set(['a', 'b']);
    const draftState = { planner: {}, ui: { selectedCells: s } };
    const action = { type: 'CLEAR_SELECTION' };

    const handled = plannerReducer(draftState, action);
    expect(handled).toBe(true);
    expect(draftState.ui.selectedCells.size).toBe(0);
  });
});
