import { NUTRIENT_META, type NutrientKey } from '../core';

export function fmtAmount(v: number, key: NutrientKey): string {
  const unit = NUTRIENT_META[key].unit;
  const r = v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
  return `${r} ${unit}`;
}

export function fmtNum(v: number, digits = 0): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' } as const;
