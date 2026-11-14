import { StrictMode, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

declare const __NUDGE_CONFIG__: { bridgeUrl: string; token: string } | null;
const DevOverlay = import.meta.env.DEV
  ? lazy(() => import('@usenudge/react').then((m) => ({ default: m.Nudge })))
  : null;
function App() {
  const [count, setCount] = useState(0);
  return (
    <>
      <header>
        <a href="/" className="brand">
          n<span>↗</span> Nudge
        </a>
        <span className="local">● LOCAL WORKSPACE</span>
      </header>
      <main>
        <p className="eyebrow">THE DEMO / ANALYTICS</p>
        <h1>A little room for improvement.</h1>
        <p className="intro">
          Point at something. Describe a change. Review what your coding agent
          makes.
        </p>
        <div className="metrics">
          <article data-testid="revenue-card">
            <p>Monthly revenue</p>
            <strong>$24,860</strong>
            <small>↗ 12.8% this month</small>
          </article>
          <article>
            <p>Active developers</p>
            <strong>1,482</strong>
            <small>↗ 8.2% this month</small>
          </article>
          <article>
            <p>Changes reviewed</p>
            <strong>94</strong>
            <small>Human approved, every time</small>
          </article>
        </div>
        <section className="chart" data-testid="analytics-chart">
          <div className="section-title">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h2>Activity over time</h2>
            </div>
            <span>Last 7 days</span>
          </div>
          <div className="bars" aria-label="Weekly activity chart">
            {[42, 66, 53, 84, 63, 90, 76].map((height, i) => (
              <div key={i}>
                <div style={{ height: `${height}%` }} />
                <small>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="try">
          <div>
            <h2>Try a normal interaction</h2>
            <p>This button works normally while annotation mode is off.</p>
          </div>
          <button
            data-testid="normal-control"
            onClick={() => setCount(count + 1)}
          >
            Clicked {count} times
          </button>
        </section>
        <p className="hint">
          Open Nudge in the lower corner to annotate this dashboard. Queuing
          saves locally; ask your agent to fetch the request.
        </p>
      </main>
      {DevOverlay && __NUDGE_CONFIG__ && (
        <Suspense fallback={null}>
          <DevOverlay enabled={import.meta.env.DEV} {...__NUDGE_CONFIG__} />
        </Suspense>
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
