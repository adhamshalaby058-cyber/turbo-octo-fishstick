import { daysBetween, isWeekend, lastNDays } from './dates';
import { dailyTotals, type DayTotals, type FoodLookup } from './intake';
import { formulaTdee, KCAL_PER_KG } from './targets';
import {
  emptyNutrients,
  MEALS,
  NUTRIENT_KEYS,
  NUTRIENT_META,
  type FoodEntry,
  type Meal,
  type NutrientKey,
  type Nutrients,
  type Profile,
  type Targets,
  type WeightLog,
} from './types';

// ---------------------------------------------------------------------------
// Adaptive energy expenditure
// ---------------------------------------------------------------------------

export interface TdeeEstimate {
  /** Best estimate of maintenance calories. */
  tdee: number;
  /** Formula-only estimate (Mifflin-St Jeor × activity). */
  formula: number;
  /** Observed estimate from intake vs weight change, when available. */
  observed?: number;
  /** 0..1 how much the observed estimate is trusted. */
  confidence: number;
  /** Number of logged days used. */
  daysUsed: number;
  /** Observed weight trend in kg/week (from regression), when available. */
  weightTrendKgPerWeek?: number;
  note: string;
}

function linearSlope(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Estimate maintenance calories by reconciling logged intake with the observed
 * weight trend. With enough data this replaces the textbook formula, which is
 * often off by several hundred kcal for an individual.
 *
 *   observedTdee = avgIntake − (weightSlopeKgPerDay × 7700)
 */
export function estimateTdee(
  profile: Profile,
  entries: FoodEntry[],
  weights: WeightLog[],
  lookup: FoodLookup,
  today: string,
  windowDays = 28,
): TdeeEstimate {
  const formula = Math.round(formulaTdee(profile));
  const dates = lastNDays(today, windowDays);
  const totals = dailyTotals(entries, lookup, dates).filter((d) => d.entryCount > 0);
  // Only consider days that look fully logged (≥ 800 kcal) to avoid half-logged days biasing intake down.
  const logged = totals.filter((d) => d.nutrients.calories >= 800);
  const win = weights
    .filter((w) => dates.includes(w.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (logged.length < 10 || win.length < 3 || daysBetween(win[0].date, win[win.length - 1].date) < 10) {
    return {
      tdee: formula,
      formula,
      confidence: 0,
      daysUsed: logged.length,
      note:
        'Using the formula estimate. Log at least 10 full days of food and 3 weigh-ins over 10+ days to unlock adaptive calibration.',
    };
  }

  const avgIntake = logged.reduce((s, d) => s + d.nutrients.calories, 0) / logged.length;
  const start = win[0].date;
  const slopePerDay = linearSlope(win.map((w) => ({ x: daysBetween(start, w.date), y: w.weightKg })));
  const observedRaw = avgIntake - slopePerDay * KCAL_PER_KG;
  // Guard against wildly noisy input.
  const observed = Math.round(Math.min(formula * 1.35, Math.max(formula * 0.65, observedRaw)));

  const span = daysBetween(win[0].date, win[win.length - 1].date);
  const confidence = Math.min(1, (logged.length / windowDays) * 0.6 + Math.min(1, span / windowDays) * 0.4);
  const tdee = Math.round(formula * (1 - confidence) + observed * confidence);

  const diff = tdee - formula;
  const dir = diff >= 0 ? 'higher' : 'lower';
  return {
    tdee,
    formula,
    observed,
    confidence,
    daysUsed: logged.length,
    weightTrendKgPerWeek: slopePerDay * 7,
    note: `Adaptive estimate is ${Math.abs(diff)} kcal ${dir} than the formula, based on ${logged.length} logged days and ${win.length} weigh-ins.`,
  };
}

// ---------------------------------------------------------------------------
// Food habits (what you eat, how much, and when)
// ---------------------------------------------------------------------------

export interface FoodHabit {
  foodId: string;
  /** Recency-decayed frequency score. */
  score: number;
  count: number;
  mealCounts: Record<Meal, number>;
  avgGrams: number;
  lastEaten: string;
}

/**
 * Learn frequency-weighted, recency-decayed food preferences and which meals
 * each food tends to show up in.
 */
export function learnFoodHabits(entries: FoodEntry[], today: string, halfLifeDays = 14): Map<string, FoodHabit> {
  const map = new Map<string, FoodHabit>();
  let gramsSum = new Map<string, number>();
  for (const e of entries) {
    const age = Math.max(0, daysBetween(e.date, today));
    const w = Math.pow(0.5, age / halfLifeDays);
    let h = map.get(e.foodId);
    if (!h) {
      h = {
        foodId: e.foodId,
        score: 0,
        count: 0,
        mealCounts: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
        avgGrams: 0,
        lastEaten: e.date,
      };
      map.set(e.foodId, h);
    }
    h.score += w;
    h.count += 1;
    h.mealCounts[e.meal] += 1;
    if (e.date > h.lastEaten) h.lastEaten = e.date;
    gramsSum.set(e.foodId, (gramsSum.get(e.foodId) ?? 0) + e.grams);
  }
  for (const h of map.values()) h.avgGrams = (gramsSum.get(h.foodId) ?? 0) / h.count;
  return map;
}

// ---------------------------------------------------------------------------
// Trends & insights
// ---------------------------------------------------------------------------

export interface NutrientAdherence {
  key: NutrientKey;
  /** Mean of daily intake / target over logged days (1 = on target). */
  avgRatio: number;
  daysBelow: number;
  daysAbove: number;
  loggedDays: number;
  /** Change in the 7-day average vs the prior 7 days, as a ratio of target. */
  weeklyDelta: number;
}

export interface Insight {
  level: 'good' | 'warn' | 'info';
  text: string;
  nutrient?: NutrientKey;
}

export interface TrendReport {
  loggedDays: number;
  days: DayTotals[];
  avg7: Nutrients;
  avg28: Nutrients;
  /** Exponentially weighted moving average of daily intake (α = 0.25). */
  ewma: Nutrients;
  weekdayAvg: Nutrients;
  weekendAvg: Nutrients;
  /** Linear trend in daily calories over the window, kcal per day per day. */
  calorieSlopePerDay: number;
  /** Fraction of calories eaten at each meal, learned from history. */
  mealShare: Record<Meal, number>;
  adherence: NutrientAdherence[];
  insights: Insight[];
}

function avgOf(days: DayTotals[]): Nutrients {
  const out = emptyNutrients();
  if (days.length === 0) return out;
  for (const d of days) for (const k of NUTRIENT_KEYS) out[k] += d.nutrients[k];
  for (const k of NUTRIENT_KEYS) out[k] /= days.length;
  return out;
}

export function defaultMealShare(): Record<Meal, number> {
  return { breakfast: 0.25, lunch: 0.3, dinner: 0.35, snack: 0.1 };
}

export function analyzeTrends(
  entries: FoodEntry[],
  lookup: FoodLookup,
  targets: Targets,
  today: string,
  windowDays = 28,
): TrendReport {
  const dates = lastNDays(today, windowDays);
  const days = dailyTotals(entries, lookup, dates);
  // Exclude today from averages unless it looks complete, since it is usually partial.
  const past = days.filter((d) => d.entryCount > 0 && (d.date !== today || d.nutrients.calories >= targets.calories * 0.8));
  const last7 = past.filter((d) => daysBetween(d.date, today) < 7);
  const prev7 = past.filter((d) => daysBetween(d.date, today) >= 7 && daysBetween(d.date, today) < 14);

  const avg7 = avgOf(last7);
  const avg28 = avgOf(past);
  const weekdayAvg = avgOf(past.filter((d) => !isWeekend(d.date)));
  const weekendAvg = avgOf(past.filter((d) => isWeekend(d.date)));

  const ewma = emptyNutrients();
  const alpha = 0.25;
  past.forEach((d, i) => {
    for (const k of NUTRIENT_KEYS) ewma[k] = i === 0 ? d.nutrients[k] : alpha * d.nutrients[k] + (1 - alpha) * ewma[k];
  });

  const calorieSlopePerDay = linearSlope(
    past.map((d) => ({ x: daysBetween(d.date, today) * -1, y: d.nutrients.calories })),
  );

  // Meal share
  const mealShare = defaultMealShare();
  if (past.length >= 3) {
    const sums: Record<Meal, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    let total = 0;
    for (const d of past)
      for (const m of MEALS) {
        sums[m] += d.byMeal[m].calories;
        total += d.byMeal[m].calories;
      }
    if (total > 0) for (const m of MEALS) mealShare[m] = sums[m] / total;
  }

  // Adherence per nutrient
  const adherence: NutrientAdherence[] = NUTRIENT_KEYS.map((k) => {
    const t = targets[k] || 1;
    const ratios = past.map((d) => d.nutrients[k] / t);
    const avgRatio = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
    const prevAvg = prev7.length ? prev7.reduce((s, d) => s + d.nutrients[k], 0) / prev7.length : 0;
    const curAvg = last7.length ? last7.reduce((s, d) => s + d.nutrients[k], 0) / last7.length : 0;
    return {
      key: k,
      avgRatio,
      daysBelow: ratios.filter((r) => r < 0.8).length,
      daysAbove: ratios.filter((r) => r > 1.2).length,
      loggedDays: ratios.length,
      weeklyDelta: prev7.length && last7.length ? (curAvg - prevAvg) / t : 0,
    };
  });

  const insights = buildInsights({ past, last7, avg7, weekdayAvg, weekendAvg, calorieSlopePerDay, adherence, targets, mealShare });

  return {
    loggedDays: past.length,
    days,
    avg7,
    avg28,
    ewma,
    weekdayAvg,
    weekendAvg,
    calorieSlopePerDay,
    mealShare,
    adherence,
    insights,
  };
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function buildInsights(ctx: {
  past: DayTotals[];
  last7: DayTotals[];
  avg7: Nutrients;
  weekdayAvg: Nutrients;
  weekendAvg: Nutrients;
  calorieSlopePerDay: number;
  adherence: NutrientAdherence[];
  targets: Targets;
  mealShare: Record<Meal, number>;
}): Insight[] {
  const out: Insight[] = [];
  const { past, last7, avg7, weekdayAvg, weekendAvg, calorieSlopePerDay, adherence, targets } = ctx;

  if (past.length === 0) {
    out.push({ level: 'info', text: 'No history yet. Log a few days of food and insights will appear here.' });
    return out;
  }
  if (past.length < 3) {
    out.push({ level: 'info', text: `${past.length} day${past.length === 1 ? '' : 's'} logged. Trends sharpen after about a week.` });
  }

  // Calories vs target (7-day)
  if (last7.length >= 3) {
    const ratio = avg7.calories / targets.calories;
    if (ratio > 1.1)
      out.push({
        level: 'warn',
        nutrient: 'calories',
        text: `Your 7-day average is ${Math.round(avg7.calories)} kcal, ${pct(ratio - 1)} above your ${targets.calories} kcal target.`,
      });
    else if (ratio < 0.85)
      out.push({
        level: 'warn',
        nutrient: 'calories',
        text: `Your 7-day average is ${Math.round(avg7.calories)} kcal, ${pct(1 - ratio)} below target. Consistently under-eating slows progress and recovery.`,
      });
    else
      out.push({
        level: 'good',
        nutrient: 'calories',
        text: `Calories are on track: ${Math.round(avg7.calories)} kcal/day over the last week vs a ${targets.calories} kcal target.`,
      });
  }

  // Calorie drift
  if (past.length >= 10 && Math.abs(calorieSlopePerDay * 7) > targets.calories * 0.05) {
    const weekly = Math.round(calorieSlopePerDay * 7);
    out.push({
      level: 'info',
      nutrient: 'calories',
      text: `Intake is drifting ${weekly > 0 ? 'up' : 'down'} by about ${Math.abs(weekly)} kcal/day each week.`,
    });
  }

  // Weekend vs weekday
  const wk = past.filter((d) => !isWeekend(d.date)).length;
  const we = past.filter((d) => isWeekend(d.date)).length;
  if (wk >= 3 && we >= 2) {
    const diff = weekendAvg.calories - weekdayAvg.calories;
    if (Math.abs(diff) > targets.calories * 0.12)
      out.push({
        level: 'info',
        nutrient: 'calories',
        text: `Weekends run ${Math.abs(Math.round(diff))} kcal ${diff > 0 ? 'higher' : 'lower'} than weekdays on average.`,
      });
    const pDiff = weekendAvg.protein - weekdayAvg.protein;
    if (pDiff < -targets.protein * 0.15)
      out.push({
        level: 'warn',
        nutrient: 'protein',
        text: `Protein drops by ${Math.round(-pDiff)} g on weekends. Plan a protein-rich weekend breakfast.`,
      });
  }

  // Per-nutrient chronic shortfalls / excess
  for (const a of adherence) {
    if (a.loggedDays < 3 || a.key === 'calories') continue;
    const meta = NUTRIENT_META[a.key];
    const isLimit = meta.limit === true;
    if (!isLimit && a.daysBelow >= Math.ceil(a.loggedDays * 0.6) && a.avgRatio < 0.8) {
      out.push({
        level: 'warn',
        nutrient: a.key,
        text: `${meta.label} is chronically low: averaging ${pct(a.avgRatio)} of target and under 80% on ${a.daysBelow} of ${a.loggedDays} days.`,
      });
    } else if (isLimit && a.daysAbove >= Math.ceil(a.loggedDays * 0.5)) {
      out.push({
        level: 'warn',
        nutrient: a.key,
        text: `${meta.label} exceeded its limit by 20%+ on ${a.daysAbove} of ${a.loggedDays} days.`,
      });
    } else if (!isLimit && a.weeklyDelta > 0.15 && a.loggedDays >= 7) {
      out.push({
        level: 'good',
        nutrient: a.key,
        text: `${meta.label} improved ${pct(a.weeklyDelta)} of target vs last week.`,
      });
    } else if (!isLimit && a.weeklyDelta < -0.15 && a.loggedDays >= 7) {
      out.push({
        level: 'info',
        nutrient: a.key,
        text: `${meta.label} fell ${pct(-a.weeklyDelta)} of target vs last week.`,
      });
    }
  }

  // Nutrients consistently hit
  const solid = adherence.filter(
    (a) => a.key !== 'calories' && !NUTRIENT_META[a.key].limit && a.loggedDays >= 5 && a.avgRatio >= 0.95 && a.daysBelow === 0,
  );
  if (solid.length >= 3)
    out.push({
      level: 'good',
      text: `Consistently hitting ${solid
        .slice(0, 4)
        .map((a) => NUTRIENT_META[a.key].label.toLowerCase())
        .join(', ')}${solid.length > 4 ? ` and ${solid.length - 4} more` : ''}.`,
    });

  // Meal patterns
  const share = ctx.mealShare;
  if (past.length >= 5 && share.breakfast < 0.1)
    out.push({ level: 'info', text: `Breakfast is only ${pct(share.breakfast)} of your calories. Front-loading protein earlier can help satiety.` });
  if (past.length >= 5 && share.snack > 0.3)
    out.push({ level: 'info', text: `Snacks account for ${pct(share.snack)} of your calories.` });

  // Sort: warnings first, then good, then info
  const order = { warn: 0, good: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
