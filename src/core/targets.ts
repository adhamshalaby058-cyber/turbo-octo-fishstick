import type { ActivityLevel, Nutrients, Profile, Sex, Targets } from './types';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Lightly active (1–3 workouts/week)',
  moderate: 'Moderately active (3–5 workouts/week)',
  active: 'Active (6–7 workouts/week)',
  very_active: 'Very active (physical job + training)',
};

/** Approximate energy content of 1 kg of body-weight change. */
export const KCAL_PER_KG = 7700;

/** Mifflin-St Jeor resting metabolic rate. */
export function bmr(p: Profile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

/** Estimated total daily energy expenditure from the formula (before adaptive correction). */
export function formulaTdee(p: Profile): number {
  return bmr(p) * ACTIVITY_FACTORS[p.activity];
}

/** Daily calorie target for a given maintenance estimate and goal. */
export function calorieTargetFor(p: Profile, tdee: number): number {
  if (p.goal === 'maintain') return Math.round(tdee);
  const rate = p.goal === 'lose' ? -Math.abs(p.weeklyRateKg) : Math.abs(p.weeklyRateKg);
  const dailyDelta = (rate * KCAL_PER_KG) / 7;
  // Never go below a safe floor.
  const floor = p.sex === 'male' ? 1500 : 1200;
  return Math.round(Math.max(floor, tdee + dailyDelta));
}

/** Recommended dietary allowances for micronutrients by sex/age. */
export function microRda(sex: Sex, age: number): Omit<Nutrients, 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar'> {
  const male = sex === 'male';
  return {
    sodium: 2300, // upper limit
    potassium: male ? 3400 : 2600,
    calcium: age > 50 ? 1200 : 1000,
    iron: male || age > 50 ? 8 : 18,
    magnesium: male ? (age > 30 ? 420 : 400) : age > 30 ? 320 : 310,
    zinc: male ? 11 : 8,
    vitaminA: male ? 900 : 700,
    vitaminC: male ? 90 : 75,
    vitaminD: age > 70 ? 20 : 15,
    vitaminB12: 2.4,
    folate: 400,
  };
}

export interface TargetOptions {
  /** Adaptive maintenance estimate; falls back to the formula when omitted. */
  tdee?: number;
  overrides?: Partial<Nutrients>;
}

/**
 * Compute a full set of daily targets.
 *  - Calories from TDEE ± goal.
 *  - Protein per kg of body weight scaled by goal (higher when cutting to preserve muscle).
 *  - Fat at ~28% of calories, carbs fill the remainder.
 *  - Fiber at 14 g / 1000 kcal, sugar capped at 10% of calories.
 */
export function computeTargets(p: Profile, opts: TargetOptions = {}): Targets {
  const tdee = opts.tdee ?? formulaTdee(p);
  const calories = calorieTargetFor(p, tdee);

  const proteinPerKg = p.goal === 'lose' ? 2.0 : p.goal === 'gain' ? 1.8 : 1.6;
  const protein = Math.round(proteinPerKg * p.weightKg);
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((calories / 1000) * 14);
  const sugar = Math.round((calories * 0.1) / 4);

  const t: Targets = {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    ...microRda(p.sex, p.age),
  };
  if (opts.overrides) {
    for (const [k, v] of Object.entries(opts.overrides)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) t[k as keyof Nutrients] = v;
    }
  }
  return t;
}

export const DEFAULT_PROFILE: Profile = {
  sex: 'male',
  age: 30,
  heightCm: 175,
  weightKg: 75,
  activity: 'moderate',
  goal: 'maintain',
  weeklyRateKg: 0.5,
};
