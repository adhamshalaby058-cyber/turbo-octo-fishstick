import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  analyzeTrends,
  computeTargets,
  entriesForDate,
  estimateTdee,
  learnFoodHabits,
  loadState,
  makeFoodLookup,
  saveState,
  sumEntries,
  todayKey,
  uid,
  type AppState,
  type Food,
  type FoodEntry,
  type Meal,
  type Nutrients,
  type Profile,
  type WeightLog,
} from '../core';
import { BUILTIN_FOODS } from '../data/foods';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);

  const actions = useMemo(
    () => ({
      addEntry(foodId: string, grams: number, date: string, meal: Meal) {
        const e: FoodEntry = { id: uid(), foodId, grams, date, meal, loggedAt: Date.now() };
        update((s) => ({ ...s, entries: [...s.entries, e] }));
        return e;
      },
      updateEntry(id: string, patch: Partial<Pick<FoodEntry, 'grams' | 'meal' | 'date'>>) {
        update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
      },
      removeEntry(id: string) {
        update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
      },
      setProfile(profile: Profile) {
        update((s) => ({ ...s, profile }));
      },
      addWeight(w: WeightLog) {
        update((s) => ({ ...s, weights: [...s.weights.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date)) }));
      },
      removeWeight(date: string) {
        update((s) => ({ ...s, weights: s.weights.filter((x) => x.date !== date) }));
      },
      addCustomFood(food: Omit<Food, 'id' | 'custom'>) {
        const f: Food = { ...food, id: `custom-${uid()}`, custom: true };
        update((s) => ({ ...s, customFoods: [...s.customFoods, f] }));
        return f;
      },
      removeCustomFood(id: string) {
        update((s) => ({ ...s, customFoods: s.customFoods.filter((f) => f.id !== id), entries: s.entries.filter((e) => e.foodId !== id) }));
      },
      setOverrides(overrides: Partial<Nutrients>) {
        update((s) => ({ ...s, targetOverrides: overrides }));
      },
      replaceState(next: AppState) {
        setState(next);
      },
    }),
    [update],
  );

  return { state, actions };
}

export type Actions = ReturnType<typeof useAppState>['actions'];

/** Everything derived from state for a given viewing date. */
export function useDerived(state: AppState, date: string) {
  const today = todayKey();
  const lookup = useMemo(() => makeFoodLookup(BUILTIN_FOODS, state.customFoods), [state.customFoods]);
  const foods = useMemo(() => [...BUILTIN_FOODS, ...state.customFoods], [state.customFoods]);

  const tdee = useMemo(
    () => estimateTdee(state.profile, state.entries, state.weights, lookup, today),
    [state.profile, state.entries, state.weights, lookup, today],
  );
  const targets = useMemo(
    () => computeTargets(state.profile, { tdee: tdee.tdee, overrides: state.targetOverrides }),
    [state.profile, tdee.tdee, state.targetOverrides],
  );
  const dayEntries = useMemo(() => entriesForDate(state.entries, date), [state.entries, date]);
  const consumed = useMemo(() => sumEntries(dayEntries, lookup), [dayEntries, lookup]);
  const trends = useMemo(() => analyzeTrends(state.entries, lookup, targets, today), [state.entries, lookup, targets, today]);
  const habits = useMemo(() => learnFoodHabits(state.entries, today), [state.entries, today]);

  return { today, lookup, foods, tdee, targets, dayEntries, consumed, trends, habits };
}

export type Derived = ReturnType<typeof useDerived>;
