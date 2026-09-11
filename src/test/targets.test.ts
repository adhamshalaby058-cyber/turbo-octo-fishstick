import { describe, expect, it } from 'vitest';
import { bmr, calorieTargetFor, computeTargets, formulaTdee, DEFAULT_PROFILE } from '../core/targets';

describe('targets', () => {
  it('computes Mifflin-St Jeor BMR', () => {
    expect(bmr(DEFAULT_PROFILE)).toBeCloseTo(10 * 75 + 6.25 * 175 - 5 * 30 + 5);
    expect(bmr({ ...DEFAULT_PROFILE, sex: 'female' })).toBeCloseTo(10 * 75 + 6.25 * 175 - 5 * 30 - 161);
  });

  it('applies a deficit for weight loss and a surplus for gain', () => {
    const tdee = formulaTdee(DEFAULT_PROFILE);
    const lose = calorieTargetFor({ ...DEFAULT_PROFILE, goal: 'lose', weeklyRateKg: 0.5 }, tdee);
    const gain = calorieTargetFor({ ...DEFAULT_PROFILE, goal: 'gain', weeklyRateKg: 0.25 }, tdee);
    expect(lose).toBeCloseTo(Math.round(tdee - 550), -1);
    expect(gain).toBeCloseTo(Math.round(tdee + 275), -1);
  });

  it('never drops below the safety floor', () => {
    const p = { ...DEFAULT_PROFILE, sex: 'female' as const, weightKg: 45, heightCm: 150, age: 60, goal: 'lose' as const, weeklyRateKg: 1 };
    expect(calorieTargetFor(p, formulaTdee(p))).toBe(1200);
  });

  it('macros sum to roughly the calorie target and overrides apply', () => {
    const t = computeTargets(DEFAULT_PROFILE);
    const kcalFromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(kcalFromMacros - t.calories)).toBeLessThan(20);
    expect(t.protein).toBe(Math.round(1.6 * 75));
    const o = computeTargets(DEFAULT_PROFILE, { overrides: { protein: 180 } });
    expect(o.protein).toBe(180);
  });

  it('uses an adaptive TDEE when supplied', () => {
    const t = computeTargets(DEFAULT_PROFILE, { tdee: 3000 });
    expect(t.calories).toBe(3000);
  });
});
