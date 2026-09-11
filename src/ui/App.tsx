import { useState } from 'react';
import { addDays, todayKey } from '../core';
import { Foods } from './Foods';
import { LogFood } from './LogFood';
import { ProfileView } from './ProfileView';
import { useAppState, useDerived } from './store';
import { Suggest } from './Suggest';
import { Today } from './Today';
import { Trends } from './Trends';

type Tab = 'today' | 'log' | 'suggest' | 'trends' | 'profile' | 'foods';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '◔' },
  { id: 'log', label: 'Log', icon: '＋' },
  { id: 'suggest', label: 'Suggest', icon: '✦' },
  { id: 'trends', label: 'Trends', icon: '↗' },
  { id: 'profile', label: 'Profile', icon: '☺' },
  { id: 'foods', label: 'Foods', icon: '≡' },
];

export function App() {
  const { state, actions } = useAppState();
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState(() => todayKey());
  const derived = useDerived(state, date);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">N</span> NutriSense
        </div>
        <div className="datenav">
          <button className="btn small ghost" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            ‹
          </button>
          <input type="date" value={date} max={derived.today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button className="btn small ghost" onClick={() => setDate(addDays(date, 1))} disabled={date >= derived.today} aria-label="Next day">
            ›
          </button>
          {date !== derived.today && (
            <button className="btn small" onClick={() => setDate(derived.today)}>
              Today
            </button>
          )}
        </div>
      </header>

      {tab === 'today' && <Today state={state} d={derived} date={date} actions={actions} onLog={() => setTab('log')} onSuggest={() => setTab('suggest')} />}
      {tab === 'log' && <LogFood d={derived} date={date} actions={actions} />}
      {tab === 'suggest' && <Suggest d={derived} date={date} actions={actions} />}
      {tab === 'trends' && <Trends state={state} d={derived} />}
      {tab === 'profile' && <ProfileView state={state} d={derived} actions={actions} />}
      {tab === 'foods' && <Foods state={state} actions={actions} />}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
