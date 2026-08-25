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

type Tab = 'respondents' | 'circles' | 'library' | 'settings';

const ADMIN_PASSCODE = 'goodspan-circle-2026';
const DEFAULT_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbxu69Ns0-WMnGqefvoJhY0WHw-4wAl1SikHjBqQywYzN_55oWRiVFibH6e5wEriSmJH/exec';

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('gs_admin_authed') === 'true');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('respondents');
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<MatchingSettings>(DEFAULT_SETTINGS);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [status, setStatus] = useState('Not connected - using local data');
  const [practicePillar, setPracticePillar] = useState<Pillar | 'all'>('all');
  const [practiceQuery, setPracticeQuery] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  const plans = useMemo(
    () => new Map(respondents.map((respondent) => [respondent.id, buildPlan(respondent, settings)])),
    [respondents, settings],
  );
  const circles = useMemo(() => autoCluster(respondents, plans, settings), [respondents, plans, settings]);
  const filtered = respondents.filter((respondent) => {
    const q = search.toLowerCase();
    return !q || respondent.preferredName.toLowerCase().includes(q) || respondent.location.toLowerCase().includes(q);
  });
  const selected = respondents.find((respondent) => respondent.id === selectedId) ?? filtered[0] ?? null;
  const selectedPlan = selected ? plans.get(selected.id) ?? null : null;
  const selectedCircle = selected ? suggestCircleFor(selected, circles) : null;

  function login() {
    if (passcodeInput !== ADMIN_PASSCODE) {
      setLoginError('Incorrect passcode - try again.');
      return;
    }
    sessionStorage.setItem('gs_admin_authed', 'true');
    setAuthed(true);
    setLoginError('');
    setPasscodeInput('');
  }

  function logout() {
    sessionStorage.removeItem('gs_admin_authed');
    setAuthed(false);
  }

  async function loadFromSheet() {
    setStatus('Loading responses...');
    try {
      const response = await fetch(sheetUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = (await response.json()) as Record<string, unknown>[];
      if (!Array.isArray(rows)) throw new Error('Unexpected response shape');
      applyRespondents(rows.map(normalizeRespondent), `Connected to Google Sheet - ${rows.length} loaded`);
    } catch (error) {
      setStatus(error instanceof Error ? `Sheet error - ${error.message}` : 'Sheet error - using local data');
    }
  }

  function loadFromJson() {
    try {
      const parsed = JSON.parse(jsonInput) as Record<string, unknown>[];
      if (!Array.isArray(parsed)) throw new Error('Paste a JSON array of respondents');
      applyRespondents(parsed.map(normalizeRespondent), `${parsed.length} pasted respondents loaded`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Invalid JSON');
    }
  }

  function loadSamples() {
    const sample = generateSampleRespondents();
    applyRespondents(sample, `${sample.length} sample respondents loaded`);
  }

  function applyRespondents(next: Respondent[], nextStatus: string) {
    setRespondents(next);
    setSelectedId(next[0]?.id ?? '');
    setSearch('');
    setStatus(nextStatus);
  }

  if (!authed) {
    return (
      <div className="loginScreen">
        <div className="loginCard">
          <Brand />
          <p className="eyebrow">Internal tool</p>
          <h1>
            Practice
            <br />
            Matcher
          </h1>
          <div className="rule" />
          <p className="loginText">Enter the shared passcode to access respondent data and Circle matching.</p>
          <div className="loginForm">
            <input
              type="password"
              placeholder="Passcode"
              value={passcodeInput}
              onChange={(event) => {
                setPasscodeInput(event.target.value);
                setLoginError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') login();
              }}
            />
            <button className="primary" onClick={login}>
              Enter →
            </button>
          </div>
          {loginError && <p className="error">{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brandCompact">
          <strong>The Good Span</strong>
          <span>Admin</span>
        </div>
        <nav>
          {(['respondents', 'circles', 'library', 'settings'] as Tab[]).map((item) => (
            <button key={item} className={tab === item ? 'active navButton' : 'navButton'} onClick={() => setTab(item)}>
              {item === 'library' ? 'Library' : title(item)}
            </button>
          ))}
        </nav>
        <div className="topStatus">
          <span className="dot" />
          <span>{respondents.length} {respondents.length === 1 ? 'respondent' : 'respondents'}</span>
          <button className="textButton" onClick={logout}>Log out</button>
        </div>
      </header>

      {tab === 'respondents' && (
        <section className="respondentPage">
          <aside className="sidebar">
            <div className="sidebarSearch">
              <input
                placeholder="Search name or location..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {filtered.length === 0 && (
              <div className="sidebarEmpty">
                {respondents.length === 0
                  ? 'No responses loaded. Use Sample data to test the matching logic.'
                  : 'No respondents match this search.'}
              </div>
            )}
            {filtered.map((respondent) => {
              const plan = plans.get(respondent.id);
              return (
                <button
                  key={respondent.id}
                  className={respondent.id === selected?.id ? 'person selected' : 'person'}
                  onClick={() => setSelectedId(respondent.id)}
                >
                  <span className="personTop">
                    <strong>{respondent.preferredName || 'Unnamed'}</strong>
                    <small>{shortTime(respondent.timePerDay)}</small>
                  </span>
                  <span>{respondent.location || '-'} · {respondent.ageBand || '-'}</span>
                  <span className="personTags">
                    {plan && <Pill label={PILLAR_LABEL[plan.pillarId]} tone={plan.pillarId} />}
                    {plan && <small>{plan.levelId}</small>}
                  </span>
                </button>
              );
            })}
          </aside>

          <main className="detailPane">
            {selected && selectedPlan ? (
              <RespondentPlan respondent={selected} plan={selectedPlan} circle={selectedCircle} />
            ) : (
              <NoRespondents onSample={loadSamples} />
            )}
          </main>
        </section>
      )}

      {tab === 'circles' && <CirclesView circles={circles} plans={plans} settings={settings} />}

      {tab === 'library' && (
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
          onSample={loadSamples}
        />
      )}
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div>The Good Span</div>
      <span>For more years that matter</span>
    </div>
  );
}

function NoRespondents({ onSample }: { onSample: () => void }) {
  return (
    <div className="noRespondents">
      <p className="eyebrow">Nothing to match yet</p>
      <h2>No respondents</h2>
      <div className="rule" />
      <p>Responses submitted through the end-user assessment appear here automatically. To test the matching logic now, load a batch of realistic sample respondents.</p>
      <button className="primary" onClick={onSample}>Load sample data</button>
    </div>
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
    <>
      <section className="respondentHero">
        <p className="eyebrow">Respondent</p>
        <h1>{respondent.preferredName || 'Unnamed'}</h1>
        <div className="metaRows">
          <Meta label="Email" value={respondent.email || '-'} />
          <Meta label="Location" value={respondent.location || '-'} />
          <Meta label="Time" value={labelForTime(respondent.timePerDay)} />
        </div>
      </section>

      <section className="spanBand">
        <div>
          <p className="eyebrow light">Matched Span</p>
          <h2>{PILLAR_LABEL[plan.pillarId]}</h2>
        </div>
        <div>
          <p className="eyebrow light">Intensity</p>
          <h3>{title(plan.levelId)}</h3>
        </div>
      </section>

      <section className="contentGrid">
        <div>
          <h3>Practice plan</h3>
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
                    Matched:{' '}
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
        </div>

        <aside className="inspector">
          <h3>Pillar match</h3>
          <p className="muted">Habit answers are normalized so weaker current habits score higher, then challenge and stated-goal weights are applied.</p>
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

          <h3>Profile</h3>
          <Meta label="Age range" value={respondent.ageBand} />
          <Meta label="Work" value={respondent.workStatus || '-'} />
          <Meta label="Home life" value={respondent.homeLife || '-'} />
          <Meta label="Gender" value={respondent.gender || '-'} />
          <Meta label="Personality" value={title(respondent.personality)} />

          <h3>Circle</h3>
          <p className="muted">
            {circle && circle.members.length
              ? `${circle.members.length} other${circle.members.length === 1 ? '' : 's'} in this proposed Circle: ${circle.members.map((member) => member.preferredName).join(', ')}`
              : `No circle yet - needs more people in this city on ${PILLAR_LABEL[plan.pillarId]}.`}
          </p>
        </aside>
      </section>
    </>
  );
}

function CirclesView({
  circles,
  plans,
  settings,
}: {
  circles: Circle[];
  plans: Map<string, Plan>;
  settings: MatchingSettings;
}) {
  return (
    <main className="page">
      <section className="pageIntro">
        <p className="eyebrow">Auto-clustered</p>
        <h1>Suggested Circles</h1>
        <p>
          Two hard filters first - same Span, same city - then people are spread so each Circle mixes age, gender,
          personality, work situation and home life as widely as possible. Groups run {settings.minCircleSize} to{' '}
          {settings.maxCircleSize} people.
        </p>
        <div className="statsLine">
          <Stat label="Proposed Circles" value={circles.length} />
          <Stat label="Respondents" value={circles.reduce((sum, circle) => sum + circle.members.length, 0)} />
          <Stat label="Need attention" value={circles.filter((circle) => circle.needsMore || circle.mixed).length} />
        </div>
      </section>
      {circles.length === 0 ? (
        <p className="emptyLine">No respondents loaded yet - load sample data to see proposed Circles.</p>
      ) : (
        <div className="circleGrid">
          {circles.map((circle, index) => (
            <article key={`${circle.pillarId}-${circle.city}-${index}`} className="circle">
              <div className="split">
                <Pill label={PILLAR_LABEL[circle.pillarId]} tone={circle.pillarId} />
                {(circle.needsMore || circle.mixed) && <Pill label={circle.needsMore ? 'Needs more' : 'Review size'} />}
              </div>
              <h3>Circle {index + 1}</h3>
              <p className="muted">{circle.city}</p>
              <ul>
                {circle.members.map((member) => (
                  <li key={member.id}>
                    <strong>{member.preferredName}</strong>
                    <span>
                      {member.ageBand} · {member.gender || '-'} ·{' '}
                      {plans.get(member.id) ? PILLAR_LABEL[plans.get(member.id)!.pillarId] : 'No plan'}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </main>
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
    const text = `${row.category} ${row.practice.text} ${row.practice.why} ${row.practice.evidence}`.toLowerCase();
    return (pillar === 'all' || row.pillarId === pillar) && (!query || text.includes(query.toLowerCase()));
  });

  return (
    <main className="page">
      <section className="pageIntro">
        <p className="eyebrow">Practice Bank</p>
        <h1>Evidence-based library</h1>
        <p>Browse the same practice data used by respondent plans.</p>
        <div className="toolbar">
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search practices..." />
          <div className="filters">
            {(['all', ...PILLARS] as Array<Pillar | 'all'>).map((item) => (
              <button key={item} className={pillar === item ? 'active' : ''} onClick={() => onPillar(item)}>
                {item === 'all' ? 'All' : PILLAR_LABEL[item]}
              </button>
            ))}
          </div>
        </div>
      </section>
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
    </main>
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
  onSample,
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
  onSample: () => void;
}) {
  return (
    <main className="page settingsGrid">
      <section className="panel">
        <p className="eyebrow">Matching settings</p>
        <h2>Stated-goal influence</h2>
        <label>
          {Math.round(settings.statedGoalWeight * 100)}%
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
          At 100%, the stated goal wins outright. Below 100%, it is added to the score and can still lose.
        </p>
        <h3>Circle size</h3>
        <div className="numberGrid">
          <NumberInput label="Minimum" value={settings.minCircleSize} onChange={(v) => onSettings({ ...settings, minCircleSize: v })} />
          <NumberInput label="Target" value={settings.targetCircleSize} onChange={(v) => onSettings({ ...settings, targetCircleSize: v })} />
          <NumberInput label="Maximum" value={settings.maxCircleSize} onChange={(v) => onSettings({ ...settings, maxCircleSize: v })} />
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Data source</p>
        <h2>Load responses</h2>
        <label>
          Google Sheet endpoint
          <input value={sheetUrl} onChange={(event) => onSheetUrl(event.target.value)} />
        </label>
        <div className="buttonRow">
          <button className="primary" onClick={onLoadSheet}>Load sheet</button>
          <button onClick={onSample}>Load sample data</button>
        </div>
        <p className="muted">{status}</p>
        <label>
          Paste respondent JSON
          <textarea value={jsonInput} onChange={(event) => onJsonInput(event.target.value)} placeholder="[{...}]" />
        </label>
        <button onClick={onLoadJson}>Load pasted JSON</button>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function Pill({ label, tone }: { label: string; tone?: Pillar }) {
  return <span className={tone ? `pill ${tone}` : 'pill'}>{label}</span>;
}

function practiceCount(): number {
  return PILLARS.reduce(
    (total, pillar) => total + Object.values(PRACTICES[pillar]).reduce((sum, practices) => sum + practices.length, 0),
    0,
  );
}

function reasonLabel(reason: Plan['items'][number]['reason']): string {
  if (reason === 'social') return 'Circle practice';
  if (reason.startsWith('habit:')) return HABIT_LABEL[reason.slice(6) as keyof typeof HABIT_LABEL];
  return title(reason);
}

function labelForTime(value: string): string {
  return {
    under5: 'Under 5 min/day',
    '5to15': '5-15 min/day',
    '15to30': '15-30 min/day',
    '30plus': '30+ min/day',
  }[value] ?? '-';
}

function shortTime(value: string): string {
  return {
    under5: '<5 min',
    '5to15': '5-15 min',
    '15to30': '15-30 min',
    '30plus': '30+ min',
  }[value] ?? '-';
}

function title(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
