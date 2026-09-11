import { addNutrients, emptyNutrients, type Food, type FoodEntry, type Meal, type Nutrients } from './types';

export type FoodLookup = (id: string) => Food | undefined;

export function makeFoodLookup(builtin: Food[], custom: Food[]): FoodLookup {
  const map = new Map<string, Food>();
  for (const f of builtin) map.set(f.id, f);
  for (const f of custom) map.set(f.id, f);
  return (id) => map.get(id);
}

export function entryNutrients(entry: FoodEntry, lookup: FoodLookup): Nutrients {
  const food = lookup(entry.foodId);
  if (!food) return emptyNutrients();
  return addNutrients(emptyNutrients(), food.per100g, entry.grams / 100);
}

export function sumEntries(entries: FoodEntry[], lookup: FoodLookup): Nutrients {
  let total = emptyNutrients();
  for (const e of entries) {
    const food = lookup(e.foodId);
    if (food) total = addNutrients(total, food.per100g, e.grams / 100);
  }
  return total;
}

export function entriesForDate(entries: FoodEntry[], date: string): FoodEntry[] {
  return entries.filter((e) => e.date === date);
}

export interface DayTotals {
  date: string;
  nutrients: Nutrients;
  entryCount: number;
  byMeal: Record<Meal, Nutrients>;
}

/** Totals for each date in `dates` (days without entries have zero totals and entryCount 0). */
export function dailyTotals(entries: FoodEntry[], lookup: FoodLookup, dates: string[]): DayTotals[] {
  const byDate = new Map<string, FoodEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }
  return dates.map((date) => {
    const list = byDate.get(date) ?? [];
    const byMeal: Record<Meal, Nutrients> = {
      breakfast: emptyNutrients(),
      lunch: emptyNutrients(),
      dinner: emptyNutrients(),
      snack: emptyNutrients(),
    };
    for (const e of list) {
      const food = lookup(e.foodId);
      if (food) byMeal[e.meal] = addNutrients(byMeal[e.meal], food.per100g, e.grams / 100);
    }
    return { date, nutrients: sumEntries(list, lookup), entryCount: list.length, byMeal };
  });
}
