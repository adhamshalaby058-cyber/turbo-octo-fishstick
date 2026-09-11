import { MACRO_KEYS, MEALS, MICRO_KEYS, type AppState, type Meal } from '../core';
import { fmtAmount, MEAL_LABELS } from './format';
import type { Actions, Derived } from './store';
import { CalorieRing, MicroTile, NutrientBar } from './widgets';

export function Today({
  state,
  d,
  date,
  actions,
  onLog,
  onSuggest,
}: {
  state: AppState;
  d: Derived;
  date: string;
  actions: Actions;
  onLog: () => void;
  onSuggest: () => void;
}) {
  const { consumed, targets, dayEntries, lookup, habits } = d;
  const isToday = date === d.today;

  const frequent = [...habits.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((h) => ({ h, food: lookup(h.foodId) }))
    .filter((x) => x.food);

  const remaining = {
    protein: Math.max(0, targets.protein - consumed.protein),
    carbs: Math.max(0, targets.carbs - consumed.carbs),
    fat: Math.max(0, targets.fat - consumed.fat),
    fiber: Math.max(0, targets.fiber - consumed.fiber),
  };

  return (
    <div className="grid">
      <div className="card">
        <h2>
          {isToday ? 'Today' : date}
          <span className="row">
            <button className="btn small" onClick={onLog}>
              + Log food
            </button>
            <button className="btn small primary" onClick={onSuggest}>
              ✦ Suggest
            </button>
          </span>
        </h2>
        <div className="ring-wrap">
          <CalorieRing consumed={consumed.calories} target={targets.calories} />
          <div style={{ flex: 1, minWidth: 240 }}>
            {MACRO_KEYS.filter((k) => k !== 'calories').map((k) => (
              <NutrientBar key={k} k={k} value={consumed[k]} target={targets[k]} />
            ))}
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Still needed: {fmtAmount(remaining.protein, 'protein')} protein · {fmtAmount(remaining.carbs, 'carbs')} carbs ·{' '}
          {fmtAmount(remaining.fat, 'fat')} fat · {fmtAmount(remaining.fiber, 'fiber')} fiber
          {d.tdee.confidence > 0 ? ` · target calibrated to your data (${Math.round(d.tdee.confidence * 100)}% confidence)` : ''}
        </p>
      </div>

      <div className="card">
        <h2>Micronutrients</h2>
        <div className="micro-grid">
          {MICRO_KEYS.map((k) => (
            <MicroTile key={k} k={k} value={consumed[k]} target={targets[k]} />
          ))}
        </div>
      </div>

      {frequent.length > 0 && isToday && (
        <div className="card">
          <h2>Quick add</h2>
          <p className="small muted">Your most frequent foods, at the portion you usually log.</p>
          <div className="row">
            {frequent.map(({ h, food }) => {
              const grams = Math.round(h.avgGrams / 5) * 5 || food!.servingGrams;
              const meal = guessMeal(h.mealCounts);
              return (
                <button key={h.foodId} className="chip" onClick={() => actions.addEntry(food!.id, grams, date, meal)} title={`Add ${grams} g to ${MEAL_LABELS[meal]}`}>
                  + {food!.name} · {grams} g
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Meals</h2>
        {dayEntries.length === 0 && <div className="empty">Nothing logged for this day yet.</div>}
        {MEALS.map((meal) => {
          const items = dayEntries.filter((e) => e.meal === meal);
          if (items.length === 0) return null;
          const kcal = items.reduce((s, e) => s + ((lookup(e.foodId)?.per100g.calories ?? 0) * e.grams) / 100, 0);
          return (
            <div key={meal} style={{ marginBottom: 12 }}>
              <div className="row between">
                <h3>{MEAL_LABELS[meal]}</h3>
                <span className="muted small mono">{Math.round(kcal)} kcal</span>
              </div>
              <ul className="list">
                {items.map((e) => {
                  const food = lookup(e.foodId);
                  if (!food) return null;
                  const n = food.per100g;
                  const f = e.grams / 100;
                  return (
                    <li key={e.id}>
                      <div>
                        <div>{food.name}</div>
                        <div className="meta mono">
                          {e.grams} g · {Math.round(n.calories * f)} kcal · P {Math.round(n.protein * f)} · C {Math.round(n.carbs * f)} · F{' '}
                          {Math.round(n.fat * f)}
                        </div>
                      </div>
                      <div className="row">
                        <input
                          type="number"
                          min={1}
                          value={e.grams}
                          onChange={(ev) => actions.updateEntry(e.id, { grams: Math.max(1, Number(ev.target.value) || 1) })}
                          style={{ width: 70, padding: '4px 6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}
                          aria-label="grams"
                        />
                        <select
                          value={e.meal}
                          onChange={(ev) => actions.updateEntry(e.id, { meal: ev.target.value as Meal })}
                          style={{ padding: '4px 6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}
                          aria-label="meal"
                        >
                          {MEALS.map((m) => (
                            <option key={m} value={m}>
                              {MEAL_LABELS[m]}
                            </option>
                          ))}
                        </select>
                        <button className="btn small ghost danger" onClick={() => actions.removeEntry(e.id)} aria-label="Remove">
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      {state.entries.length === 0 && (
        <div className="card">
          <h2>Getting started</h2>
          <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Set your body stats and goal in <b>Profile</b> so targets are personalised.</li>
            <li>Log what you eat in <b>Log</b>. Portions are in grams; each food has a typical serving to start from.</li>
            <li>Open <b>Suggest</b> any time to see what to eat next to close your remaining macro and micro gaps.</li>
            <li>Weigh yourself a few times a week in <b>Profile</b>. After ~2 weeks NutriSense calibrates your calorie target to your real metabolism.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function guessMeal(counts: Record<Meal, number>): Meal {
  let best: Meal = 'snack';
  for (const m of MEALS) if (counts[m] > counts[best]) best = m;
  return best;
}
