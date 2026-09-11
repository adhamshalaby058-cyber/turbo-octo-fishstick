import { useMemo, useState } from 'react';
import { MEALS, NUTRIENT_META, scaleNutrients, type Food, type FoodCategory, type Meal } from '../core';
import { fmtAmount, MEAL_LABELS } from './format';
import type { Actions, Derived } from './store';

const CATEGORIES: { id: FoodCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'protein', label: 'Protein' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'grain', label: 'Grains' },
  { id: 'vegetable', label: 'Veg' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'legume', label: 'Legumes' },
  { id: 'nut', label: 'Nuts & seeds' },
  { id: 'fat', label: 'Fats' },
  { id: 'snack', label: 'Snacks' },
  { id: 'beverage', label: 'Drinks' },
  { id: 'other', label: 'Other' },
];

export function defaultMealForHour(h: number): Meal {
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export function LogFood({ d, date, actions }: { d: Derived; date: string; actions: Actions }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<FoodCategory | 'all'>('all');
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<Meal>(() => defaultMealForHour(new Date().getHours()));
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return d.foods
      .filter((f) => (cat === 'all' || f.category === cat) && (!needle || f.name.toLowerCase().includes(needle)))
      .map((f) => ({ f, habit: d.habits.get(f.id)?.score ?? 0 }))
      .sort((a, b) => b.habit - a.habit || a.f.name.localeCompare(b.f.name))
      .slice(0, 60);
  }, [d.foods, d.habits, q, cat]);

  function choose(f: Food) {
    setSelected(f);
    const h = d.habits.get(f.id);
    setGrams(h ? Math.round(h.avgGrams / 5) * 5 || f.servingGrams : f.servingGrams);
  }

  function add() {
    if (!selected || grams <= 0) return;
    actions.addEntry(selected.id, grams, date, meal);
    setJustAdded(`${grams} g ${selected.name} → ${MEAL_LABELS[meal]}`);
    setSelected(null);
    setQ('');
  }

  const preview = selected ? scaleNutrients(selected.per100g, grams / 100) : null;

  return (
    <div className="grid two">
      <div className="card">
        <h2>Find a food</h2>
        <div className="search stack">
          <input
            autoFocus
            placeholder="Search foods…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}
          />
          <div className="row" style={{ gap: 6 }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={`chip ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="results">
            {results.length === 0 && <div className="empty">No foods match. Add one under Foods.</div>}
            {results.map(({ f, habit }) => (
              <button key={f.id} className={selected?.id === f.id ? 'selected' : ''} onClick={() => choose(f)}>
                <span>
                  {f.name}
                  {habit > 0.5 && <span className="muted small"> · frequent</span>}
                  {f.custom && <span className="muted small"> · custom</span>}
                </span>
                <span className="muted small mono">{f.per100g.calories} kcal/100g</span>
              </button>
            ))}
          </div>
        </div>
        {justAdded && (
          <p className="small" style={{ marginTop: 10, color: 'var(--good)' }}>
            Added {justAdded}
          </p>
        )}
      </div>

      <div className="card">
        <h2>{selected ? selected.name : 'Portion'}</h2>
        {!selected && <div className="empty">Pick a food to set the portion.</div>}
        {selected && preview && (
          <div className="stack">
            <div className="form-grid">
              <div className="field">
                <label>Grams</label>
                <input type="number" min={1} value={grams} onChange={(e) => setGrams(Math.max(1, Number(e.target.value) || 0))} />
              </div>
              <div className="field">
                <label>Meal</label>
                <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
                  {MEALS.map((m) => (
                    <option key={m} value={m}>
                      {MEAL_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              {[0.5, 1, 1.5, 2].map((m) => (
                <button key={m} className="chip" onClick={() => setGrams(Math.round(selected.servingGrams * m))}>
                  {m}× serving ({Math.round(selected.servingGrams * m)} g)
                </button>
              ))}
            </div>
            <div className="kpi">
              <div>
                <div className="label">Calories</div>
                <div className="value">{Math.round(preview.calories)}</div>
              </div>
              <div>
                <div className="label">Protein</div>
                <div className="value">{Math.round(preview.protein)} g</div>
              </div>
              <div>
                <div className="label">Carbs</div>
                <div className="value">{Math.round(preview.carbs)} g</div>
              </div>
              <div>
                <div className="label">Fat</div>
                <div className="value">{Math.round(preview.fat)} g</div>
              </div>
            </div>
            <details>
              <summary>All nutrients in this portion</summary>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {(Object.keys(NUTRIENT_META) as (keyof typeof NUTRIENT_META)[]).map((k) => (
                      <tr key={k}>
                        <td>{NUTRIENT_META[k].label}</td>
                        <td className="num">{fmtAmount(preview[k], k)}</td>
                        <td className="num muted">{d.targets[k] > 0 ? `${Math.round((preview[k] / d.targets[k]) * 100)}% of target` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <button className="btn primary" onClick={add}>
              Add to {MEAL_LABELS[meal]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
