import { NUTRIENT_META, type NutrientKey } from '../core';
import { clamp01, fmtAmount, pct } from './format';

export function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const ratio = target > 0 ? consumed / target : 0;
  const shown = clamp01(ratio);
  const over = ratio > 1.05;
  const remaining = Math.round(target - consumed);
  return (
    <svg className="ring" viewBox="0 0 150 150" role="img" aria-label={`${Math.round(consumed)} of ${target} calories`}>
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
      <circle
        cx="75"
        cy="75"
        r={r}
        fill="none"
        stroke={over ? 'var(--bad)' : 'var(--accent)'}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${c * shown} ${c}`}
        transform="rotate(-90 75 75)"
      />
      <text x="75" y="68" textAnchor="middle" fontSize="22" fontWeight="700">
        {Math.round(consumed)}
      </text>
      <text x="75" y="86" textAnchor="middle" className="sub">
        of {target} kcal
      </text>
      <text x="75" y="102" textAnchor="middle" className="sub">
        {remaining >= 0 ? `${remaining} left` : `${-remaining} over`}
      </text>
    </svg>
  );
}

export function NutrientBar({ k, value, target }: { k: NutrientKey; value: number; target: number }) {
  const meta = NUTRIENT_META[k];
  const ratio = target > 0 ? value / target : 0;
  const cls = meta.limit ? (ratio > 1 ? 'over' : ratio > 0.85 ? 'warn' : '') : ratio > 1.25 ? 'warn' : '';
  return (
    <div className="nutrient-row">
      <span>{meta.label}</span>
      <div className="bar">
        <i className={cls} style={{ width: `${clamp01(ratio) * 100}%` }} />
      </div>
      <span className="val mono">
        {fmtAmount(value, k)} / {fmtAmount(target, k)}
      </span>
    </div>
  );
}

export function MicroTile({ k, value, target }: { k: NutrientKey; value: number; target: number }) {
  const meta = NUTRIENT_META[k];
  const ratio = target > 0 ? value / target : 0;
  const cls = meta.limit ? (ratio > 1 ? 'low' : ratio > 0.85 ? 'mid' : 'ok') : ratio < 0.5 ? 'low' : ratio < 0.85 ? 'mid' : 'ok';
  return (
    <div className={`micro ${cls}`}>
      <div className="name">
        {meta.label}
        {meta.limit ? ' (limit)' : ''}
      </div>
      <div className="pct">{pct(ratio)}</div>
      <div className="amt mono">
        {fmtAmount(value, k)} / {fmtAmount(target, k)}
      </div>
    </div>
  );
}
