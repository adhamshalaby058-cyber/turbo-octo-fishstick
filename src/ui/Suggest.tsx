import { useMemo, useState } from 'react';
import {
  computeGaps,
  gapClosers,
  mealBudget,
  MEALS,
  NUTRIENT_KEYS,
  NUTRIENT_META,
  recommend,
  weakestMicros,
  type Meal,
  type NutrientKey,
} from '../core';
import { fmtAmount, MEAL_LABELS, pct } from './format';
import { defaultMealForHour } from './LogFood';
import type { Actions, Derived } from './store';

export function Suggest({ d, date, actions }: { d: Derived; date: string; actions: Actions }) {
  const { consumed, targets, foods, habits, trends, dayEntries } = d;
  const [meal, setMeal] = useState<Meal>(() => defaultMealForHour(new Date().getHours()));
  const [scope, setScope] = useState<'meal' | 'day'>('meal');
  const [maxItems, setMaxItems] = useState(4);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());

  const remainingCalories = Math.max(0, targets.calories - consumed.calories);
  const eatenMeals = useMemo(() => new Set(dayEntries.map((e) => e.meal)), [dayEntries]);
  const eatenIds = useMemo(() => new Set(dayEntries.map((e) => e.foodId)), [dayEntries]);
  const budget = scope === 'meal' ? mealBudget(meal, remainingCalories, trends.mealShare, eatenMeals) : remainingCalories;

  const result = useMemo(
    () =>
      recommend(consumed, targets, foods, {
        maxItems,
        calorieBudget: budget,
        meal,
        habits,
        eatenTodayIds: eatenIds,
        excludeIds: excluded,
      }),
    [consumed, targets, foods, maxItems, budget, meal, habits, eatenIds, excluded],
  );

  const gaps = computeGaps(consumed, targets);
  const weak = weakestMicros(consumed, targets);

  function skip(id: string) {
    setExcluded((s) => new Set([...s, id]));
  }
  function addAll() {
    for (const item of result.items) actions.addEntry(item.food.id, item.grams, date, meal);
    setAdded(new Set(result.items.map((i) => i.food.id)));
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>
          What to eat next
          <span className="row">
            <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m]}
                </option>
              ))}
            </select>
            <select value={scope} onChange={(e) => setScope(e.target.value as 'meal' | 'day')} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <option value="meal">Budget for this meal</option>
              <option value="day">Rest of the day</option>
            </select>
          </span>
        </h2>
        <div className="kpi" style={{ marginBottom: 12 }}>
          <div>
            <div className="label">Calories used</div>
            <div className="value">{Math.round(consumed.calories)}</div>
            <div className="sub">of {targets.calories} kcal</div>
          </div>
          <div>
            <div className="label">Remaining today</div>
            <div className="value">{Math.round(remainingCalories)}</div>
            <div className="sub">kcal</div>
          </div>
          <div>
            <div className="label">{scope === 'meal' ? `${MEAL_LABELS[meal]} budget` : 'Planning budget'}</div>
            <div className="value">{Math.round(budget)}</div>
            <div className="sub">{scope === 'meal' ? `${pct(trends.mealShare[meal])} of your usual day` : 'kcal'}</div>
          </div>
          <div>
            <div className="label">Items</div>
            <div className="value">
              <input type="range" min={1} max={6} value={maxItems} onChange={(e) => setMaxItems(Number(e.target.value))} style={{ width: '100%' }} aria-label="Number of foods" />
            </div>
            <div className="sub">up to {maxItems} foods</div>
          </div>
        </div>

        {budget < 40 && <div className="empty">No calorie budget left for {scope === 'meal' ? MEAL_LABELS[meal].toLowerCase() : 'today'}. Switch the scope or adjust your targets.</div>}
        {budget >= 40 && result.items.length === 0 && <div className="empty">Nothing to suggest: your targets are essentially met.</div>}

        {result.items.map((item) => (
          <div key={item.food.id} className="rec">
            <div className="head">
              <div>
                <span className="grams">{item.grams} g</span> {item.food.name}
                {habits.has(item.food.id) && <span className="chip info" style={{ marginLeft: 8 }}>you eat this</span>}
              </div>
              <span className="muted mono small">
                {Math.round(item.nutrients.calories)} kcal · P {Math.round(item.nutrients.protein)} · C {Math.round(item.nutrients.carbs)} · F {Math.round(item.nutrients.fat)}
              </span>
            </div>
            <div className="reasons">{item.reasons.join(' · ')}</div>
            <div className="row">
              <button
                className="btn small primary"
                disabled={added.has(item.food.id)}
                onClick={() => {
                  actions.addEntry(item.food.id, item.grams, date, meal);
                  setAdded((s) => new Set([...s, item.food.id]));
                }}
              >
                {added.has(item.food.id) ? 'Added' : `Add to ${MEAL_LABELS[meal]}`}
              </button>
              <button className="btn small ghost" onClick={() => skip(item.food.id)}>
                Not this one
              </button>
            </div>
          </div>
        ))}
        {result.items.length > 1 && (
          <div className="row between">
            <button className="btn" onClick={addAll}>
              Add all {result.items.length} to {MEAL_LABELS[meal]}
            </button>
            {excluded.size > 0 && (
              <button className="btn ghost small" onClick={() => setExcluded(new Set())}>
                Reset skipped ({excluded.size})
              </button>
            )}
          </div>
        )}
        {result.items.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary>How the plan changes your day</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nutrient</th>
                    <th className="num">Now</th>
                    <th className="num">After plan</th>
                    <th className="num">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {NUTRIENT_KEYS.map((k) => {
                    const before = result.gapsBefore.find((g) => g.key === k)!;
                    const after = result.gapsAfter.find((g) => g.key === k)!;
                    return (
                      <tr key={k}>
                        <td>{NUTRIENT_META[k].label}</td>
                        <td className="num">{pct(before.ratio)}</td>
                        <td className="num" style={{ color: after.ratio >= 0.9 && !NUTRIENT_META[k].limit ? 'var(--good)' : undefined }}>
                          {pct(after.ratio)}
                        </td>
                        <td className="num muted">{fmtAmount(targets[k], k)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Grams still needed</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nutrient</th>
                  <th className="num">Eaten</th>
                  <th className="num">Needed</th>
                  <th className="num">Left</th>
                </tr>
              </thead>
              <tbody>
                {gaps
                  .filter((g) => g.key !== 'calories')
                  .map((g) => {
                    const meta = NUTRIENT_META[g.key];
                    const done = meta.limit ? g.remaining < 0 : g.remaining <= 0;
                    return (
                      <tr key={g.key}>
                        <td>
                          {meta.label}
                          {meta.limit ? <span className="muted small"> (limit)</span> : ''}
                        </td>
                        <td className="num">{fmtAmount(g.consumed, g.key)}</td>
                        <td className="num muted">{fmtAmount(g.target, g.key)}</td>
                        <td className="num" style={{ color: done ? (meta.limit ? 'var(--bad)' : 'var(--good)') : undefined }}>
                          {meta.limit
                            ? g.remaining >= 0
                              ? `${fmtAmount(g.remaining, g.key)} headroom`
                              : `${fmtAmount(-g.remaining, g.key)} over`
                            : g.remaining > 0
                              ? fmtAmount(g.remaining, g.key)
                              : '✓ met'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Weakest micronutrients</h2>
          {weak.length === 0 && <div className="empty">All micronutrients are above 70% of target. Nice.</div>}
          {weak.slice(0, 4).map((g) => (
            <MicroGap key={g.key} k={g.key} needed={g.remaining} ratio={g.ratio} d={d} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MicroGap({ k, needed, ratio, d }: { k: NutrientKey; needed: number; ratio: number; d: Derived }) {
  const closers = gapClosers(k, needed, d.foods, { limit: 4, maxGrams: 300 });
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row between">
        <b>{NUTRIENT_META[k].label}</b>
        <span className="muted small mono">
          {pct(ratio)} · need {fmtAmount(needed, k)} more
        </span>
      </div>
      {closers.length === 0 && <div className="muted small">No single food closes this gap in under 300 g. Combine sources.</div>}
      <ul className="list small">
        {closers.map((c) => (
          <li key={c.food.id}>
            <span>
              <b>{c.grams} g</b> {c.food.name}
            </span>
            <span className="meta mono">{c.calories} kcal</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
