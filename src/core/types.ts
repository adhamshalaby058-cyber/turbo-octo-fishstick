/** Nutrient keys tracked by the app. Values are always per-100 g in the food DB. */
export const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'] as const;
export const MICRO_KEYS = [
  'sodium',
  'potassium',
  'calcium',
  'iron',
  'magnesium',
  'zinc',
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminB12',
  'folate',
] as const;

export type MacroKey = (typeof MACRO_KEYS)[number];
export type MicroKey = (typeof MICRO_KEYS)[number];
export type NutrientKey = MacroKey | MicroKey;

export const NUTRIENT_KEYS: readonly NutrientKey[] = [...MACRO_KEYS, ...MICRO_KEYS];

export type Nutrients = Record<NutrientKey, number>;

export interface NutrientMeta {
  label: string;
  unit: string;
  /** Nutrients where exceeding the target is undesirable (sodium, sugar). */
  limit?: boolean;
}

export const NUTRIENT_META: Record<NutrientKey, NutrientMeta> = {
  calories: { label: 'Calories', unit: 'kcal' },
  protein: { label: 'Protein', unit: 'g' },
  carbs: { label: 'Carbs', unit: 'g' },
  fat: { label: 'Fat', unit: 'g' },
  fiber: { label: 'Fiber', unit: 'g' },
  sugar: { label: 'Sugar', unit: 'g', limit: true },
  sodium: { label: 'Sodium', unit: 'mg', limit: true },
  potassium: { label: 'Potassium', unit: 'mg' },
  calcium: { label: 'Calcium', unit: 'mg' },
  iron: { label: 'Iron', unit: 'mg' },
  magnesium: { label: 'Magnesium', unit: 'mg' },
  zinc: { label: 'Zinc', unit: 'mg' },
  vitaminA: { label: 'Vitamin A', unit: 'µg' },
  vitaminC: { label: 'Vitamin C', unit: 'mg' },
  vitaminD: { label: 'Vitamin D', unit: 'µg' },
  vitaminB12: { label: 'Vitamin B12', unit: 'µg' },
  folate: { label: 'Folate', unit: 'µg' },
};

export type FoodCategory =
  | 'protein'
  | 'dairy'
  | 'grain'
  | 'vegetable'
  | 'fruit'
  | 'legume'
  | 'nut'
  | 'fat'
  | 'snack'
  | 'beverage'
  | 'other';

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  /** Nutrient content per 100 g. */
  per100g: Nutrients;
  /** Typical single serving in grams, used for portion suggestions. */
  servingGrams: number;
  custom?: boolean;
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface FoodEntry {
  id: string;
  foodId: string;
  grams: number;
  /** ISO date (YYYY-MM-DD) in the user's local time. */
  date: string;
  meal: Meal;
  /** Epoch ms when the entry was logged. */
  loggedAt: number;
}

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  /** Desired weekly weight change in kg (positive = gain). Only used for lose/gain. */
  weeklyRateKg: number;
}

export interface WeightLog {
  date: string;
  weightKg: number;
}

export interface Targets extends Nutrients {}

export interface AppState {
  version: number;
  profile: Profile;
  entries: FoodEntry[];
  weights: WeightLog[];
  customFoods: Food[];
  /** Manual overrides of computed targets. */
  targetOverrides: Partial<Nutrients>;
}

export function emptyNutrients(): Nutrients {
  const n = {} as Nutrients;
  for (const k of NUTRIENT_KEYS) n[k] = 0;
  return n;
}

export function addNutrients(a: Nutrients, b: Nutrients, scale = 1): Nutrients {
  const out = { ...a };
  for (const k of NUTRIENT_KEYS) out[k] = a[k] + b[k] * scale;
  return out;
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out = {} as Nutrients;
  for (const k of NUTRIENT_KEYS) out[k] = n[k] * factor;
  return out;
}
