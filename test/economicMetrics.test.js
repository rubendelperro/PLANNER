import { describe, it, expect } from 'vitest';

// These tests replicate the price-per-serving calculation implemented in render.js
// Formula used by the app:
// 1) If price, packageGrams and servingSizeGrams are available:
//    pricePerServing = price * (servingSizeGrams / packageGrams)
// 2) Else if price and units are available:
//    pricePerServing = price / units

function computePricePerServing({
  price,
  packageGrams,
  units,
  servingSizeGrams,
}) {
  if (typeof price !== 'number' || isNaN(price) || price <= 0) return null;
  const hasGrams =
    typeof packageGrams === 'number' &&
    !isNaN(packageGrams) &&
    packageGrams > 0;
  const hasUnits = typeof units === 'number' && !isNaN(units) && units > 0;

  if (
    hasGrams &&
    typeof servingSizeGrams === 'number' &&
    servingSizeGrams > 0
  ) {
    return (price * servingSizeGrams) / packageGrams;
  }
  if (hasUnits) {
    return price / units;
  }
  return null;
}

describe('price per serving calculation (replicated)', () => {
  it('calculates price per serving using package grams and serving size', () => {
    const input = {
      price: 2.5,
      packageGrams: 500,
      units: undefined,
      servingSizeGrams: 125,
    };
    // expected: 2.5 * (125 / 500) = 2.5 * 0.25 = 0.625
    expect(computePricePerServing(input)).toBeCloseTo(0.625, 6);
  });

  it('falls back to price per unit when units present and no valid grams/serving', () => {
    const input = {
      price: 3,
      packageGrams: undefined,
      units: 6,
      servingSizeGrams: undefined,
    };
    // expected: 3 / 6 = 0.5
    expect(computePricePerServing(input)).toBeCloseTo(0.5, 6);
  });

  it('returns null when price missing or invalid', () => {
    const input = {
      price: 'not-a-number',
      packageGrams: 500,
      units: undefined,
      servingSizeGrams: 100,
    };
    expect(computePricePerServing(input)).toBeNull();

    const input2 = { price: 0, packageGrams: 500, servingSizeGrams: 100 };
    expect(computePricePerServing(input2)).toBeNull();
  });
});
