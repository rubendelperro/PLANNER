import { SLOTS } from '../utils.js';

// Reducer slice for planner-related actions. Accepts the immer draftState and the action.
// Returns true if the action was handled here, false otherwise.
export function plannerReducer(draftState, action) {
  switch (action.type) {
    case 'ASSIGN_ITEM_TO_SLOT': {
      const { date, slot, id, grams } = action.payload;
      const newItem = { id, grams };
      const datePlan = draftState.planner[date] || {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      };
      datePlan[slot].push(newItem);
      draftState.planner[date] = datePlan;
      return true;
    }

    case 'REMOVE_PLANNED_MEAL': {
      const { date, slot, itemIndex } = action.payload;
      if (
        draftState.planner[date] &&
        draftState.planner[date][slot] &&
        itemIndex >= 0 &&
        itemIndex < draftState.planner[date][slot].length
      ) {
        draftState.planner[date][slot].splice(itemIndex, 1);
      }
      return true;
    }

    case 'SET_ACTIVE_DAY': {
      const newActiveDayId = action.payload;
      draftState.ui.activePlannerDay =
        newActiveDayId === draftState.ui.activePlannerDay
          ? null
          : newActiveDayId;
      return true;
    }

    case 'COMPLEX_TOGGLE': {
      const { type, value, context } = action.payload;
      const isMonthView = draftState.ui.nexusView === 'month';
      const currentMonth = isMonthView
        ? new Date(draftState.ui.activePlannerDay).getMonth()
        : null;

      let idsToToggle = new Set();

      if (type === 'cell') {
        idsToToggle.add(value);
      } else if (type === 'day-column') {
        const dayIndex = parseInt(value, 10);
        context.dates.forEach((date) => {
          if (date.getDay() === dayIndex && date.getMonth() === currentMonth) {
            SLOTS.forEach((slot) => {
              idsToToggle.add(`${date.toISOString().split('T')[0]}/${slot}`);
            });
          }
        });
      } else if (type === 'slotRow') {
        const slot = value;
        context.dates.forEach((date) => {
          if (!isMonthView || date.getMonth() === currentMonth) {
            idsToToggle.add(`${date.toISOString().split('T')[0]}/${slot}`);
          }
        });
      } else if (type === 'day') {
        const dateStr = value;
        if (
          !isMonthView ||
          new Date(dateStr + 'T12:00:00').getMonth() === currentMonth
        ) {
          SLOTS.forEach((slot) => {
            idsToToggle.add(`${dateStr}/${slot}`);
          });
        }
      } else if (type === 'all') {
        context.dates.forEach((date) => {
          if (!isMonthView || date.getMonth() === currentMonth) {
            SLOTS.forEach((slot) => {
              idsToToggle.add(`${date.toISOString().split('T')[0]}/${slot}`);
            });
          }
        });
      }

      const allIdsAreSelected =
        idsToToggle.size > 0 &&
        Array.from(idsToToggle).every((id) =>
          draftState.ui.selectedCells.has(id)
        );

      if (allIdsAreSelected) {
        idsToToggle.forEach((id) => draftState.ui.selectedCells.delete(id));
      } else {
        idsToToggle.forEach((id) => draftState.ui.selectedCells.add(id));
      }
      return true;
    }

    case 'CHANGE_WEEK': {
      const { direction } = action.payload;
      const currentDate = new Date(
        draftState.ui.activePlannerDay || new Date()
      );
      const newDate = new Date(currentDate);
      const dayAdjustment = direction === 'next' ? 7 : -7;
      newDate.setDate(currentDate.getDate() + dayAdjustment);
      draftState.ui.activePlannerDay = newDate.toISOString().split('T')[0];
      return true;
    }

    case 'CHANGE_MONTH': {
      const { direction } = action.payload;
      const currentDate = new Date(
        draftState.ui.activePlannerDay || new Date()
      );
      const newDate = new Date(currentDate);
      const monthAdjustment = direction === 'next' ? 1 : -1;
      newDate.setMonth(currentDate.getMonth() + monthAdjustment);
      draftState.ui.activePlannerDay = newDate.toISOString().split('T')[0];
      return true;
    }

    case 'GO_TO_TODAY': {
      const todayStr = new Date().toISOString().split('T')[0];
      draftState.ui.activePlannerDay = todayStr;
      return true;
    }

    case 'CLEAR_SELECTION': {
      draftState.ui.selectedCells.clear();
      return true;
    }

    default:
      return false;
  }
}
