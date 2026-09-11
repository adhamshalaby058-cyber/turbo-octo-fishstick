import { addDays } from '../core/dates';
import { defaultState, uid } from '../core/storage';
import type { AppState, FoodEntry, Meal } from '../core/types';

type Item = [foodId: string, grams: number, meal: Meal];

const BREAKFASTS: Item[][] = [
  [['oats', 60, 'breakfast'], ['milk_2', 250, 'breakfast'], ['banana', 118, 'breakfast']],
  [['greek_yogurt', 200, 'breakfast'], ['blueberries', 100, 'breakfast'], ['granola', 40, 'breakfast']],
  [['egg', 100, 'breakfast'], ['bread_ww', 64, 'breakfast'], ['avocado', 50, 'breakfast']],
  [['coffee_milk', 240, 'breakfast']],
];
const LUNCHES: Item[][] = [
  [['chicken_breast', 150, 'lunch'], ['rice_white', 200, 'lunch'], ['broccoli', 100, 'lunch']],
  [['tuna_canned', 100, 'lunch'], ['bread_ww', 64, 'lunch'], ['tomato', 80, 'lunch']],
  [['burger', 150, 'lunch'], ['chips', 40, 'lunch']],
  [['lentils', 200, 'lunch'], ['quinoa', 150, 'lunch'], ['spinach', 50, 'lunch']],
  [['pasta', 200, 'lunch'], ['chicken_thigh', 120, 'lunch'], ['olive_oil', 10, 'lunch']],
];
const DINNERS: Item[][] = [
  [['salmon', 150, 'dinner'], ['potato', 200, 'dinner'], ['green_beans', 120, 'dinner']],
  [['beef_lean', 150, 'dinner'], ['tortilla', 90, 'dinner'], ['bell_pepper', 80, 'dinner'], ['cheddar', 30, 'dinner']],
  [['pizza', 320, 'dinner'], ['beer', 355, 'dinner']],
  [['tofu', 150, 'dinner'], ['rice_brown', 200, 'dinner'], ['kale', 60, 'dinner']],
  [['pork_loin', 150, 'dinner'], ['sweet_potato', 200, 'dinner'], ['brussels', 100, 'dinner']],
];
const SNACKS: Item[][] = [
  [['apple', 180, 'snack']],
  [['almonds', 30, 'snack']],
  [['protein_bar', 60, 'snack']],
  [['dark_chocolate', 30, 'snack'], ['orange', 130, 'snack']],
  [],
];

/** Deterministic pseudo-random so the sample looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** ~3 weeks of plausible logs plus weigh-ins ending yesterday, so today starts empty. */
export function sampleState(today: string): AppState {
  const rand = rng(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const entries: FoodEntry[] = [];
  const days = 24;
  for (let i = days; i >= 1; i--) {
    const date = addDays(today, -i);
    const dow = new Date(date + 'T12:00:00').getDay();
    const weekend = dow === 0 || dow === 6;
    if (rand() < 0.08) continue; // an unlogged day now and then
    const meals: Item[] = [...pick(BREAKFASTS), ...pick(LUNCHES), ...pick(DINNERS), ...pick(SNACKS)];
    if (weekend) meals.push(pick([['pizza', 214, 'snack'], ['beer', 355, 'snack'], ['chips', 56, 'snack']] as Item[]));
    let t = 8 * 3600_000;
    for (const [foodId, grams, meal] of meals) {
      const jitter = 0.85 + rand() * 0.3;
      entries.push({ id: uid(), foodId, grams: Math.round((grams * jitter) / 5) * 5, date, meal, loggedAt: Date.parse(date) + t });
      t += 3600_000;
    }
  }
  // A slow, noisy downward weight trend.
  const weights = [];
  for (let i = days; i >= 1; i -= 3) {
    const date = addDays(today, -i);
    weights.push({ date, weightKg: Math.round((76.5 - (days - i) * 0.04 + (rand() - 0.5) * 0.6) * 10) / 10 });
  }
  return {
    ...defaultState(),
    profile: { sex: 'male', age: 32, heightCm: 178, weightKg: 75.5, activity: 'moderate', goal: 'lose', weeklyRateKg: 0.4 },
    entries,
    weights,
  };
}
