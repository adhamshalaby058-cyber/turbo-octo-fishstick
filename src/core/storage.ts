import { DEFAULT_PROFILE } from './targets';
import type { AppState } from './types';

export const STORAGE_KEY = 'nutrisense.state.v1';
export const STATE_VERSION = 1;

export function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    profile: { ...DEFAULT_PROFILE },
    entries: [],
    weights: [],
    customFoods: [],
    targetOverrides: {},
  };
}

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): AppState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...defaultState(), ...parsed, profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) } };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode, quota); the app keeps working in memory.
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  const parsed = JSON.parse(json) as Partial<AppState>;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) throw new Error('Not a NutriSense export');
  return { ...defaultState(), ...parsed, profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) } };
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
