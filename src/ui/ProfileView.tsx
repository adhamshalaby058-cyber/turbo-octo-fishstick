import { useRef, useState } from 'react';
import {
  ACTIVITY_LABELS,
  computeTargets,
  defaultState,
  exportState,
  importState,
  NUTRIENT_KEYS,
  NUTRIENT_META,
  type ActivityLevel,
  type AppState,
  type Goal,
  type Nutrients,
  type Profile,
  type Sex,
} from '../core';
import { sampleState } from '../data/sample';
import { fmtAmount } from './format';
import type { Actions, Derived } from './store';

export function ProfileView({ state, d, actions }: { state: AppState; d: Derived; actions: Actions }) {
  const p = state.profile;
  const [weightDate, setWeightDate] = useState(d.today);
  const [weightKg, setWeightKg] = useState<string>(String(p.weightKg));
  const [overrides, setOverrides] = useState<Partial<Nutrients>>(state.targetOverrides);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    actions.setProfile({ ...p, [k]: v });
  }
  const computed = computeTargets(p, { tdee: d.tdee.tdee });

  function addWeight() {
    const w = Number(weightKg);
    if (!Number.isFinite(w) || w <= 0) return;
    actions.addWeight({ date: weightDate, weightKg: w });
    if (weightDate === d.today) set('weightKg', w);
  }

  function download() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrisense-${d.today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImport(file: File | undefined) {
    if (!file) return;
    file.text().then((txt) => {
      try {
        actions.replaceState(importState(txt));
        setMsg('Import complete.');
      } catch (e) {
        setMsg(`Import failed: ${(e as Error).message}`);
      }
    });
  }

  return (
    <div className="grid two">
      <div className="card">
        <h2>Body & goal</h2>
        <div className="form-grid">
          <div className="field">
            <label>Sex (for formulas)</label>
            <select value={p.sex} onChange={(e) => set('sex', e.target.value as Sex)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="field">
            <label>Age</label>
            <input type="number" min={10} max={100} value={p.age} onChange={(e) => set('age', Number(e.target.value) || 0)} />
          </div>
          <div className="field">
            <label>Height (cm)</label>
            <input type="number" min={100} max={250} value={p.heightCm} onChange={(e) => set('heightCm', Number(e.target.value) || 0)} />
          </div>
          <div className="field">
            <label>Weight (kg)</label>
            <input type="number" min={30} max={300} step={0.1} value={p.weightKg} onChange={(e) => set('weightKg', Number(e.target.value) || 0)} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Activity</label>
            <select value={p.activity} onChange={(e) => set('activity', e.target.value as ActivityLevel)}>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                <option key={a} value={a}>
                  {ACTIVITY_LABELS[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Goal</label>
            <select value={p.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
              <option value="lose">Lose fat</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Gain muscle</option>
            </select>
          </div>
          {p.goal !== 'maintain' && (
            <div className="field">
              <label>Rate (kg / week)</label>
              <input type="number" min={0.1} max={1.5} step={0.05} value={p.weeklyRateKg} onChange={(e) => set('weeklyRateKg', Number(e.target.value) || 0.25)} />
            </div>
          )}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          Maintenance {d.tdee.tdee} kcal → target {computed.calories} kcal, {computed.protein} g protein, {computed.carbs} g carbs, {computed.fat} g fat.
          {d.tdee.confidence > 0 ? ' Maintenance is calibrated from your logs and weigh-ins.' : ''}
        </p>
      </div>

      <div className="card">
        <h2>Weigh-ins</h2>
        <p className="small muted">Regular weigh-ins let NutriSense learn your true maintenance calories and correct the target automatically.</p>
        <div className="row">
          <input type="date" value={weightDate} max={d.today} onChange={(e) => setWeightDate(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }} />
          <input type="number" step={0.1} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} style={{ width: 90, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }} aria-label="Weight in kg" />
          <button className="btn primary small" onClick={addWeight}>
            Save
          </button>
        </div>
        <ul className="list" style={{ marginTop: 8 }}>
          {[...state.weights]
            .reverse()
            .slice(0, 10)
            .map((w) => (
              <li key={w.date}>
                <span className="mono">
                  {w.date} · {w.weightKg} kg
                </span>
                <button className="btn small ghost danger" onClick={() => actions.removeWeight(w.date)} aria-label="Remove">
                  ✕
                </button>
              </li>
            ))}
        </ul>
      </div>

      <div className="card">
        <h2>Target overrides</h2>
        <p className="small muted">Leave blank to use the computed value. Set your own if a coach or doctor gave you specific numbers.</p>
        <div className="form-grid">
          {NUTRIENT_KEYS.map((k) => (
            <div className="field" key={k}>
              <label>
                {NUTRIENT_META[k].label} ({NUTRIENT_META[k].unit}) · auto {fmtAmount(computed[k], k)}
              </label>
              <input
                type="number"
                min={0}
                placeholder="auto"
                value={overrides[k] ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value);
                  setOverrides((o) => {
                    const next = { ...o };
                    if (v === undefined || !Number.isFinite(v)) delete next[k];
                    else next[k] = v;
                    return next;
                  });
                }}
              />
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => actions.setOverrides(overrides)}>
            Save overrides
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setOverrides({});
              actions.setOverrides({});
            }}
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Data</h2>
        <p className="small muted">Everything is stored in this browser only. Export a backup or move it to another device.</p>
        <div className="row">
          <button className="btn" onClick={download}>
            Export JSON
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          <button
            className="btn"
            onClick={() => {
              if (state.entries.length === 0 || confirm('Replace your current data with sample data?')) {
                actions.replaceState(sampleState(d.today));
                setMsg('Loaded three weeks of sample logs and weigh-ins.');
              }
            }}
          >
            Load sample data
          </button>
          <button
            className="btn ghost danger"
            onClick={() => {
              if (confirm('Delete all logs, weights and custom foods?')) actions.replaceState(defaultState());
            }}
          >
            Reset everything
          </button>
        </div>
        {msg && <p className="small" style={{ marginTop: 8 }}>{msg}</p>}
        <p className="small muted" style={{ marginTop: 10 }}>
          {state.entries.length} food entries · {state.weights.length} weigh-ins · {state.customFoods.length} custom foods
        </p>
      </div>
    </div>
  );
}
