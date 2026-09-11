import { useState } from 'react';
import { lastNDays, NUTRIENT_KEYS, NUTRIENT_META, WEEKDAY_NAMES, weekday, type AppState, type NutrientKey } from '../core';
import { fmtAmount, fmtNum, pct } from './format';
import type { Derived } from './store';

export function Trends({ state, d }: { state: AppState; d: Derived }) {
  const { trends, targets, tdee } = d;
  const [metric, setMetric] = useState<NutrientKey>('calories');

  return (
    <div className="grid">
      <div className="card">
        <h2>
          Adaptive calorie target
          <span className={`chip ${tdee.confidence > 0 ? 'good' : 'info'}`}>{tdee.confidence > 0 ? `${Math.round(tdee.confidence * 100)}% confidence` : 'formula'}</span>
        </h2>
        <div className="kpi">
          <div>
            <div className="label">Maintenance estimate</div>
            <div className="value">{fmtNum(tdee.tdee)}</div>
            <div className="sub">kcal/day</div>
          </div>
          <div>
            <div className="label">Formula (Mifflin-St Jeor)</div>
            <div className="value">{fmtNum(tdee.formula)}</div>
            <div className="sub">kcal/day</div>
          </div>
          {tdee.observed !== undefined && (
            <div>
              <div className="label">Observed from your data</div>
              <div className="value">{fmtNum(tdee.observed)}</div>
              <div className="sub">kcal/day</div>
            </div>
          )}
          {tdee.weightTrendKgPerWeek !== undefined && (
            <div>
              <div className="label">Weight trend</div>
              <div className="value">
                {tdee.weightTrendKgPerWeek >= 0 ? '+' : ''}
                {tdee.weightTrendKgPerWeek.toFixed(2)}
              </div>
              <div className="sub">kg/week</div>
            </div>
          )}
          <div>
            <div className="label">Daily target</div>
            <div className="value">{fmtNum(targets.calories)}</div>
            <div className="sub">kcal ({state.profile.goal})</div>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          {tdee.note}
        </p>
      </div>

      <div className="card">
        <h2>Insights</h2>
        {trends.insights.map((i, idx) => (
          <div key={idx} className={`insight ${i.level}`}>
            <span className="dot" />
            <span>{i.text}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>
          Last 28 days
          <select value={metric} onChange={(e) => setMetric(e.target.value as NutrientKey)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {NUTRIENT_KEYS.map((k) => (
              <option key={k} value={k}>
                {NUTRIENT_META[k].label}
              </option>
            ))}
          </select>
        </h2>
        <BarChart days={trends.days} k={metric} target={targets[metric]} today={d.today} />
        <div className="kpi" style={{ marginTop: 10 }}>
          <div>
            <div className="label">7-day avg</div>
            <div className="value">{fmtAmount(trends.avg7[metric], metric)}</div>
            <div className="sub">{pct(trends.avg7[metric] / (targets[metric] || 1))} of target</div>
          </div>
          <div>
            <div className="label">28-day avg</div>
            <div className="value">{fmtAmount(trends.avg28[metric], metric)}</div>
            <div className="sub">{trends.loggedDays} logged days</div>
          </div>
          <div>
            <div className="label">Weekdays</div>
            <div className="value">{fmtAmount(trends.weekdayAvg[metric], metric)}</div>
          </div>
          <div>
            <div className="label">Weekends</div>
            <div className="value">{fmtAmount(trends.weekendAvg[metric], metric)}</div>
          </div>
          {metric === 'calories' && (
            <div>
              <div className="label">Weekly drift</div>
              <div className="value">
                {trends.calorieSlopePerDay * 7 >= 0 ? '+' : ''}
                {Math.round(trends.calorieSlopePerDay * 7)}
              </div>
              <div className="sub">kcal/day per week</div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Meal pattern</h2>
        <p className="small muted">Share of calories by meal, learned from your logs. Suggestions use this to size each meal.</p>
        <div className="row">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => (
            <span key={m} className="chip">
              {m}: {pct(trends.mealShare[m])}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Nutrient adherence, last 14 days</h2>
        <p className="small muted">Each cell is one day: red under 50%, amber under 85%, green on target, dark green over 120%. Grey days have no log.</p>
        <Heatmap d={d} />
      </div>

      {state.weights.length > 0 && (
        <div className="card">
          <h2>Weight</h2>
          <WeightChart weights={state.weights} />
        </div>
      )}
    </div>
  );
}

function BarChart({ days, k, target, today }: { days: Derived['trends']['days']; k: NutrientKey; target: number; today: string }) {
  const w = 700;
  const h = 200;
  const padL = 36;
  const padB = 22;
  const max = Math.max(target * 1.2, ...days.map((d) => d.nutrients[k])) || 1;
  const bw = (w - padL) / days.length;
  const y = (v: number) => h - padB - (v / max) * (h - padB - 10);
  const limit = NUTRIENT_META[k].limit;
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${NUTRIENT_META[k].label} over the last 28 days`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} className="grid-line" x1={padL} x2={w} y1={y(max * f)} y2={y(max * f)} />
      ))}
      {[0.5, 1].map((f) => (
        <text key={f} x={padL - 4} y={y(max * f) + 3} textAnchor="end">
          {Math.round(max * f)}
        </text>
      ))}
      <line className="target" x1={padL} x2={w} y1={y(target)} y2={y(target)} />
      <text x={w - 2} y={y(target) - 3} textAnchor="end">
        target {Math.round(target)}
      </text>
      {days.map((d, i) => {
        const v = d.nutrients[k];
        const empty = d.entryCount === 0;
        const over = limit ? v > target : v > target * 1.25;
        const x = padL + i * bw + 2;
        return (
          <g key={d.date}>
            <rect className={`bar-rect ${empty ? 'empty' : over ? 'over' : ''}`} x={x} width={Math.max(2, bw - 4)} y={empty ? h - padB - 3 : y(v)} height={empty ? 3 : h - padB - y(v)}>
              <title>
                {d.date}: {Math.round(v)} {NUTRIENT_META[k].unit}
              </title>
            </rect>
            {(i % 7 === 0 || d.date === today) && (
              <text x={x + bw / 2} y={h - 6} textAnchor="middle">
                {d.date === today ? 'today' : d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Heatmap({ d }: { d: Derived }) {
  const dates = lastNDays(d.today, 14);
  const byDate = new Map(d.trends.days.map((x) => [x.date, x]));
  const keys = NUTRIENT_KEYS.filter((k) => k !== 'sugar');
  return (
    <div className="heat-wrap">
      <div className="heat" style={{ minWidth: 520 }}>
        <span />
        {dates.map((dt) => (
          <span key={dt} className="muted" style={{ textAlign: 'center', fontSize: 10 }}>
            {WEEKDAY_NAMES[weekday(dt)][0]}
          </span>
        ))}
        {keys.map((k) => (
          <RowCells key={k} k={k} dates={dates} byDate={byDate} target={d.targets[k]} />
        ))}
      </div>
    </div>
  );
}

function RowCells({ k, dates, byDate, target }: { k: NutrientKey; dates: string[]; byDate: Map<string, Derived['trends']['days'][number]>; target: number }) {
  const limit = NUTRIENT_META[k].limit;
  return (
    <>
      <span className="small">{NUTRIENT_META[k].label}</span>
      {dates.map((dt) => {
        const day = byDate.get(dt);
        let cls = 'l0';
        if (day && day.entryCount > 0) {
          const r = day.nutrients[k] / (target || 1);
          if (limit) cls = r > 1 ? 'l1' : r > 0.85 ? 'l2' : 'l3';
          else cls = r < 0.5 ? 'l1' : r < 0.85 ? 'l2' : r <= 1.2 ? 'l3' : 'l4';
        }
        const title = day && day.entryCount > 0 ? `${dt}: ${Math.round((day.nutrients[k] / (target || 1)) * 100)}%` : `${dt}: no log`;
        return <span key={dt} className={`cell ${cls}`} title={title} />;
      })}
    </>
  );
}

function WeightChart({ weights }: { weights: AppState['weights'] }) {
  const pts = [...weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
  if (pts.length < 2) return <p className="muted small">Log a couple more weigh-ins to see a trend.</p>;
  const w = 700;
  const h = 160;
  const padL = 40;
  const min = Math.min(...pts.map((p) => p.weightKg)) - 0.5;
  const max = Math.max(...pts.map((p) => p.weightKg)) + 0.5;
  const x = (i: number) => padL + (i / (pts.length - 1)) * (w - padL - 10);
  const y = (v: number) => 10 + ((max - v) / (max - min)) * (h - 30);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.weightKg).toFixed(1)}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Weight trend">
      {[min, (min + max) / 2, max].map((v) => (
        <g key={v}>
          <line className="grid-line" x1={padL} x2={w} y1={y(v)} y2={y(v)} />
          <text x={padL - 4} y={y(v) + 3} textAnchor="end">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      <path className="line" d={path} />
      {pts.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.weightKg)} r={3} fill="var(--protein)">
          <title>
            {p.date}: {p.weightKg} kg
          </title>
        </circle>
      ))}
      <text x={x(0)} y={h - 4}>
        {pts[0].date}
      </text>
      <text x={x(pts.length - 1)} y={h - 4} textAnchor="end">
        {pts[pts.length - 1].date}
      </text>
    </svg>
  );
}
