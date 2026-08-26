import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_SETTINGS,
  HABIT_MAX,
  HABIT_LABEL,
  HABIT_CATEGORY_MAP,
  CHALLENGE_KEYWORDS,
  PILLAR_BOOST_MAP,
  PILLAR_LABEL,
  PILLARS,
  PRACTICES,
  SOCIAL_CATEGORIES,
  TIME_TO_LEVEL,
  autoCluster,
  buildPlan,
  matchedChallengeTerms,
  normalizeRespondent,
  suggestCircleFor,
} from './lib/matching';
import { generateSampleRespondents } from './lib/sampleData';
import type { Challenge, Circle, HabitKey, Level, MatchingSettings, Pillar, Plan, Respondent } from './types';

type Tab = 'respondents' | 'circles' | 'library' | 'settings';

const ADMIN_PASSCODE = 'goodspan-circle-2026';
const DEFAULT_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbxu69Ns0-WMnGqefvoJhY0WHw-4wAl1SikHjBqQywYzN_55oWRiVFibH6e5wEriSmJH/exec';
const HABIT_KEYS: HabitKey[] = [
  'sleepConsistency',
  'sleepWindDown',
  'movementFrequency',
  'structuredExercise',
  'mealComposition',
  'eatingRhythm',
  'calmPractice',
  'socialConnection',
];

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('gs_admin_authed') === 'true');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('respondents');
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<MatchingSettings>(DEFAULT_SETTINGS);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [status, setStatus] = useState('Not connected - using local data');
  const [practicePillar, setPracticePillar] = useState<Pillar | 'all'>('all');
  const [practiceLevel, setPracticeLevel] = useState<Level | 'all'>('all');
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
    setPlanOpen(false);
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

  const isPlanMode = Boolean(tab === 'respondents' && planOpen && selected && selectedPlan);

  return (
    <div className="appShell">
      {!isPlanMode && (
        <header className="topbar">
          <div className="topLeft">
            <div className="brandCompact">
              <strong>The Good Span</strong>
              <span>Practice Matcher</span>
            </div>
            <nav>
              {(['respondents', 'circles', 'library', 'settings'] as Tab[]).map((item) => (
                <button
                  key={item}
                  className={tab === item ? 'active navButton' : 'navButton'}
                  onClick={() => {
                    setTab(item);
                    setPlanOpen(false);
                  }}
                >
                  {item === 'library' ? 'Library' : title(item)}
                </button>
              ))}
            </nav>
          </div>
          <div className="topStatus">
            <span className="dot" />
            <span>{respondents.length} {respondents.length === 1 ? 'respondent' : 'respondents'}</span>
            <button className="textButton" onClick={logout}>Log out</button>
          </div>
        </header>
      )}

      {tab === 'respondents' && planOpen && selected && selectedPlan && (
        <PlanDocument respondent={selected} plan={selectedPlan} onBack={() => setPlanOpen(false)} />
      )}

      {tab === 'respondents' && !planOpen && (
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
                    onClick={() => {
                      setSelectedId(respondent.id);
                      setPlanOpen(false);
                    }}
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
              <RespondentPlan respondent={selected} plan={selectedPlan} circle={selectedCircle} onOpenPlan={() => setPlanOpen(true)} />
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
          level={practiceLevel}
          query={practiceQuery}
          onPillar={setPracticePillar}
          onLevel={setPracticeLevel}
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
  onOpenPlan,
}: {
  respondent: Respondent;
  plan: Plan;
  circle: Circle | null;
  onOpenPlan: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState<string | null>(null);
  const [sourceOpen, setSourceOpen] = useState<string | null>(null);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const rankedPillars = [...PILLARS].sort((a, b) => plan.scores[b] - plan.scores[a]);
  const goalUnsure = !respondent.focusArea || respondent.focusArea === 'unsure';
  const circleMembers = circle?.members.filter((member) => member.id !== respondent.id) ?? [];
  const circleCaption =
    circle && circle.members.length
      ? `${circle.members.length} people · ${circle.city || respondent.location || 'Location unknown'}`
      : `Needs more people on ${PILLAR_LABEL[plan.pillarId]}`;
  const goalRows: Array<[string, string]> = [
    ['Focus area', respondent.focusArea === 'unsure' ? "I'm not sure" : PILLAR_LABEL[respondent.focusArea]],
    ['Time available', labelForTime(respondent.timePerDay)],
    ['Challenges', respondent.mainChallenges.length ? respondent.mainChallenges.join(', ') : '-'],
    ['Motivations', respondent.motivations.length ? respondent.motivations.join(', ') : '-'],
  ];
  const profileRows: Array<[string, string]> = [
    ['Age range', respondent.ageBand],
    ['Work', respondent.workStatus || '-'],
    ['Home life', respondent.homeLife || '-'],
    ['Gender', respondent.genderSelfDescribe || respondent.gender || '-'],
    ['Personality', title(respondent.personality)],
    ['Location', respondent.location || '-'],
  ];

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
          <p className="eyebrow light">Recommended Span</p>
          <div className="spanTitle">
            <h2>{PILLAR_LABEL[plan.pillarId]}</h2>
            <span>{title(plan.levelId)} · {labelForTime(respondent.timePerDay)}</span>
          </div>
        </div>
        <div className="levelOverride">
          <p className="eyebrow light">Intensity override</p>
          <div>
            {(['gentle', 'moderate', 'deep'] as Level[]).map((level) => (
              <button key={level} className={level === plan.levelId ? 'selected' : ''} type="button">
                {title(level)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="contentGrid">
        <div>
          <div className="sectionHead">
            <div>
              <h3>Five personalised practices</h3>
              <span>{PILLAR_LABEL[plan.pillarId]} · {plan.levelId}</span>
            </div>
          </div>
          <button className="planButton" onClick={onOpenPlan}>
            <span>Generate personalised plan</span>
            <span>→</span>
          </button>
          <div className="practiceList">
            {plan.items.map((item, index) => {
              const itemKey = `${index}-${item.category}-${item.practice.text}`;
              const social = SOCIAL_CATEGORIES[plan.pillarId].includes(item.category);
              const reasonText = reasonLabel(item.reason);
              const source = item.practice.references.join('\n') || item.practice.evidence;
              const sourceExpanded = sourceOpen === itemKey;
              return (
                <article key={itemKey} className="practice">
                  <span className="slot">{String(index + 1).padStart(2, '0')}</span>
                  <div className="practiceBody">
                    <div className="practiceHead">
                      <span className={social ? 'familyLabel social' : 'familyLabel'}>
                        {item.category}{social ? ' · Circle' : ''}
                      </span>
                      <span className="practiceActions">
                        <button
                          title="How Swap works"
                          type="button"
                          onClick={() => setInfoOpen(infoOpen === itemKey ? null : itemKey)}
                        >
                          i
                        </button>
                        <button
                          title="Swap replaces this practice with a different one from the same category, at the same intensity."
                          type="button"
                          onClick={() => setSwapOpen(swapOpen === itemKey ? null : itemKey)}
                        >
                          {swapOpen === itemKey ? 'Close ↑' : 'Swap ↻'}
                        </button>
                      </span>
                    </div>
                    {infoOpen === itemKey && (
                      <div className="infoBox swapInfo">
                        <strong>How this slot was filled, and what Swap does</strong>
                        <p>One Circle-facing category is given a slot outright. The other four go to the highest-priority categories, scored on their best practice's keyword matches against the respondent's stated challenges plus a bonus if the category maps to a habit answer they gave weakly. The practice shown is that category's highest-scoring option at this intensity.</p>
                        <p>Swap lists the other practices in the same category at the same intensity, in scoring order, so the next-best fit is at the top. It changes this respondent only and leaves the Practice Bank untouched.</p>
                      </div>
                    )}
                    {reasonText && (
                      <span className={item.reason === 'social' ? 'reasonTag social' : 'reasonTag habit'}>
                        {reasonText}
                      </span>
                    )}
                    <h4>{item.practice.text}</h4>
                    {item.practice.why && <p className="practiceWhy">{item.practice.why}</p>}
                    {source && (
                      <div className="evidenceRow">
                        <span>Evidence</span>
                        <div>
                          <p className={sourceExpanded ? 'sourceText open' : 'sourceText'}>{source}</p>
                          {source.length > 62 && (
                            <button
                              type="button"
                              className="moreLink"
                              onClick={() => setSourceOpen(sourceExpanded ? null : itemKey)}
                            >
                              {sourceExpanded ? 'Less' : 'More'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {swapOpen === itemKey && (
                      <div className="alternativeBox">
                        <div>Alternatives in {item.category}</div>
                        {item.alternatives.length ? (
                          item.alternatives.map((alternative) => (
                            <button key={alternative.text} type="button">{alternative.text}</button>
                          ))
                        ) : (
                          <p>No alternatives at this intensity in this category.</p>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="inspector">
          <div className="inspectorHead">
            <h3>Pillar match</h3>
            <span className="scoreHeadMeta">
              <span>Score</span>
              <button
                type="button"
                className="scoreInfoBtn"
                title="How the pillar score works"
                onClick={() => setScoreInfoOpen((open) => !open)}
              >
                i
              </button>
            </span>
          </div>
          {scoreInfoOpen && (
            <div className="scoreExplain">
              <div>How the pillar score works</div>
              <p>Each pillar starts with a base score — the average of that pillar's two habit answers, normalised so worse current habits score higher (more room to grow), plus a fixed boost for every main challenge they selected that maps to it. This base runs from 0 up to roughly 1.15–1.30, depending on the pillar.</p>
              <p>On top of that base, their stated goal adds the Stated-goal influence weight set in Settings. At 100%, that weight isn't just “added” — the stated goal is used directly, overriding the base score entirely, and the numbers above are shown for reference only.</p>
              <p>The highest total (base + goal weight, or the override) wins the Span. If they said “I'm not sure” for their goal, there's no pillar to apply the weight to, so this slider has no effect regardless of position.</p>
            </div>
          )}
          {plan.overridden && (
            <div className="infoBox">
              <strong>Stated goal override active</strong>
              <p>Scores below are shown for reference only; they did not decide the outcome.</p>
            </div>
          )}
          {goalUnsure && (
            <div className="unsureNote">
              <p>This person said they weren't sure which area to focus on, so the stated-goal slider has no effect — their Span is decided entirely by habit answers and stated challenges.</p>
            </div>
          )}
          <div className="scoreGrid" style={{ opacity: plan.overridden ? 0.45 : 1 }}>
            {rankedPillars.map((pillar, index) => (
              <div key={pillar} className={index === 0 ? 'scoreRow winner' : 'scoreRow'}>
                <span>{PILLAR_LABEL[pillar]}</span>
                <div className="bar">
                  <i style={{ width: `${Math.min(100, Math.max(3, plan.scores[pillar] * 100))}%` }} />
                </div>
                <strong>{plan.scores[pillar].toFixed(2)}</strong>
              </div>
            ))}
          </div>

          <h3>Goals</h3>
          {goalRows.map(([label, value]) => (
            <Meta key={label} label={label} value={value} />
          ))}

          <h3>Habit signals</h3>
          <div className="habitSignalList">
            {HABIT_KEYS.map((habit) => {
              const score = normalizedHabitScore(respondent, habit);
              const pillar = pillarForHabit(habit);
              return (
                <div className="habitSignal" key={habit}>
                  <div>
                    <strong>{HABIT_LABEL[habit]}</strong>
                    <span>{score.toFixed(2)}</span>
                  </div>
                  <div>
                    <Pill label={PILLAR_LABEL[pillar]} tone={pillar} />
                    <small>Answer {respondent[habit]}</small>
                  </div>
                  <span className="miniBar"><i style={{ width: `${Math.max(4, Math.min(100, score * 100))}%` }} /></span>
                </div>
              );
            })}
          </div>
          <p className="muted">Worse current habits score higher, since they leave the most room to improve. The two questions per Span are averaged into the Pillar match above.</p>

          <h3>Profile</h3>
          {profileRows.map(([label, value]) => (
            <Meta key={label} label={label} value={value} />
          ))}
          <div className="tagGroup">
            <span>Motivations</span>
            <TagList items={respondent.motivations} empty="-" />
          </div>
          <div className="tagGroup">
            <span>Main challenges</span>
            <TagList items={respondent.mainChallenges} empty="-" />
          </div>
        </aside>
      </section>

      <section className="suggestedCircle">
        <div className="sectionHead">
          <div>
            <h3>Suggested Circle</h3>
          </div>
          <span>{circleCaption}</span>
        </div>
        {circleMembers.length === 0 ? (
          <p className="muted">Not enough respondents share this Span yet to suggest a Circle. Load more responses or sample data.</p>
        ) : (
          <div className="circleMemberList">
            {circleMembers.map((member) => (
              <div className="circleMember" key={member.id}>
                <span>{initials(member.preferredName)}</span>
                <div>
                  <strong>{member.preferredName}</strong>
                  <small>{member.ageBand} · {member.personality} · {member.workStatus || 'Work not stated'}</small>
                </div>
                <em>{member.location || '-'}</em>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function PlanDocument({
  respondent,
  plan,
  onBack,
}: {
  respondent: Respondent;
  plan: Plan;
  onBack: () => void;
}) {
  const firstName = respondent.preferredName.split(/\s+/)[0] || 'there';
  const spanWhy =
    plan.overridden
      ? `Your recommended longevity pillar for this Span is ${PILLAR_LABEL[plan.pillarId]}, because it is the area you told us you most want to work on.`
      : `Your recommended longevity pillar for this Span is ${PILLAR_LABEL[plan.pillarId]}, because it is where your check-in showed the most room to grow.`;
  const challengeDetail = respondent.mainChallenges.length
    ? `You also named ${respondent.mainChallenges.join(' and ')} among your main challenges, and your practices are tuned to those signals.`
    : 'Your practices are tuned mainly from your habit answers and stated focus.';

  return (
    <main className="planDoc">
      <div className="planToolbar" data-noprint>
        <button onClick={onBack}>← Back to respondent</button>
        <div>
          <span>{respondent.preferredName || 'Unnamed'} · {PILLAR_LABEL[plan.pillarId]} · {plan.levelId}</span>
          <button className="primary" onClick={() => window.print()}>Download Plan</button>
        </div>
      </div>

      <section className="planHero" data-planhero>
        <div>
          <div className="planHeroTop">
            <strong>The Good Span</strong>
            <div>
              <span>{PILLAR_LABEL[plan.pillarId]} Span</span>
              <span>{title(plan.levelId)} · 30 days</span>
            </div>
          </div>
          <div className="planHeroRule" />
          <h1>Your Personal Span Plan</h1>
          <p className="hello">{`Hi ${firstName},`}</p>
          <p>We've looked at your wellbeing check-in, current habits, strengths, challenges and personal goals to create a starting plan that fits you.</p>
          <div className="planHeroMeta">
            <Meta label="Prepared for" value={respondent.preferredName || 'Unnamed'} />
            <Meta label="Span" value={`${PILLAR_LABEL[plan.pillarId]} · ${title(plan.levelId)}`} />
            <Meta label="Starts" value="14 September" />
          </div>
        </div>
      </section>

      <section className="planBody" data-planbody>
        <PlanSection number="1" title="Your starting point">
          <p>Every GoodSpan journey starts with a small number of practices chosen to fit where you are right now.</p>
          <p>Rather than trying to change everything at once, we've identified a set of practices that we believe can have a meaningful positive impact on your wellbeing. Small, consistent changes can create benefits that ripple into other parts of life.</p>
        </PlanSection>

        <PlanSection number="2" title="Your Longevity Pillar">
          <div className="planCallout">
            <p>{spanWhy}</p>
            <p>{challengeDetail}</p>
          </div>
        </PlanSection>

        <PlanSection number="3" title="Your personalised practices">
          <p>These five practices are designed around you and your current situation.</p>
          <p>They are intended to help you build small, sustainable habits that fit your confidence, goals and everyday life. You don't need to do every practice every day. Instead, use them as your daily toolkit, choosing the ones that make sense for you as you build consistency.</p>
          <p>Throughout the journey, your Circle will be alongside you — sharing experiences, encouraging one another, checking in, and taking part in some practices together.</p>
          <div className="sharedQuote">Small steps are easier, and often more meaningful, when they're shared.</div>
          <div className="planPracticeList">
            {plan.items.map((item, index) => (
              <article className="planPractice" key={`${item.category}-${item.practice.text}`} data-plancard>
                <span>{index + 1}</span>
                <div>
                  <p className="eyebrow">{item.category}</p>
                  <h3>{item.practice.text}</h3>
                  {item.practice.why && <p>{item.practice.why}</p>}
                  {item.practice.evidence && (
                    <div className="planEvidence">
                      <strong>The Evidence</strong>
                      <p>{item.practice.evidence}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </PlanSection>

        <PlanSection number="4" title="Make it yours">
          <p>This is your starting plan, not a fixed one. If a practice doesn't feel right, you can request an easier or more challenging version, or replace it with a different practice that's a better fit. The goal is to find a routine you can stick with over the next 30 days.</p>
        </PlanSection>

        <PlanSection number="5" title="What happens next">
          <p>Your first Span is one step in your broader GoodSpan journey.</p>
          <p>We'll get started on the 14th of September.</p>
          <p>Once your Span begins, your five personalised practices will guide your journey. As you go, you can adjust them and we'll continue tailoring them based on your feedback.</p>
          <p>You won't do it alone. Soon, we'll introduce you to your Span Coach and Circle, a small group of people taking the same journey. You'll encourage one another, share experiences and take part in activities throughout the month.</p>
          <p>The journey concludes with a closing Gathering, where every Circle comes together to celebrate the milestone and reflect on what they've achieved.</p>
        </PlanSection>

        <section className="beforeBegin">
          <div className="planSectionTitle">
            <span>6</span>
            <h2>Before you begin</h2>
          </div>
          <p>Good Span is designed to support healthy habits and wellbeing. It isn't a substitute for medical advice, diagnosis or treatment. If you have a diagnosed health condition or concerns about making lifestyle changes, please speak with a qualified healthcare professional before starting.</p>
        </section>
      </section>
    </main>
  );
}

function PlanSection({ number, title: heading, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="planSection">
      <div className="planSectionTitle">
        <span>{number}</span>
        <h2>{heading}</h2>
      </div>
      {children}
    </section>
  );
}

function TagList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <div className="tagList">
      {items.map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}

function normalizedHabitScore(respondent: Respondent, habit: HabitKey) {
  const max = HABIT_MAX[habit];
  const value = Number(respondent[habit]);
  if (!Number.isFinite(value) || max <= 0) return 0;
  return Math.max(0, Math.min(1, (max - value) / max));
}

function pillarForHabit(habit: HabitKey): Pillar {
  if (habit === 'sleepConsistency' || habit === 'sleepWindDown') return 'sleep';
  if (habit === 'movementFrequency' || habit === 'structuredExercise') return 'move';
  if (habit === 'mealComposition' || habit === 'eatingRhythm') return 'eat';
  return 'mind';
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '-';
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
  level,
  query,
  onPillar,
  onLevel,
  onQuery,
}: {
  pillar: Pillar | 'all';
  level: Level | 'all';
  query: string;
  onPillar: (pillar: Pillar | 'all') => void;
  onLevel: (level: Level | 'all') => void;
  onQuery: (query: string) => void;
}) {
  const rows = PILLARS.flatMap((pillarId) =>
    Object.entries(PRACTICES[pillarId]).flatMap(([category, practices]) =>
      practices.map((practice) => ({ pillarId, category, practice })),
    ),
  ).filter((row) => {
    const text = `${row.category} ${row.practice.text} ${row.practice.why} ${row.practice.evidence}`.toLowerCase();
    return (
      (pillar === 'all' || row.pillarId === pillar) &&
      (level === 'all' || row.practice.level === level) &&
      (!query || text.includes(query.toLowerCase()))
    );
  });
  const grouped = PILLARS.map((pillarId) => ({
    pillarId,
    rows: rows.filter((row) => row.pillarId === pillarId),
  })).filter((group) => group.rows.length > 0);
  const allChallenges = Object.keys(CHALLENGE_KEYWORDS) as Challenge[];

  return (
    <main className="page">
      <section className="pageIntro">
        <p className="eyebrow">Library</p>
        <h1>Practice Bank</h1>
        <p>All practices across the four core Span pillars.</p>
      </section>
      <div className="filterBar">
        <div className="segmented">
          {(['all', ...PILLARS] as Array<Pillar | 'all'>).map((item) => (
            <button key={item} className={pillar === item ? 'active' : ''} onClick={() => onPillar(item)}>
              {item === 'all' ? 'All' : PILLAR_LABEL[item]}
            </button>
          ))}
        </div>
        <div className="segmented">
          {(['all', 'gentle', 'moderate', 'deep'] as Array<Level | 'all'>).map((item) => (
            <button key={item} className={level === item ? 'active' : ''} onClick={() => onLevel(item)}>
              {item === 'all' ? 'All levels' : title(item)}
            </button>
          ))}
        </div>
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search practice text..." />
        <span className="shownLabel">{rows.length} shown</span>
      </div>
      {rows.length === 0 ? (
        <p className="emptyLine">No practices match these filters.</p>
      ) : (
        grouped.map((group) => (
          <section key={group.pillarId} className="bankGroup">
            <div className="bankTitle">
              <h2>{PILLAR_LABEL[group.pillarId]}</h2>
              <span>{group.rows.length} {group.rows.length === 1 ? 'practice' : 'practices'}</span>
            </div>
            <div className="bankGrid bankHead">
              <span>Level</span>
              <span>Category</span>
              <span>Practice</span>
              <span>Keywords matched</span>
              <span>Evidence</span>
            </div>
            {group.rows.map((row) => {
              const terms = matchedChallengeTerms(row.practice, row.category, allChallenges);
              return (
                <article key={`${row.pillarId}-${row.category}-${row.practice.text}`} className="bankGrid bankRow">
                  <span className={`levelText ${row.practice.level}`}>{row.practice.level}</span>
                  <span className="categoryText">{row.category}</span>
                  <strong>{row.practice.text}</strong>
                  <span className="keywordCell">
                    {terms.length
                      ? terms.slice(0, 4).map((term) => (
                          <span className="keywordChip" key={`${term.challenge}-${term.keyword}`}>
                            {term.keyword}
                            <small>{term.challenge}</small>
                          </span>
                        ))
                      : '—'}
                  </span>
                  <span className="evidenceText">{row.practice.evidence || row.practice.references[0] || '—'}</span>
                </article>
              );
            })}
          </section>
        ))
      )}
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
  const timeRows = (Object.keys(TIME_TO_LEVEL) as Array<keyof typeof TIME_TO_LEVEL>).map((time) => ({
    time,
    label: labelForTime(time),
    level: TIME_TO_LEVEL[time],
  }));
  const traitRows = [
    ['Age band', 'Counts once for each member already in the same age band.'],
    ['Gender', 'Counts once for each member with the same gender answer.'],
    ['Personality', 'Counts once for each member of the same type.'],
    ['Work situation', 'Counts once for each member with the same work situation.'],
    ['Home life', 'Counts once for each member with the same home-life answer.'],
  ];
  const habitRows = PILLARS.flatMap((pillar) =>
    Object.entries(HABIT_CATEGORY_MAP[pillar]).map(([habit, categories]) => ({
      pillar,
      habit: habit as keyof typeof HABIT_LABEL,
      categories: categories ?? [],
    })),
  );
  const challengeRows = Object.keys(CHALLENGE_KEYWORDS).map((challenge) => ({
    challenge: challenge as Challenge,
    pillar: PILLAR_BOOST_MAP[challenge as Challenge],
    keywords: CHALLENGE_KEYWORDS[challenge as Challenge],
  }));

  return (
    <main className="page">
      <section className="pageIntro">
        <p className="eyebrow">Configuration</p>
        <h1>Settings</h1>
        <p>Where responses come from, and how to reset the matcher while you are piloting.</p>
      </section>

      <section className="settingSection">
        <div>
          <h2>Data source</h2>
          <p>Paste the Google Apps Script Web App URL that serves your response sheet. Without it, the tool reads locally loaded responses.</p>
        </div>
        <div className="settingBody">
          <div className="statusBox">
            <span className="dot" />
            <strong>{status}</strong>
          </div>
          <label>
            Web App URL
            <input placeholder="https://script.google.com/macros/s/.../exec" value={sheetUrl} onChange={(event) => onSheetUrl(event.target.value)} />
          </label>
          <div className="buttonRow">
            <button className="primary" onClick={onLoadSheet}>Connect</button>
            <button onClick={onLoadSheet}>↻ Refresh responses</button>
          </div>
        </div>
      </section>

      <section className="settingSection">
        <div>
          <h2>Matching and display</h2>
          <p>How the matcher weighs a respondent's stated goal. These apply to every respondent.</p>
        </div>
        <div className="settingBody">
          <div className="sliderBlock">
            <div className="sliderHead">
              <strong>Stated-goal influence</strong>
              <span>{Math.round(settings.statedGoalWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.statedGoalWeight}
              onChange={(event) => onSettings({ ...settings, statedGoalWeight: Number(event.target.value) })}
            />
            <div className="rangeLabels">
              <span>Habit answers only</span>
              <span>Favour stated goal</span>
            </div>
            <p>At 0%, the Span comes from habit answers and stated challenges. Moving the slider adds a boost toward their stated goal. At 100%, their stated goal is used directly.</p>
          </div>
          <div className="subBlock">
            <strong>Time to level</strong>
            <p>Level comes straight from stated daily time, with no scoring. Admins can still override it per respondent.</p>
            {timeRows.map((row) => (
              <div className="mappingRow" key={row.time}>
                <span>{row.label}</span>
                <Pill label={title(row.level)} />
              </div>
            ))}
          </div>
          <div className="toggleInfo">
            <div>
              <strong>Circle-guarantee slot</strong>
              <p>Assigns a slot outright to the best-scoring Circle-facing category, before anything else is ranked. Where a pillar has two such categories, only the stronger one is assigned; the other competes on merit.</p>
            </div>
            <Pill label="On" />
          </div>
          <div className="explainBox">
            <strong>How the five slots are chosen</strong>
            <p>First, the best-scoring Circle-facing category is given a slot outright. Then remaining categories are ranked on their best practice's keyword score plus weak-habit priority.</p>
            <p>This is what makes two people on the same Span differ: bad bedtime consistency pulls in Circadian Alignment, a poor wind-down pulls in Wind Down.</p>
          </div>
          <SettingMetric label="Weak-habit priority" value="x50" text="Multiplies how weak that specific habit answer is, and adds the result to the category it maps to." />
          <SettingMetric label="Challenge boost" value="+0.15" text="Added to a pillar score for every stated main challenge that maps to it." />
          <SettingMetric label="Points per keyword match" value="+5" text="Decides which practice in each category is picked, and which fill leftover slots." />
          <div className="subBlock">
            <strong>Circle-facing categories</strong>
            {PILLARS.map((pillar) => (
              <div className="mappingRow" key={pillar}>
                <span>{PILLAR_LABEL[pillar]}</span>
                <span>{SOCIAL_CATEGORIES[pillar].join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="settingSection">
        <div>
          <h2>Circle formation</h2>
          <p>Circles are grouped by same Span and exact city, then mixed for diversity across age, gender, personality, work and home life.</p>
        </div>
        <div className="settingBody">
          <div className="subBlock">
            <strong>How much each trait matters</strong>
            <p>Use these numbers to control how strongly each trait affects mixing.</p>
            <div className="explainGrid">
              <span>Higher number:</span><p>the system works harder to avoid putting similar people together.</p>
              <span>0:</span><p>the system ignores that trait.</p>
              <span>Same number for all traits:</span><p>all traits have the same importance.</p>
            </div>
          </div>
          {traitRows.map(([label, desc]) => (
            <SettingMetric key={label} label={label} value="1 pt" text={desc} />
          ))}
          <div className="subBlock">
            <strong>Group size, in people</strong>
            <p>The target is used to decide how many groups to make. Groups are flagged if they fall outside the minimum or maximum.</p>
          </div>
          <div className="numberGrid">
            <NumberInput label="Minimum size" value={settings.minCircleSize} onChange={(v) => onSettings({ ...settings, minCircleSize: v })} />
            <NumberInput label="Target size" value={settings.targetCircleSize} onChange={(v) => onSettings({ ...settings, targetCircleSize: v })} />
            <NumberInput label="Maximum size" value={settings.maxCircleSize} onChange={(v) => onSettings({ ...settings, maxCircleSize: v })} />
          </div>
          <div className="explainBox">
            <strong>Higher diversity</strong>
            <p>The system places each person into the Circle where they are least similar to the people already in it. Smaller groups are flagged as needing more people.</p>
          </div>
          <button onClick={() => onSettings(DEFAULT_SETTINGS)}>Restore default weights</button>
        </div>
      </section>

      <section className="settingSection">
        <div>
          <h2>Habits and goals</h2>
          <p>The three things a respondent tells us do different work. Habits decide the Span and category priority. The stated goal nudges the Span. Challenges pick the practice inside each category.</p>
        </div>
        <div className="settingBody">
          <div className="logicTable">
            <span>Habits</span><p>Averaged per Span to decide the match, and used question by question to prioritise categories.</p>
            <span>Goal</span><p>Adds the stated-goal influence to that Span's score. It never picks a practice on its own.</p>
            <span>Challenges</span><p>Boost a Span, and match keywords to choose the practice within each category.</p>
          </div>
          <p className="muted">
            The weights behind it: how weak the answer is (0-1) is multiplied by the weak-habit priority of <strong>x50</strong>, and keyword matches against stated challenges add <strong>+5 points</strong> each.
          </p>
          {habitRows.map((row) => (
            <div className="habitMapRow" key={`${row.pillar}-${row.habit}`}>
              <div>
                <Pill label={PILLAR_LABEL[row.pillar]} tone={row.pillar} />
                <strong>{HABIT_LABEL[row.habit]}</strong>
              </div>
              <span>{row.categories.join(', ')}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="settingSection">
        <div>
          <h2>Challenges, keywords and pillar boosts</h2>
          <p>Every practice gets +5 points for every keyword match between a respondent's selected challenges and the practice text or category. Matching is plain lowercase substring matching.</p>
        </div>
        <div className="settingBody">
          <SettingMetric label="Points per keyword match" value="+5" text="Each matching keyword adds five points to that practice for that respondent." />
          {challengeRows.map((row) => (
            <div className="challengeRule" key={row.challenge}>
              <div className="challengeHead">
                <strong>{row.challenge}</strong>
                <Pill label={PILLAR_LABEL[row.pillar]} tone={row.pillar} />
                <span>{row.keywords.length} terms</span>
              </div>
              <div className="keywordCell">
                {row.keywords.map((keyword) => <span className="keywordChip" key={keyword}>{keyword}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="settingSection">
        <div>
          <h2>Testing and reset</h2>
          <p>Sample respondents let you exercise the matching logic without live data. Resetting clears every manual override you have made this session.</p>
        </div>
        <div className="settingBody">
          <div className="toggleInfo">
            <div>
              <strong>Load sample data</strong>
              <p>Replaces the current list with 30 generated respondents, grouped into city and Span cohorts so Circles can actually form.</p>
            </div>
            <button onClick={onSample}>Load sample</button>
          </div>
          <div className="toggleInfo">
            <div>
              <strong>Reset overrides</strong>
              <p>No manual swaps or intensity overrides yet.</p>
            </div>
            <button onClick={() => onSettings(DEFAULT_SETTINGS)}>Reset</button>
          </div>
          <label>
            Paste respondent JSON
            <textarea value={jsonInput} onChange={(event) => onJsonInput(event.target.value)} placeholder="[{...}]" />
          </label>
          <button onClick={onLoadJson}>Load pasted JSON</button>
        </div>
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

function SettingMetric({ label, value, text }: { label: string; value: string; text: string }) {
  return (
    <div className="settingMetric">
      <div>
        <strong>{label}</strong>
        <p>{text}</p>
      </div>
      <span>{value}</span>
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
  if (reason.startsWith('habit:')) {
    const habit = HABIT_LABEL[reason.slice(6) as keyof typeof HABIT_LABEL];
    return habit ? `Prioritized on ${habit.toLowerCase()}` : '';
  }
  return '';
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
