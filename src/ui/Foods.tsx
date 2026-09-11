import { useState } from 'react';
import { emptyNutrients, NUTRIENT_KEYS, NUTRIENT_META, type AppState, type FoodCategory, type Nutrients } from '../core';
import type { Actions } from './store';

const CATS: FoodCategory[] = ['protein', 'dairy', 'grain', 'vegetable', 'fruit', 'legume', 'nut', 'fat', 'snack', 'beverage', 'other'];

export function Foods({ state, actions }: { state: AppState; actions: Actions }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('other');
  const [serving, setServing] = useState(100);
  const [basis, setBasis] = useState(100);
  const [vals, setVals] = useState<Nutrients>(emptyNutrients());
  const [saved, setSaved] = useState<string | null>(null);

  function save() {
    if (!name.trim() || basis <= 0) return;
    const per100g = emptyNutrients();
    for (const k of NUTRIENT_KEYS) per100g[k] = (vals[k] / basis) * 100;
    actions.addCustomFood({ name: name.trim(), category, servingGrams: serving || 100, per100g });
    setSaved(name.trim());
    setName('');
    setVals(emptyNutrients());
  }

  return (
    <div className="grid two">
      <div className="card">
        <h2>Add a custom food</h2>
        <p className="small muted">Enter the nutrition label values for one serving (or per 100 g). Leave unknown micronutrients at 0.</p>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Trader Joe's protein granola" />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as FoodCategory)}>
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Label values are per (g)</label>
            <input type="number" min={1} value={basis} onChange={(e) => setBasis(Number(e.target.value) || 100)} />
          </div>
          <div className="field">
            <label>Typical serving (g)</label>
            <input type="number" min={1} value={serving} onChange={(e) => setServing(Number(e.target.value) || 100)} />
          </div>
          {NUTRIENT_KEYS.map((k) => (
            <div className="field" key={k}>
              <label>
                {NUTRIENT_META[k].label} ({NUTRIENT_META[k].unit})
              </label>
              <input type="number" min={0} step="any" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: Number(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>
            Save food
          </button>
          {saved && <span className="small" style={{ color: 'var(--good)' }}>Saved {saved}</span>}
        </div>
      </div>

      <div className="card">
        <h2>Your custom foods</h2>
        {state.customFoods.length === 0 && <div className="empty">No custom foods yet. The built-in database has {'80+'} common foods.</div>}
        <ul className="list">
          {state.customFoods.map((f) => (
            <li key={f.id}>
              <div>
                <div>{f.name}</div>
                <div className="meta mono">
                  {Math.round(f.per100g.calories)} kcal · P {Math.round(f.per100g.protein)} · C {Math.round(f.per100g.carbs)} · F {Math.round(f.per100g.fat)} per 100 g
                </div>
              </div>
              <button
                className="btn small ghost danger"
                onClick={() => {
                  if (confirm(`Delete ${f.name}? Logged entries using it are removed too.`)) actions.removeCustomFood(f.id);
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
