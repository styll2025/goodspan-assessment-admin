import { useMemo, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  HABIT_LABEL,
  PILLAR_LABEL,
  PILLARS,
  PRACTICES,
  autoCluster,
  buildPlan,
  habitScores,
  matchedChallengeTerms,
  normalizeRespondent,
  suggestCircleFor,
} from './lib/matching';
import { generateSampleRespondents } from './lib/sampleData';
import type { Circle, MatchingSettings, Pillar, Plan, Respondent } from './types';

type Tab = 'respondents' | 'circles' | 'practices' | 'settings';

const DEFAULT_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbxu69Ns0-WMnGqefvoJhY0WHw-4wAl1SikHjBqQywYzN_55oWRiVFibH6e5wEriSmJH/exec';

export default function App() {
  const [tab, setTab] = useState<Tab>('respondents');
  const [respondents, setRespondents] = useState<Respondent[]>(() => generateSampleRespondents());
  const [selectedId, setSelectedId] = useState<string>('sample-0');
  const [settings, setSettings] = useState<MatchingSettings>(DEFAULT_SETTINGS);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [status, setStatus] = useState('Sample data loaded');
  const [practicePillar, setPracticePillar] = useState<Pillar | 'all'>('all');
  const [practiceQuery, setPracticeQuery] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  const plans = useMemo(
    () => new Map(respondents.map((respondent) => [respondent.id, buildPlan(respondent, settings)])),
    [respondents, settings],
  );
  const circles = useMemo(() => autoCluster(respondents, plans, settings), [respondents, plans, settings]);
  const selected = respondents.find((respondent) => respondent.id === selectedId) ?? respondents[0] ?? null;
  const selectedPlan = selected ? plans.get(selected.id) ?? null : null;
  const selectedCircle = selected ? suggestCircleFor(selected, circles) : null;

  async function loadFromSheet() {
    setStatus('Loading responses from sheet...');
    try {
      const response = await fetch(sheetUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = (await response.json()) as Record<string, unknown>[];
      if (!Array.isArray(rows)) throw new Error('Expected an array of respondent rows');
      const next = rows.map(normalizeRespondent);
      setRespondents(next);
      setSelectedId(next[0]?.id ?? '');
      setStatus(`Loaded ${next.length} respondents from sheet`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load responses');
    }
  }

  function loadFromJson() {
    try {
      const parsed = JSON.parse(jsonInput) as Record<string, unknown>[];
      if (!Array.isArray(parsed)) throw new Error('Paste a JSON array of respondents');
      const next = parsed.map(normalizeRespondent);
      setRespondents(next);
      setSelectedId(next[0]?.id ?? '');
      setStatus(`Loaded ${next.length} respondents from pasted JSON`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Invalid JSON');
    }
  }

  function loadSamples() {
    const next = generateSampleRespondents();
    setRespondents(next);
    setSelectedId(next[0]?.id ?? '');
    setStatus('Sample data loaded');
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">GoodSpan admin</p>
          <h1>Practice Matcher</h1>
          <p className="lede">
            Match assessment respondents to evidence-based practices and proposed Circles using the current GoodSpan logic.
          </p>
        </div>
        <div className="heroStats">
          <Stat label="Respondents" value={respondents.length} />
          <Stat label="Circles" value={circles.length} />
          <Stat label="Practice bank" value={practiceCount()} />
        </div>
      </header>

      <nav className="tabs">
        {(['respondents', 'circles', 'practices', 'settings'] as Tab[]).map((item) => (
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {title(item)}
          </button>
        ))}
      </nav>

      {tab === 'respondents' && (
        <section className="grid two">
          <aside className="card">
            <div className="cardHeader">
              <div>
                <p className="eyebrow">Responses</p>
                <h2>{respondents.length} people</h2>
              </div>
              <button onClick={loadSamples}>Load sample data</button>
            </div>
            <div className="respondentList">
              {respondents.map((respondent) => {
                const plan = plans.get(respondent.id);
                return (
                  <button
                    key={respondent.id}
                    className={respondent.id === selected?.id ? 'person selected' : 'person'}
                    onClick={() => setSelectedId(respondent.id)}
                  >
                    <strong>{respondent.preferredName || 'Unnamed'}</strong>
                    <span>
                      {respondent.location || 'No location'} · {plan ? PILLAR_LABEL[plan.pillarId] : 'No plan'}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="card">
            {selected && selectedPlan ? (
              <RespondentPlan respondent={selected} plan={selectedPlan} circle={selectedCircle} />
            ) : (
              <Empty title="No respondent selected" text="Load responses or sample data to inspect a match." />
            )}
          </section>
        </section>
      )}

      {tab === 'circles' && <CirclesView circles={circles} plans={plans} />}

      {tab === 'practices' && (
        <PracticeBank
          pillar={practicePillar}
          query={practiceQuery}
          onPillar={setPracticePillar}
          onQuery={setPracticeQuery}
        />
      )}

      {tab === 'settings' && (
        <SettingsView
          settings={settings}
          onSettings={setSettings}
          sheetUrl={sheetUrl}
          onSheetUrl={setSheetUrl}
          onLoadSheet={loadFromSheet}
          status={status}
          jsonInput={jsonInput}
          onJsonInput={setJsonInput}
          onLoadJson={loadFromJson}
        />
      )}
    </main>
  );
}

function RespondentPlan({
  respondent,
  plan,
  circle,
}: {
  respondent: Respondent;
  plan: Plan;
  circle: Circle | null;
}) {
  const scores = habitScores(respondent);

  return (
    <div>
      <p className="eyebrow">Selected respondent</p>
      <div className="split">
        <div>
          <h2>{respondent.preferredName || 'Unnamed'}</h2>
          <p className="muted">
            {respondent.email || 'No email'} · {respondent.location || 'No location'}
          </p>
        </div>
        <Pill label={PILLAR_LABEL[plan.pillarId]} />
      </div>

      <div className="summary">
        <Stat label="Matched Span" value={PILLAR_LABEL[plan.pillarId]} />
        <Stat label="Intensity" value={title(plan.levelId)} />
        <Stat label="Override" value={plan.overridden ? 'Yes' : 'No'} />
      </div>

      <h3>Recommended practices</h3>
      <div className="practiceList">
        {plan.items.map((item, index) => (
          <article key={`${item.category}-${item.practice.text}`} className="practice">
            <div className="practiceTop">
              <span className="slot">{index + 1}</span>
              <div>
                <p className="eyebrow">{item.category}</p>
                <h4>{item.practice.text}</h4>
              </div>
              <Pill label={reasonLabel(item.reason)} />
            </div>
            {item.practice.why && <p>{item.practice.why}</p>}
            {matchedChallengeTerms(item.practice, item.category, respondent.mainChallenges).length > 0 && (
              <p className="muted">
                Keywords:{' '}
                {matchedChallengeTerms(item.practice, item.category, respondent.mainChallenges)
                  .map((term) => `${term.keyword} (${term.challenge})`)
                  .join(', ')}
              </p>
            )}
            {item.practice.references.length > 0 && (
              <details>
                <summary>Evidence</summary>
                {item.practice.evidence && <p>{item.practice.evidence}</p>}
                <ul>
                  {item.practice.references.map((reference) => (
                    <li key={reference}>{reference}</li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>

      <h3>Why this Span</h3>
      <div className="scoreGrid">
        {PILLARS.map((pillar) => (
          <div key={pillar} className="scoreRow">
            <span>{PILLAR_LABEL[pillar]}</span>
            <div className="bar">
              <i style={{ width: `${Math.max(4, Math.min(100, scores[pillar] * 100))}%` }} />
            </div>
            <strong>{plan.scores[pillar].toFixed(2)}</strong>
          </div>
        ))}
      </div>

      <h3>Profile and Circle</h3>
      <div className="summary">
        <Stat label="Age" value={respondent.ageBand} />
        <Stat label="Work" value={respondent.workStatus || 'Unspecified'} />
        <Stat label="Home" value={respondent.homeLife || 'Unspecified'} />
        <Stat label="Personality" value={title(respondent.personality)} />
      </div>
      <p className="muted">
        Challenges: {respondent.mainChallenges.length ? respondent.mainChallenges.join(', ') : 'None selected'}
      </p>
      <p>
        {circle && circle.members.length
          ? `Proposed Circle mates: ${circle.members.map((member) => member.preferredName).join(', ')}`
          : 'No Circle mates yet for this exact city and Span.'}
      </p>
    </div>
  );
}

function CirclesView({ circles, plans }: { circles: Circle[]; plans: Map<string, Plan> }) {
  return (
    <section className="card">
      <p className="eyebrow">Suggested Circles</p>
      <h2>{circles.length} groups</h2>
      <div className="circleGrid">
        {circles.map((circle, index) => (
          <article key={`${circle.pillarId}-${circle.city}-${index}`} className="circle">
            <div className="split">
              <div>
                <Pill label={PILLAR_LABEL[circle.pillarId]} />
                <h3>Circle {index + 1}</h3>
                <p className="muted">{circle.city}</p>
              </div>
              {(circle.needsMore || circle.mixed) && <Pill label={circle.needsMore ? 'Needs more' : 'Review size'} />}
            </div>
            <ul>
              {circle.members.map((member) => (
                <li key={member.id}>
                  <strong>{member.preferredName}</strong>
                  <span>
                    {member.ageBand} · {member.gender || 'Unspecified'} ·{' '}
                    {plans.get(member.id) ? PILLAR_LABEL[plans.get(member.id)!.pillarId] : 'No plan'}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function PracticeBank({
  pillar,
  query,
  onPillar,
  onQuery,
}: {
  pillar: Pillar | 'all';
  query: string;
  onPillar: (pillar: Pillar | 'all') => void;
  onQuery: (query: string) => void;
}) {
  const rows = PILLARS.flatMap((pillarId) =>
    Object.entries(PRACTICES[pillarId]).flatMap(([category, practices]) =>
      practices.map((practice) => ({ pillarId, category, practice })),
    ),
  ).filter((row) => {
    const matchesPillar = pillar === 'all' || row.pillarId === pillar;
    const text = `${row.category} ${row.practice.text} ${row.practice.why} ${row.practice.evidence}`.toLowerCase();
    return matchesPillar && (!query || text.includes(query.toLowerCase()));
  });

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <p className="eyebrow">Evidence-based practice bank</p>
          <h2>{rows.length} shown</h2>
        </div>
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search practices" />
      </div>
      <div className="filters">
        {(['all', ...PILLARS] as Array<Pillar | 'all'>).map((item) => (
          <button key={item} className={pillar === item ? 'active' : ''} onClick={() => onPillar(item)}>
            {item === 'all' ? 'All' : PILLAR_LABEL[item]}
          </button>
        ))}
      </div>
      <div className="practiceBank">
        {rows.map((row) => (
          <article key={`${row.pillarId}-${row.category}-${row.practice.text}`} className="practice">
            <p className="eyebrow">
              {PILLAR_LABEL[row.pillarId]} · {row.category} · {row.practice.level}
            </p>
            <h4>{row.practice.text}</h4>
            {row.practice.why && <p>{row.practice.why}</p>}
            {row.practice.evidence && <p className="muted">{row.practice.evidence}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsView({
  settings,
  onSettings,
  sheetUrl,
  onSheetUrl,
  onLoadSheet,
  status,
  jsonInput,
  onJsonInput,
  onLoadJson,
}: {
  settings: MatchingSettings;
  onSettings: (settings: MatchingSettings) => void;
  sheetUrl: string;
  onSheetUrl: (url: string) => void;
  onLoadSheet: () => void;
  status: string;
  jsonInput: string;
  onJsonInput: (value: string) => void;
  onLoadJson: () => void;
}) {
  return (
    <section className="grid two">
      <div className="card">
        <p className="eyebrow">Matching settings</p>
        <h2>Global scoring</h2>
        <label>
          Stated goal weight: {Math.round(settings.statedGoalWeight * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.statedGoalWeight}
            onChange={(event) => onSettings({ ...settings, statedGoalWeight: Number(event.target.value) })}
          />
        </label>
        <p className="muted">
          At 100%, the respondent&apos;s stated focus becomes a hard override. Below 100%, it is an additive nudge.
        </p>

        <h3>Circle size</h3>
        <div className="numberGrid">
          <NumberInput label="Min" value={settings.minCircleSize} onChange={(v) => onSettings({ ...settings, minCircleSize: v })} />
          <NumberInput label="Target" value={settings.targetCircleSize} onChange={(v) => onSettings({ ...settings, targetCircleSize: v })} />
          <NumberInput label="Max" value={settings.maxCircleSize} onChange={(v) => onSettings({ ...settings, maxCircleSize: v })} />
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">Data source</p>
        <h2>Load responses</h2>
        <label>
          Google Apps Script JSON endpoint
          <input value={sheetUrl} onChange={(event) => onSheetUrl(event.target.value)} />
        </label>
        <button onClick={onLoadSheet}>Load from sheet</button>
        <p className="muted">{status}</p>
        <label>
          Or paste respondent JSON
          <textarea value={jsonInput} onChange={(event) => onJsonInput(event.target.value)} placeholder="[{...}]" />
        </label>
        <button onClick={onLoadJson}>Load pasted JSON</button>
      </div>
    </section>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" min="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return <span className="pill">{label}</span>;
}

function Empty({ title: heading, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <h2>{heading}</h2>
      <p>{text}</p>
    </div>
  );
}

function practiceCount(): number {
  return PILLARS.reduce(
    (total, pillar) => total + Object.values(PRACTICES[pillar]).reduce((sum, practices) => sum + practices.length, 0),
    0,
  );
}

function reasonLabel(reason: Plan['items'][number]['reason']): string {
  if (reason === 'social') return 'Circle';
  if (reason.startsWith('habit:')) return HABIT_LABEL[reason.slice(6) as keyof typeof HABIT_LABEL];
  return title(reason);
}

function title(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
