import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import { analyzeTrends, estimateTdee, learnFoodHabits } from '../core/learning';
import { computeTargets, DEFAULT_PROFILE, formulaTdee } from '../core/targets';
import { entry, history, lookup, TODAY } from './helpers';

const MENU = [
  { foodId: 'oats', grams: 80, meal: 'breakfast' as const },
  { foodId: 'milk_2', grams: 250, meal: 'breakfast' as const },
  { foodId: 'chicken_breast', grams: 200, meal: 'lunch' as const },
  { foodId: 'rice_white', grams: 250, meal: 'lunch' as const },
  { foodId: 'salmon', grams: 150, meal: 'dinner' as const },
  { foodId: 'potato', grams: 250, meal: 'dinner' as const },
  { foodId: 'broccoli', grams: 150, meal: 'dinner' as const },
  { foodId: 'almonds', grams: 30, meal: 'snack' as const },
];

describe('estimateTdee', () => {
  it('falls back to the formula without enough data', () => {
    const est = estimateTdee(DEFAULT_PROFILE, history(3, MENU), [], lookup, TODAY);
    expect(est.confidence).toBe(0);
    expect(est.tdee).toBe(Math.round(formulaTdee(DEFAULT_PROFILE)));
  });

  it('raises the estimate when weight falls despite eating at formula maintenance', () => {
    const entries = history(28, MENU);
    // Weight drops 1 kg over 28 days → a ~275 kcal/day deficit was really happening.
    const weights = [0, 7, 14, 21, 27].map((d) => ({ date: addDays(TODAY, -27 + d), weightKg: 76 - d / 27 }));
    const est = estimateTdee(DEFAULT_PROFILE, entries, weights, lookup, TODAY);
    expect(est.confidence).toBeGreaterThan(0.8);
    expect(est.observed).toBeDefined();
    const avgIntake = est.daysUsed > 0 ? entries.length && (est.observed as number) : 0;
    expect(avgIntake).toBeGreaterThan(0);
    // Observed TDEE ≈ intake + 275
    const dailyIntake = MENU.reduce((s, m) => s + (lookup(m.foodId)!.per100g.calories * m.grams) / 100, 0);
    expect(est.observed).toBeGreaterThan(dailyIntake + 200);
    expect(est.observed).toBeLessThan(dailyIntake + 350);
  });

  it('lowers the estimate when weight rises', () => {
    const entries = history(28, MENU);
    const weights = [0, 7, 14, 21, 27].map((d) => ({ date: addDays(TODAY, -27 + d), weightKg: 75 + d / 27 }));
    const est = estimateTdee(DEFAULT_PROFILE, entries, weights, lookup, TODAY);
    const dailyIntake = MENU.reduce((s, m) => s + (lookup(m.foodId)!.per100g.calories * m.grams) / 100, 0);
    expect(est.observed).toBeLessThan(dailyIntake);
  });
});

describe('learnFoodHabits', () => {
  it('weights recent foods higher and tracks meal affinity', () => {
    const entries = [
      entry('oats', 80, TODAY, 'breakfast'),
      entry('oats', 80, addDays(TODAY, -1), 'breakfast'),
      entry('salmon', 150, addDays(TODAY, -40), 'dinner'),
      entry('salmon', 150, addDays(TODAY, -41), 'dinner'),
    ];
    const habits = learnFoodHabits(entries, TODAY);
    expect(habits.get('oats')!.score).toBeGreaterThan(habits.get('salmon')!.score);
    expect(habits.get('oats')!.mealCounts.breakfast).toBe(2);
    expect(habits.get('salmon')!.mealCounts.dinner).toBe(2);
    expect(habits.get('oats')!.avgGrams).toBe(80);
  });
});

describe('analyzeTrends', () => {
  it('reports averages, meal share and shortfall insights', () => {
    const targets = computeTargets(DEFAULT_PROFILE);
    // Low-protein diet: white rice and fruit only.
    const menu = [
      { foodId: 'rice_white', grams: 400, meal: 'lunch' as const },
      { foodId: 'rice_white', grams: 400, meal: 'dinner' as const },
      { foodId: 'banana', grams: 240, meal: 'breakfast' as const },
      { foodId: 'olive_oil', grams: 40, meal: 'dinner' as const },
    ];
    const entries = history(14, menu, addDays(TODAY, -1));
    const report = analyzeTrends(entries, lookup, targets, TODAY);
    expect(report.loggedDays).toBe(14);
    expect(report.avg7.calories).toBeGreaterThan(1000);
    const share = Object.values(report.mealShare).reduce((a, b) => a + b, 0);
    expect(share).toBeCloseTo(1, 5);
    expect(report.mealShare.dinner).toBeGreaterThan(report.mealShare.breakfast);
    const protein = report.adherence.find((a) => a.key === 'protein')!;
    expect(protein.avgRatio).toBeLessThan(0.5);
    expect(protein.daysBelow).toBe(14);
    expect(report.insights.some((i) => i.nutrient === 'protein' && i.level === 'warn')).toBe(true);
  });

  it('ignores a partial today when averaging', () => {
    const targets = computeTargets(DEFAULT_PROFILE);
    const entries = [...history(7, MENU, addDays(TODAY, -1)), entry('apple', 100, TODAY, 'snack')];
    const report = analyzeTrends(entries, lookup, targets, TODAY);
    expect(report.loggedDays).toBe(7);
  });

  it('detects weekend overeating', () => {
    const targets = computeTargets(DEFAULT_PROFILE);
    const entries = [];
    for (let i = 27; i >= 1; i--) {
      const date = addDays(TODAY, -i);
      const dow = new Date(date + 'T12:00:00').getDay();
      const extra = dow === 0 || dow === 6 ? 2 : 1;
      entries.push(entry('pizza', 300 * extra, date, 'dinner'), entry('chicken_breast', 200, date, 'lunch'), entry('rice_white', 200, date, 'lunch'));
    }
    const report = analyzeTrends(entries, lookup, targets, TODAY);
    expect(report.weekendAvg.calories).toBeGreaterThan(report.weekdayAvg.calories + 500);
    expect(report.insights.some((i) => /Weekends run/.test(i.text))).toBe(true);
  });
});
