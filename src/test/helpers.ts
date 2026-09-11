import { BUILTIN_FOODS } from '../data/foods';
import { addDays } from '../core/dates';
import { makeFoodLookup } from '../core/intake';
import type { FoodEntry, Meal } from '../core/types';

export const lookup = makeFoodLookup(BUILTIN_FOODS, []);
export const TODAY = '2026-09-11';

let counter = 0;
export function entry(foodId: string, grams: number, date: string, meal: Meal = 'lunch'): FoodEntry {
  counter += 1;
  return { id: `e${counter}`, foodId, grams, date, meal, loggedAt: 0 };
}

/** Build `days` days of a repeating daily menu ending today. */
export function history(days: number, menu: { foodId: string; grams: number; meal: Meal }[], endDate = TODAY): FoodEntry[] {
  const out: FoodEntry[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    for (const m of menu) out.push(entry(m.foodId, m.grams, date, m.meal));
  }
  return out;
}
