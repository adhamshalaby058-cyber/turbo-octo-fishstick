import type { FoodHabit } from './learning';
import {
  addNutrients,
  emptyNutrients,
  MICRO_KEYS,
  NUTRIENT_KEYS,
  NUTRIENT_META,
  scaleNutrients,
  type Food,
  type Meal,
  type NutrientKey,
  type Nutrients,
  type Targets,
} from './types';

/** How much each nutrient counts when scoring a food's contribution. */
const WEIGHTS: Record<NutrientKey, number> = {
  calories: 1.0,
  protein: 3.5,
  carbs: 0.8,
  fat: 0.8,
  fiber: 1.2,
  sugar: 0,
  sodium: 0,
  potassium: 0.35,
  calcium: 0.4,
  iron: 0.45,
  magnesium: 0.35,
  zinc: 0.35,
  vitaminA: 0.3,
  vitaminC: 0.3,
  vitaminD: 0.45,
  vitaminB12: 0.4,
  folate: 0.3,
};

export interface NutrientGap {
  key: NutrientKey;
  target: number;
  consumed: number;
  /** Positive = still needed; for limit nutrients, positive = headroom left. */
  remaining: number;
  /** consumed / target */
  ratio: number;
}

export function computeGaps(consumed: Nutrients, targets: Targets): NutrientGap[] {
  return NUTRIENT_KEYS.map((key) => {
    const target = targets[key];
    const c = consumed[key];
    return { key, target, consumed: c, remaining: target - c, ratio: target > 0 ? c / target : 0 };
  });
}

/** Grams of `food` needed to supply `amount` of `key`, or Infinity if the food contains none. */
export function gramsToSupply(food: Food, key: NutrientKey, amount: number): number {
  const per100 = food.per100g[key];
  if (per100 <= 0) return Infinity;
  return (amount / per100) * 100;
}

export interface Fill {
  key: NutrientKey;
  amount: number;
  /** Fraction of the daily target this portion supplies. */
  pctOfTarget: number;
}

export interface Recommendation {
  food: Food;
  grams: number;
  nutrients: Nutrients;
  score: number;
  /** Top nutrient contributions for this portion. */
  fills: Fill[];
  /** Human-readable reasons. */
  reasons: string[];
}

export interface RecommendOptions {
  /** Max foods in the plan. */
  maxItems?: number;
  /** Calorie budget to work within (defaults to remaining calories). */
  calorieBudget?: number;
  /** Meal the recommendation is for; boosts foods you usually eat at that meal. */
  meal?: Meal;
  /** Foods eaten today (for variety). */
  eatenTodayIds?: Set<string>;
  /** Foods to exclude entirely (dislikes). */
  excludeIds?: Set<string>;
  /** Learned habits; when present, familiar foods get a boost. 0..1 strength. */
  habits?: Map<string, FoodHabit>;
  habitStrength?: number;
}

export interface RecommendResult {
  items: Recommendation[];
  gapsBefore: NutrientGap[];
  gapsAfter: NutrientGap[];
  consumedAfter: Nutrients;
  calorieBudget: number;
}

interface Scored {
  score: number;
  grams: number;
  nutrients: Nutrients;
}

function scorePortion(
  food: Food,
  grams: number,
  consumed: Nutrients,
  targets: Targets,
  calorieBudget: number,
): Scored {
  const n = scaleNutrients(food.per100g, grams / 100);
  let score = 0;

  for (const key of NUTRIENT_KEYS) {
    const target = targets[key];
    if (target <= 0) continue;
    const meta = NUTRIENT_META[key];
    if (meta.limit) {
      // Penalise pushing sugar / sodium over their limit.
      const after = consumed[key] + n[key];
      if (after > target) score -= ((after - target) / target) * 1.5 * (n[key] / Math.max(1, n[key] + 1e-9));
      continue;
    }
    if (key === 'calories') continue;
    const remaining = Math.max(0, target - consumed[key]);
    const fill = Math.min(n[key], remaining) / target;
    score += fill * WEIGHTS[key];
    // Over-shooting macros is wasteful (micros overshooting is fine, so ignore it).
    if (key === 'protein' || key === 'carbs' || key === 'fat') {
      const over = Math.max(0, n[key] - remaining) / target;
      score -= over * WEIGHTS[key] * 0.6;
    }
  }

  // Calories: filling the budget is good; blowing through it is bad, and more
  // than 10% over the budget is never acceptable.
  if (n.calories > calorieBudget * 1.1) return { score: -Infinity, grams, nutrients: n };
  const calFill = Math.min(n.calories, calorieBudget) / Math.max(1, targets.calories);
  score += calFill * WEIGHTS.calories;
  const calOver = Math.max(0, n.calories - calorieBudget);
  if (calOver > 0) score -= (calOver / Math.max(100, calorieBudget)) * 6;

  // Prefer nutrient density: reward score per calorie a little so that a
  // small nutrient-dense portion beats a large calorie-dense one at equal fill.
  const density = n.calories > 0 ? score / (n.calories / 100) : score;
  score += density * 0.3;

  return { score, grams, nutrients: n };
}

/** Largest single portion the recommender will ever suggest, in grams. */
export const MAX_PORTION_GRAMS = 400;

/**
 * Candidate portion sizes for a food in grams: half a serving up to double,
 * plus the portion the user usually logs, never above the cap.
 */
function candidatePortions(food: Food, usualGrams?: number): number[] {
  const s = food.servingGrams;
  const set = new Set<number>();
  for (const m of [0.5, 0.75, 1, 1.5, 2]) set.add(Math.min(MAX_PORTION_GRAMS, Math.round(s * m)));
  if (usualGrams && usualGrams > 0) set.add(Math.min(MAX_PORTION_GRAMS, Math.round(usualGrams / 5) * 5));
  return [...set].filter((g) => g >= 5);
}

export function bestPortion(
  food: Food,
  consumed: Nutrients,
  targets: Targets,
  calorieBudget: number,
  usualGrams?: number,
): Scored {
  let best: Scored | undefined;
  for (const grams of candidatePortions(food, usualGrams)) {
    const s = scorePortion(food, grams, consumed, targets, calorieBudget);
    if (!best || s.score > best.score) best = s;
  }
  return best!;
}

function describeFills(n: Nutrients, targets: Targets, consumed: Nutrients): Fill[] {
  const fills: Fill[] = [];
  for (const key of NUTRIENT_KEYS) {
    if (key === 'calories' || NUTRIENT_META[key].limit) continue;
    const target = targets[key];
    if (target <= 0 || n[key] <= 0) continue;
    const remaining = Math.max(0, target - consumed[key]);
    const useful = Math.min(n[key], remaining);
    if (useful <= 0) continue;
    fills.push({ key, amount: n[key], pctOfTarget: n[key] / target });
  }
  return fills.sort((a, b) => b.pctOfTarget - a.pctOfTarget);
}

function fmt(v: number, unit: string): string {
  const r = v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
  return `${r} ${unit}`;
}

/**
 * Build a greedy plan of foods and portions that closes today's nutrient gaps
 * within the remaining calorie budget. Each step picks the single best
 * (food, grams) pair, adds it to the running total, and repeats.
 */
export function recommend(
  consumed: Nutrients,
  targets: Targets,
  foods: Food[],
  opts: RecommendOptions = {},
): RecommendResult {
  const maxItems = opts.maxItems ?? 4;
  const habitStrength = opts.habitStrength ?? 0.5;
  const gapsBefore = computeGaps(consumed, targets);
  const calorieBudget = Math.max(0, opts.calorieBudget ?? targets.calories - consumed.calories);

  let running = { ...consumed };
  let budget = calorieBudget;
  const chosen = new Set<string>();
  const items: Recommendation[] = [];

  // Normalise habit scores to 0..1 for the boost.
  let maxHabit = 0;
  if (opts.habits) for (const h of opts.habits.values()) maxHabit = Math.max(maxHabit, h.score);

  for (let step = 0; step < maxItems; step++) {
    if (budget < 40) break;
    let best: { food: Food; scored: Scored; finalScore: number } | undefined;

    for (const food of foods) {
      if (chosen.has(food.id) || opts.excludeIds?.has(food.id)) continue;
      const h = opts.habits?.get(food.id);
      const scored = bestPortion(food, running, targets, budget, h?.avgGrams);
      if (!Number.isFinite(scored.score) || scored.score <= 0) continue;

      let finalScore = scored.score;
      // Learned preference: foods you already eat get a boost; foods you eat at this meal get more.
      if (h && maxHabit > 0) {
        const familiarity = h.score / maxHabit;
        const mealAffinity = opts.meal && h.count > 0 ? h.mealCounts[opts.meal] / h.count : 0;
        // Up to 1 + 2·strength for a food you eat all the time at exactly this meal.
        finalScore *= 1 + habitStrength * familiarity * (1 + mealAffinity);
      }
      // Variety: mild penalty for something already eaten today.
      if (opts.eatenTodayIds?.has(food.id)) finalScore *= 0.85;

      if (!best || finalScore > best.finalScore) best = { food, scored, finalScore };
    }

    if (!best) break;
    const { food, scored } = best;
    const fills = describeFills(scored.nutrients, targets, running);
    const reasons = fills
      .slice(0, 3)
      .map((f) => `+${fmt(f.amount, NUTRIENT_META[f.key].unit)} ${NUTRIENT_META[f.key].label.toLowerCase()} (${Math.round(f.pctOfTarget * 100)}% of target)`);
    items.push({ food, grams: scored.grams, nutrients: scored.nutrients, score: best.finalScore, fills, reasons });
    running = addNutrients(running, scored.nutrients);
    budget -= scored.nutrients.calories;
    chosen.add(food.id);
  }

  return {
    items,
    gapsBefore,
    gapsAfter: computeGaps(running, targets),
    consumedAfter: running,
    calorieBudget,
  };
}

/**
 * For a single nutrient shortfall, list the foods that close it most efficiently:
 * the grams needed and the calories that portion costs.
 */
export interface GapCloser {
  food: Food;
  grams: number;
  calories: number;
}

export function gapClosers(
  key: NutrientKey,
  amountNeeded: number,
  foods: Food[],
  opts: { limit?: number; maxGrams?: number; excludeIds?: Set<string> } = {},
): GapCloser[] {
  const limit = opts.limit ?? 5;
  const maxGrams = opts.maxGrams ?? 400;
  const out: GapCloser[] = [];
  for (const food of foods) {
    if (opts.excludeIds?.has(food.id)) continue;
    const grams = gramsToSupply(food, key, amountNeeded);
    if (!Number.isFinite(grams) || grams > maxGrams) continue;
    const calories = (food.per100g.calories * grams) / 100;
    out.push({ food, grams: Math.round(grams), calories: Math.round(calories) });
  }
  // Cheapest in calories first, then least grams.
  return out.sort((a, b) => a.calories - b.calories || a.grams - b.grams).slice(0, limit);
}

/** Micronutrients currently under 70% of target, most deficient first. */
export function weakestMicros(consumed: Nutrients, targets: Targets, threshold = 0.7): NutrientGap[] {
  return computeGaps(consumed, targets)
    .filter((g) => (MICRO_KEYS as readonly string[]).includes(g.key) && !NUTRIENT_META[g.key].limit && g.ratio < threshold)
    .sort((a, b) => a.ratio - b.ratio);
}

/**
 * Calorie budget for a specific upcoming meal, using the learned meal share so
 * that a lunch recommendation leaves room for the dinner you usually eat.
 */
export function mealBudget(
  meal: Meal,
  remainingCalories: number,
  mealShare: Record<Meal, number>,
  mealsAlreadyEaten: Set<Meal>,
): number {
  const order: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const pending = order.filter((m) => !mealsAlreadyEaten.has(m));
  if (!pending.includes(meal)) pending.push(meal);
  const total = pending.reduce((s, m) => s + mealShare[m], 0);
  if (total <= 0) return remainingCalories;
  return Math.max(0, remainingCalories * (mealShare[meal] / total));
}

export { emptyNutrients };
