import { describe, expect, it } from 'vitest';
import { BUILTIN_FOODS } from '../data/foods';
import { learnFoodHabits } from '../core/learning';
import { computeGaps, gapClosers, gramsToSupply, MAX_PORTION_GRAMS, mealBudget, recommend, weakestMicros } from '../core/recommend';
import { sumEntries } from '../core/intake';
import { computeTargets, DEFAULT_PROFILE } from '../core/targets';
import { emptyNutrients, scaleNutrients } from '../core/types';
import { entry, lookup, TODAY } from './helpers';

const targets = computeTargets(DEFAULT_PROFILE);

describe('gaps', () => {
  it('reports remaining amounts', () => {
    const consumed = { ...emptyNutrients(), calories: 1000, protein: 50 };
    const gaps = computeGaps(consumed, targets);
    expect(gaps.find((g) => g.key === 'protein')!.remaining).toBe(targets.protein - 50);
    expect(gaps.find((g) => g.key === 'calories')!.ratio).toBeCloseTo(1000 / targets.calories);
  });

  it('computes grams needed to supply a nutrient', () => {
    const chicken = lookup('chicken_breast')!;
    expect(gramsToSupply(chicken, 'protein', 31)).toBeCloseTo(100);
    expect(gramsToSupply(lookup('olive_oil')!, 'protein', 10)).toBe(Infinity);
  });

  it('ranks gap closers by calorie cost', () => {
    const closers = gapClosers('vitaminC', 60, BUILTIN_FOODS, { limit: 3 });
    expect(closers.length).toBe(3);
    expect(closers[0].calories).toBeLessThanOrEqual(closers[1].calories);
    expect(closers.every((c) => c.grams <= 400)).toBe(true);
  });

  it('lists the weakest micros first', () => {
    const consumed = { ...emptyNutrients(), vitaminC: 60, iron: 1 };
    const weak = weakestMicros(consumed, targets);
    expect(weak[0].key).not.toBe('vitaminC');
    expect(weak.some((g) => g.key === 'iron')).toBe(true);
    expect(weak.some((g) => g.key === 'sodium')).toBe(false);
  });
});

describe('recommend', () => {
  it('stays within the calorie budget and closes the protein gap', () => {
    // A realistic low-protein day so far: bread, rice, oil and a banana.
    const consumed = sumEntries(
      [entry('bread_white', 120, TODAY), entry('rice_white', 400, TODAY), entry('olive_oil', 30, TODAY), entry('banana', 120, TODAY)],
      lookup,
    );
    const res = recommend(consumed, targets, BUILTIN_FOODS, { maxItems: 4 });
    expect(res.items.length).toBeGreaterThan(0);
    const added = res.items.reduce((s, i) => s + i.nutrients.calories, 0);
    expect(added).toBeLessThanOrEqual(res.calorieBudget * 1.1 + 30);
    // The plan should close most of the protein gap without any item exceeding the portion cap.
    const gapBefore = targets.protein - consumed.protein;
    const gapAfter = Math.max(0, targets.protein - res.consumedAfter.protein);
    expect(gapAfter).toBeLessThan(gapBefore * 0.3);
    expect(res.items.some((i) => i.food.per100g.protein > 15)).toBe(true);
    expect(res.items.every((i) => i.grams <= MAX_PORTION_GRAMS)).toBe(true);
    expect(res.items[0].reasons.some((r) => /protein/.test(r))).toBe(true);
  });

  it('recommends nothing when there are no calories left', () => {
    const consumed = { ...targets };
    const res = recommend(consumed, targets, BUILTIN_FOODS);
    expect(res.items).toEqual([]);
  });

  it('prefers foods the user habitually eats at that meal', () => {
    const consumed = { ...emptyNutrients(), calories: 300, protein: 20 };
    const entries = [];
    for (let i = 1; i <= 10; i++) entries.push(entry('greek_yogurt', 200, `2026-09-0${(i % 9) + 1}`, 'breakfast'));
    const habits = learnFoodHabits(entries, TODAY);
    // A breakfast-sized budget, as the app would pass from the learned meal share.
    const base = { maxItems: 4, calorieBudget: 600, meal: 'breakfast' as const };
    const without = recommend(consumed, targets, BUILTIN_FOODS, base);
    const withHabits = recommend(consumed, targets, BUILTIN_FOODS, { ...base, habits });
    const rankWithout = without.items.findIndex((i) => i.food.id === 'greek_yogurt');
    const rankWith = withHabits.items.findIndex((i) => i.food.id === 'greek_yogurt');
    expect(rankWith).toBeGreaterThanOrEqual(0);
    expect(rankWithout === -1 || rankWith <= rankWithout).toBe(true);
    // The suggested portion is at least the one the user usually eats, never above the cap.
    expect(withHabits.items[rankWith].grams).toBeGreaterThanOrEqual(200);
    expect(withHabits.items[rankWith].grams).toBeLessThanOrEqual(MAX_PORTION_GRAMS);
    // Every plan respects the meal budget.
    for (const r of [without, withHabits]) {
      const kcal = r.items.reduce((s, i) => s + i.nutrients.calories, 0);
      expect(kcal).toBeLessThanOrEqual(600 * 1.1 + 30);
    }
  });

  it('avoids pushing sodium over the limit', () => {
    const consumed = { ...emptyNutrients(), calories: 1500, sodium: 2250, protein: 60 };
    const res = recommend(consumed, targets, BUILTIN_FOODS, { maxItems: 3 });
    for (const item of res.items) expect(item.food.per100g.sodium).toBeLessThan(400);
  });

  it('respects excludes and honours eaten-today variety', () => {
    const consumed = { ...emptyNutrients(), calories: 1600, protein: 40 };
    const exclude = new Set(['chicken_breast', 'turkey_breast', 'cod', 'egg_white', 'whey_protein', 'shrimp', 'tuna_canned']);
    const res = recommend(consumed, targets, BUILTIN_FOODS, { excludeIds: exclude });
    for (const item of res.items) expect(exclude.has(item.food.id)).toBe(false);
  });

  it('portion nutrients scale with grams', () => {
    const consumed = { ...emptyNutrients(), calories: 1500, protein: 60 };
    const res = recommend(consumed, targets, BUILTIN_FOODS, { maxItems: 1 });
    const item = res.items[0];
    expect(item.nutrients).toEqual(scaleNutrients(item.food.per100g, item.grams / 100));
  });
});

describe('mealBudget', () => {
  it('splits the remaining calories according to learned meal share', () => {
    const share = { breakfast: 0.2, lunch: 0.3, dinner: 0.4, snack: 0.1 };
    const lunch = mealBudget('lunch', 1600, share, new Set(['breakfast']));
    expect(lunch).toBeCloseTo(1600 * (0.3 / 0.8));
    const dinnerOnly = mealBudget('dinner', 700, share, new Set(['breakfast', 'lunch', 'snack']));
    expect(dinnerOnly).toBe(700);
  });
});
