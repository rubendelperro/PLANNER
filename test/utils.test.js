import { describe, it, expect } from 'vitest';
import { getRacionesToShow, validateServings } from '../utils.js';

describe('getRacionesToShow', () => {
  it('returns recipeEditor raciones when editing', () => {
    const recipe = { id: 'r1', raciones: 3 };
    const ui = {
      recipeEditor: { isEditing: true, recipeId: 'r1', raciones: 5 },
    };
    expect(getRacionesToShow(recipe, ui)).toBe(5);
  });

  it('returns recipe raciones when not editing', () => {
    const recipe = { id: 'r1', raciones: 3 };
    const ui = {
      recipeEditor: { isEditing: false, recipeId: null, raciones: 5 },
    };
    expect(getRacionesToShow(recipe, ui)).toBe(3);
  });

  it('returns 1 if raciones undefined in both', () => {
    const recipe = { id: 'r1' }; // raciones undefined
    const ui = { recipeEditor: { isEditing: false } };
    expect(getRacionesToShow(recipe, ui)).toBe(1);
  });

  it('returns 1 if recipe raciones are 0 or null', () => {
    const recipeZero = { id: 'r1', raciones: 0 };
    const ui = { recipeEditor: { isEditing: false } };
    expect(getRacionesToShow(recipeZero, ui)).toBe(1);

    const recipeNull = { id: 'r1', raciones: null };
    expect(getRacionesToShow(recipeNull, ui)).toBe(1);
  });
});

describe('validateServings', () => {
  it('returns 1 when input is less than 1 (0 or negative)', () => {
    expect(validateServings(0)).toBe(1);
    expect(validateServings(-5)).toBe(1);
  });

  it('returns 20 when input is greater than 20', () => {
    expect(validateServings(21)).toBe(20);
    expect(validateServings(100)).toBe(20);
  });

  it('returns the same number when input is within range', () => {
    expect(validateServings(5)).toBe(5);
    expect(validateServings(1)).toBe(1);
    expect(validateServings(20)).toBe(20);
  });

  it('returns 1 when input is not a number (null, undefined, text)', () => {
    expect(validateServings(null)).toBe(1);
    expect(validateServings(undefined)).toBe(1);
    expect(validateServings('texto')).toBe(1);
  });
});
