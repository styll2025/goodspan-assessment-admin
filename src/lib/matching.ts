import practicesData from '../data/practices-data.json';
import { uniqueMemberCities } from './cities';
import type {
  Barrier,
  Challenge,
  Circle,
  HabitKey,
  Level,
  MatchingSettings,
  Pillar,
  Plan,
  PlanItem,
  Practice,
  PracticesData,
  Respondent,
  SlotSwap,
  TimePerDay,
} from '../types';

export const PRACTICES = practicesData as PracticesData;

export const PILLARS: Pillar[] = ['sleep', 'eat', 'move', 'mind'];

export const PILLAR_LABEL: Record<Pillar, string> = {
  sleep: 'Sleep',
  eat: 'Eat',
  move: 'Move',
  mind: 'Mind',
};

export const GOOD_PILLAR_LABEL: Record<Pillar, string> = {
  sleep: 'GoodSleep',
  eat: 'GoodEat',
  move: 'GoodMove',
  mind: 'GoodMind',
};

export const PILLAR_TINT: Record<Pillar, { bg: string; fg: string }> = {
  sleep: { bg: '#E7EEF8', fg: '#2C4A6B' },
  eat: { bg: '#F3ECDD', fg: '#7A5A20' },
  move: { bg: '#EAF2D2', fg: '#4A6B22' },
  mind: { bg: '#EDE6F3', fg: '#5C3A7A' },
};

export const TIME_TO_LEVEL: Record<TimePerDay, Level> = {
  under5: 'gentle',
  '5to15': 'gentle',
  '15to30': 'moderate',
  '30plus': 'deep',
};

export const HABIT_MAX: Record<HabitKey, number> = {
  sleepConsistency: 3,
  sleepWindDown: 2,
  movementFrequency: 3,
  structuredExercise: 2,
  mealComposition: 3,
  eatingRhythm: 2,
  calmPractice: 2,
  socialConnection: 2,
};

export const HABIT_LABEL: Record<HabitKey, string> = {
  sleepConsistency: 'Bedtime and wake consistency',
  sleepWindDown: 'Evening wind-down routine',
  movementFrequency: 'Daily movement',
  structuredExercise: 'Structured exercise days',
  mealComposition: 'Protein and vegetables at meals',
  eatingRhythm: 'Eating rhythm and timing',
  calmPractice: 'Calming or reflective practice',
  socialConnection: 'Meaningful social connection',
};

export const HABIT_CATEGORY_MAP: Record<Pillar, Partial<Record<HabitKey, string[]>>> = {
  sleep: {
    sleepConsistency: ['Circadian Alignment'],
    sleepWindDown: ['Wind Down', 'Screentime'],
  },
  move: {
    movementFrequency: ['Incidental Movement & Sedentary Behavior'],
    structuredExercise: ['Structured Cardio', 'Strength & Resistance'],
  },
  eat: {
    mealComposition: ['Nourish'],
    eatingRhythm: ['Rhythm'],
  },
  mind: {
    calmPractice: ['Mindfulness & Meditation'],
    socialConnection: ['Social Connection & Vulnerability'],
  },
};

export const PILLAR_BOOST_MAP: Record<Challenge, Pillar> = {
  'Trouble sleeping': 'sleep',
  'Difficulty unwinding': 'sleep',
  'Low energy': 'move',
  'Sedentary lifestyle': 'move',
  'Unhealthy eating habits': 'eat',
  'Stress/overwhelm': 'mind',
  'Social isolation': 'mind',
  'Lack of routine': 'mind',
  'Screen overuse': 'mind',
  'Low motivation/accountability': 'mind',
};

export const CHALLENGE_KEYWORDS: Record<Challenge, string[]> = {
  'Trouble sleeping': ['sleep', 'bed', 'night', 'nap', 'circadian'],
  'Low energy': ['energy', 'walk', 'steps', 'protein', 'morning'],
  'Stress/overwhelm': ['breath', 'stress', 'relax', 'reframe', 'meditat', 'calm'],
  'Sedentary lifestyle': ['steps', 'walk', 'stand', 'sit', 'mobility', 'stair'],
  'Unhealthy eating habits': ['meal', 'protein', 'vegetable', 'snack', 'plant', 'nourish', 'processed'],
  'Social isolation': ['circle', 'friend', 'share', 'conversation', 'invite', 'social', 'connection'],
  'Lack of routine': ['schedule', 'consistent', 'routine', 'regular', 'plan'],
  'Screen overuse': ['phone', 'screen', 'notification', 'digital', 'social media'],
  'Difficulty unwinding': ['wind down', 'relax', 'breath', 'music', 'journal', 'muscle'],
  'Low motivation/accountability': ['track', 'goal', 'streak', 'celebrate', 'accountability', 'circle'],
};

export const SOCIAL_CATEGORIES: Record<Pillar, string[]> = {
  sleep: ['Share', 'Celebrate'],
  eat: ['Share', 'Celebrate'],
  mind: ['Social Connection & Vulnerability'],
  move: ['Social & Accountability'],
};

const SHARE_WITH_GROUP_CATEGORIES = new Set(Object.values(SOCIAL_CATEGORIES).flat());

export function isShareWithGroupCategory(category: string): boolean {
  return SHARE_WITH_GROUP_CATEGORIES.has(category);
}

export const BARRIER_OPTIONS: Barrier[] = [
  "I don't have much time",
  'I struggle to stay consistent',
  "I don't know where to start",
  'I lose motivation without support or accountability',
  'My schedule changes a lot',
  'I prefer to do things on my own',
  "Nothing major — I'm ready to start",
];

export const AGE_BAND_ORDER: Respondent['ageBand'][] = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

export const START_FLAGS_PER_PLAN = 2;

export const DEFAULT_SETTINGS: MatchingSettings = {
  statedGoalWeight: 0.25,
  challengeBoost: 0.15,
  keywordWeight: 5,
  habitPriority: 50,
  circleGuarantee: true,
  startWithThis: {
    flagsPerPlan: 2,
    effortWeight: 2,
    visibilityWeight: 1,
    habitProximityBonus: 4,
    barrierMatchBonus: 3,
    minVisibility: 2,
  },
  targetCircleSize: 6,
  minCircleSize: 5,
  maxCircleSize: 9,
  timeToLevel: { ...TIME_TO_LEVEL },
  traitWeights: {
    ageBand: 1,
    gender: 1,
    personality: 1,
    lifeStage: 1,
    work: 1,
    home: 1,
  },
  habitCategoryMap: structuredClone(HABIT_CATEGORY_MAP),
  challengeKeywords: structuredClone(CHALLENGE_KEYWORDS),
  challengePillars: { ...PILLAR_BOOST_MAP },
};

export function cloneSettings(settings: MatchingSettings = DEFAULT_SETTINGS): MatchingSettings {
  return structuredClone(settings);
}

type ScoredPractice = Practice & { category: string; score: number };
type ScoredCategory = { category: string; practices: ScoredPractice[] };

export function normalizeRespondent(raw: Record<string, unknown>, index = 0): Respondent {
  const habit = (key: HabitKey): number => {
    const score = raw[`${key}Score`];
    const value = score ?? raw[key];
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const habitAnswers: Partial<Record<HabitKey, string>> = {};
  (Object.keys(HABIT_MAX) as HabitKey[]).forEach((key) => {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() && !Number.isFinite(Number(value))) {
      habitAnswers[key] = value.trim();
    }
  });

  return {
    id: String(raw.id ?? raw._id ?? raw.email ?? `respondent-${index}`),
    preferredName: stringValue(raw.preferredName),
    email: stringValue(raw.email),
    submittedAt: stringValue(raw.submittedAt),
    motivations: arrayValue(raw.motivations),
    focusArea: pillarOrUnsure(raw.focusArea),
    mainChallenges: arrayValue(raw.mainChallenges).filter(isChallenge),
    barriers: arrayValue(raw.barriers).filter(isBarrier),
    ageBand: ageBandValue(raw.ageBand),
    workStatus: stringValue(raw.workStatus ?? raw.workSituation),
    homeLife: stringValue(raw.homeLife),
    gender: stringValue(raw.gender),
    genderSelfDescribe: stringValue(raw.genderSelfDescribe) || undefined,
    location: stringValue(raw.location),
    personality: personalityValue(raw.personality),
    lifeStage: stringValue(raw.lifeStage),
    habitAnswers,
    sleepConsistency: habit('sleepConsistency'),
    sleepWindDown: habit('sleepWindDown'),
    movementFrequency: habit('movementFrequency'),
    structuredExercise: habit('structuredExercise'),
    mealComposition: habit('mealComposition'),
    eatingRhythm: habit('eatingRhythm'),
    calmPractice: habit('calmPractice'),
    socialConnection: habit('socialConnection'),
    timePerDay: timeValue(raw.timePerDay),
  };
}

export function norm(value: number | null | undefined, max: number): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0.5;
  return (max - value) / max;
}

export function habitScores(respondent: Respondent): Record<Pillar, number> {
  return {
    sleep: (norm(respondent.sleepConsistency, 3) + norm(respondent.sleepWindDown, 2)) / 2,
    move: (norm(respondent.movementFrequency, 3) + norm(respondent.structuredExercise, 2)) / 2,
    eat: (norm(respondent.mealComposition, 3) + norm(respondent.eatingRhythm, 2)) / 2,
    mind: (norm(respondent.calmPractice, 2) + norm(respondent.socialConnection, 2)) / 2,
  };
}

export function computeRecommendation(
  respondent: Respondent,
  settings: MatchingSettings = DEFAULT_SETTINGS,
): Pick<Plan, 'pillarId' | 'levelId' | 'scores' | 'overridden'> {
  const scores = habitScores(respondent);
  respondent.mainChallenges.forEach((challenge) => {
    const pillar = settings.challengePillars[challenge];
    if (pillar && pillar !== 'none') scores[pillar] += settings.challengeBoost;
  });

  const levelId = settings.timeToLevel[respondent.timePerDay] ?? TIME_TO_LEVEL[respondent.timePerDay] ?? 'moderate';
  const focusArea = respondent.focusArea;
  const hasStatedGoal = Boolean(focusArea) && focusArea !== 'unsure';
  const statedGoalWeight = settings.statedGoalWeight;

  if (statedGoalWeight >= 1 && hasStatedGoal) {
    return { pillarId: focusArea, levelId, scores, overridden: true };
  }

  if (hasStatedGoal) scores[focusArea] += statedGoalWeight;

  const pillarId = PILLARS.reduce((best, pillar) => (scores[pillar] > scores[best] ? pillar : best), 'sleep');
  return { pillarId, levelId, scores, overridden: false };
}

export function scorePracticeByChallenges(
  practice: Practice,
  category: string,
  mainChallenges: Challenge[],
  settings: MatchingSettings = DEFAULT_SETTINGS,
): number {
  const haystack = `${practice.text} ${category}`.toLowerCase();
  return mainChallenges.reduce((score, challenge) => {
    const hits = (settings.challengeKeywords[challenge] ?? []).filter((keyword) => keyword && haystack.includes(keyword));
    return score + hits.length * settings.keywordWeight;
  }, 0);
}

export function matchedChallengeTerms(
  practice: Practice,
  category: string,
  mainChallenges: Challenge[],
  settings: MatchingSettings = DEFAULT_SETTINGS,
): { challenge: Challenge; keyword: string }[] {
  const haystack = `${practice.text} ${category}`.toLowerCase();
  return mainChallenges.flatMap((challenge) =>
    (settings.challengeKeywords[challenge] ?? [])
      .filter((keyword) => keyword && haystack.includes(keyword))
      .map((keyword) => ({ challenge, keyword })),
  );
}

export function normalizeSlotSwap(value: string | SlotSwap | undefined): SlotSwap | null {
  if (!value) return null;
  if (typeof value === 'string') return value ? { category: '', text: value } : null;
  if (!value.text && !value.displayCategory && !value.displayText && value.displayWhy == null && value.displayEvidence == null) return null;
  return {
    category: value.category ?? '',
    text: value.text ?? '',
    ...(value.displayCategory ? { displayCategory: value.displayCategory } : {}),
    ...(value.displayText ? { displayText: value.displayText } : {}),
    ...(value.displayWhy != null ? { displayWhy: value.displayWhy } : {}),
    ...(value.displayEvidence != null ? { displayEvidence: value.displayEvidence } : {}),
  };
}

export function applySlotSwaps(
  items: PlanItem[],
  scoredCategories: ScoredCategory[],
  swaps: Record<number, string | SlotSwap>,
): PlanItem[] {
  return items.map((item, index) => {
    const swap = normalizeSlotSwap(swaps[index]);
    if (!swap) return item;
    const targetName = swap.category || item.category;
    const family = scoredCategories.find((entry) => entry.category === targetName);
    const chosen = family?.practices.find((practice) => practice.text === swap.text)
      ?? (swap.text ? family?.practices[0] : undefined);
    const base = family && chosen && (chosen.text !== item.practice.text || family.category !== item.category)
      ? toPlanItem(family, chosen, item.reason)
      : item;
    return applySlotCopy(base, swap);
  });
}

function applySlotCopy(item: PlanItem, swap: SlotSwap): PlanItem {
  if (!swap.displayCategory && !swap.displayText && swap.displayWhy == null && swap.displayEvidence == null) return item;
  return {
    ...item,
    category: swap.displayCategory || item.category,
    practice: {
      ...item.practice,
      text: swap.displayText || item.practice.text,
      ...(swap.displayWhy != null ? { why: swap.displayWhy } : {}),
      ...(swap.displayEvidence != null ? { evidence: swap.displayEvidence, references: [] } : {}),
    },
  };
}

export function otherCategoryOptions(
  pillarId: Pillar,
  levelId: Level,
  respondent: Respondent,
  currentItems: PlanItem[],
  currentCategory: string,
  settings: MatchingSettings = DEFAULT_SETTINGS,
  bank: PracticesData = PRACTICES,
): Array<{ category: string; practice: Practice; used: boolean; score: number }> {
  return buildScoredCategories(pillarId, levelId, respondent, settings, bank)
    .filter((family) => family.category !== currentCategory && family.practices[0])
    .map((family) => ({
      category: family.category,
      practice: family.practices[0],
      used: currentItems.some((item) => item.category === family.category),
      score: family.practices[0].score,
    }))
    .sort((left, right) => Number(left.used) - Number(right.used) || right.score - left.score);
}

export function buildPlan(
  respondent: Respondent,
  settings: MatchingSettings = DEFAULT_SETTINGS,
  overrides?: { pillarId?: Pillar; levelId?: Level; swaps?: Record<number, string | SlotSwap> },
  bank: PracticesData = PRACTICES,
): Plan {
  const rec = computeRecommendation(respondent, settings);
  const pillarId = overrides?.pillarId ?? rec.pillarId;
  const levelId = overrides?.levelId ?? rec.levelId;
  const scoredCategories = buildScoredCategories(pillarId, levelId, respondent, settings, bank);
  let items = buildSlots(scoredCategories, pillarId, respondent, settings);
  if (overrides?.swaps) {
    items = applySlotSwaps(items, scoredCategories, overrides.swaps);
  }
  return {
    respondentId: respondent.id,
    pillarId,
    levelId,
    overridden: rec.overridden,
    scores: rec.scores,
    items: flagStartWithThis(items, pillarId, respondent, settings),
  };
}

export const CIRCLE_LOCATION_KEY = 'all';

export function circleLocationLabel(members: Respondent[]): string {
  return uniqueMemberCities(members.map((member) => member.location)).join(', ') || 'unspecified';
}

export function autoCluster(
  respondents: Respondent[],
  plans: Map<string, Plan>,
  settings: MatchingSettings = DEFAULT_SETTINGS,
): Circle[] {
  const buckets = new Map<Pillar, Respondent[]>();
  respondents.forEach((respondent) => {
    const plan = plans.get(respondent.id);
    if (!plan) return;
    const people = buckets.get(plan.pillarId) ?? [];
    people.push(respondent);
    buckets.set(plan.pillarId, people);
  });

  return [...buckets.entries()].flatMap(([pillarId, people]) =>
    buildDiverseGroups(people, settings).map((group, groupIndex) => ({
      id: circleId(pillarId, CIRCLE_LOCATION_KEY, groupIndex),
      pillarId,
      ...group,
      city: circleLocationLabel(group.members),
    })),
  );
}

export function circleId(pillarId: Pillar, city: string, index: number | string): string {
  return `${pillarId}::${city}::${index}`;
}

export function newCircleId(pillarId: Pillar, city: string, seedMemberId: string): string {
  return `manual:${circleId(pillarId, city, seedMemberId)}`;
}

export function applyCircleOverrides(
  circles: Circle[],
  overrides: Record<string, string>,
  settings: MatchingSettings = DEFAULT_SETTINGS,
): Circle[] {
  const next = circles.map((circle) => ({ ...circle, members: [...circle.members] }));
  const byId = new Map(next.map((circle) => [circle.id, circle]));

  Object.entries(overrides).forEach(([memberId, targetId]) => {
    if (!targetId) return;
    let target = byId.get(targetId);
    if (!target) {
      const created = createCircleFromId(targetId);
      if (!created) return;
      target = created;
      next.push(target);
      byId.set(target.id, target);
    }
    const source = next.find((circle) => circle.members.some((member) => member.id === memberId));
    if (!source || source.id === target.id) return;
    const member = source.members.find((entry) => entry.id === memberId);
    if (!member) return;
    source.members = source.members.filter((entry) => entry.id !== memberId);
    target.members = [...target.members, member];
  });

  return next
    .filter((circle) => circle.members.length > 0)
    .map((circle) => ({
      ...circle,
      city: circleLocationLabel(circle.members),
      needsMore: circle.members.length < settings.minCircleSize,
      mixed: circle.members.length > settings.maxCircleSize,
    }));
}

export function moveCircleMemberIn(
  circles: Circle[],
  memberId: string,
  targetId: string,
  settings: MatchingSettings = DEFAULT_SETTINGS,
): Circle[] {
  if (!targetId) return circles;
  const next = circles.map((circle) => ({ ...circle, members: [...circle.members] }));
  const source = next.find((circle) => circle.members.some((member) => member.id === memberId));
  if (!source) return circles;
  let target = next.find((circle) => circle.id === targetId);
  if (!target) {
    const created = createCircleFromId(targetId);
    if (!created) return circles;
    target = created;
    next.push(target);
  }
  if (source.id !== target.id) {
    const member = source.members.find((entry) => entry.id === memberId);
    if (!member) return circles;
    source.members = source.members.filter((entry) => entry.id !== memberId);
    target.members = [...target.members, member];
  }
  return next
    .filter((circle) => circle.members.length > 0)
    .map((circle) => ({
      ...circle,
      city: circleLocationLabel(circle.members),
      needsMore: circle.members.length < settings.minCircleSize,
      mixed: circle.members.length > settings.maxCircleSize,
    }));
}

export function snapshotCircleOverrides(circles: Circle[]): Record<string, string> {
  const next: Record<string, string> = {};
  circles.forEach((circle) => {
    circle.members.forEach((member) => {
      next[member.id] = circle.id;
    });
  });
  return next;
}

export function movedCircleIds(
  overrides: Record<string, string>,
  autoCircles: Circle[],
): Record<string, string> {
  const next: Record<string, string> = {};
  Object.entries(overrides).forEach(([memberId, targetId]) => {
    if (!targetId) return;
    const home = autoCircles.find((circle) => circle.members.some((member) => member.id === memberId));
    if (!home || home.id !== targetId) next[memberId] = targetId;
  });
  return next;
}

function createCircleFromId(targetId: string): Circle | null {
  const parsed = parseCircleId(targetId);
  if (!parsed) return null;
  return {
    id: targetId,
    pillarId: parsed.pillarId,
    city: parsed.city,
    members: [],
    needsMore: true,
    mixed: false,
  };
}

function parseCircleId(id: string): { pillarId: Pillar; city: string } | null {
  const body = id.startsWith('manual:') ? id.slice('manual:'.length) : id;
  const [pillarId, ...rest] = body.split('::');
  if (!PILLARS.includes(pillarId as Pillar) || rest.length < 2) return null;
  return { pillarId: pillarId as Pillar, city: rest.slice(0, -1).join('::') };
}

export function suggestCircleFor(person: Respondent, circles: Circle[]): Circle | null {
  const circle = circles.find((candidate) => candidate.members.some((member) => member.id === person.id));
  if (!circle) return null;
  return {
    ...circle,
    members: circle.members.filter((member) => member.id !== person.id),
  };
}

export function isSharedLevelFamily(practices: Practice[]): boolean {
  return practices.length > 0 && new Set(practices.map((practice) => practice.text)).size === 1;
}

export function practicesForLevel(practices: Practice[], levelId: Level): Practice[] {
  const exact = practices.filter((practice) => practice.level === levelId);
  if (exact.length) return exact;
  if (isSharedLevelFamily(practices)) return [practices[0]];
  return exact;
}

export function libraryLevelLabel(practices: Practice[], practice: Practice): string {
  return isSharedLevelFamily(practices) ? 'all levels' : practice.level;
}

function buildScoredCategories(
  pillarId: Pillar,
  levelId: Level,
  respondent: Respondent,
  settings: MatchingSettings,
  bank: PracticesData = PRACTICES,
): ScoredCategory[] {
  return Object.entries(bank[pillarId] ?? {}).map(([category, practices]) => ({
    category,
    practices: practicesForLevel(practices, levelId)
      .map((practice) => ({
        ...practice,
        category,
        score: scorePracticeByChallenges(practice, category, respondent.mainChallenges, settings),
      }))
      .sort((a, b) => b.score - a.score),
  }));
}

function buildSlots(
  categories: ScoredCategory[],
  pillarId: Pillar,
  respondent: Respondent,
  settings: MatchingSettings,
): PlanItem[] {
  const socialNames = SOCIAL_CATEGORIES[pillarId];
  const social = categories
    .filter((category) => socialNames.includes(category.category))
    .sort((a, b) => topScore(b) - topScore(a))[0];

  const slots: PlanItem[] = [];
  if (settings.circleGuarantee && social?.practices[0]) {
    slots.push(toPlanItem(social, social.practices[0], 'social'));
  }

  const remaining = categories
    .filter((category) => !(settings.circleGuarantee && category === social))
    .map((category) => {
      const driver = categoryHabitDriver(pillarId, category.category, respondent, settings);
      const habitWeak = driver?.weakness ?? 0;
      const challengeBest = topScore(category);
      const priority = habitWeak * settings.habitPriority + challengeBest;
      const reason: PlanItem['reason'] =
        driver && habitWeak > 0.3 && habitWeak * settings.habitPriority >= challengeBest
          ? (`habit:${driver.habitKey}` as const)
          : challengeBest > 0
            ? 'challenge'
            : 'balance';
      return { category, priority, reason };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5 - slots.length);

  remaining.forEach(({ category, reason }) => {
    if (category.practices[0]) slots.push(toPlanItem(category, category.practices[0], reason));
  });

  if (slots.length < 5) {
    const used = new Set(slots.map((slot) => `${slot.category}|${slot.practice.text}`));
    const fill = categories
      .flatMap((category) => category.practices.map((practice) => ({ category, practice })))
      .filter(({ category, practice }) => !used.has(`${category.category}|${practice.text}`))
      .sort((a, b) => b.practice.score - a.practice.score);

    while (slots.length < 5 && fill.length) {
      const next = fill.shift();
      if (next) slots.push(toPlanItem(next.category, next.practice, 'fill'));
    }
  }

  return slots;
}

export function categoryHabitDriver(
  pillarId: Pillar,
  categoryName: string,
  respondent: Respondent,
  settings: MatchingSettings = DEFAULT_SETTINGS,
): { habitKey: HabitKey; weakness: number } | null {
  const map = settings.habitCategoryMap[pillarId];
  let best: { habitKey: HabitKey; weakness: number } | null = null;

  Object.entries(map).forEach(([habitKey, categories]) => {
    if (!categories?.includes(categoryName)) return;
    const key = habitKey as HabitKey;
    const weakness = norm(respondent[key], HABIT_MAX[key]);
    if (!best || weakness > best.weakness) best = { habitKey: key, weakness };
  });

  return best;
}

function toPlanItem(
  category: ScoredCategory,
  practice: ScoredPractice,
  reason: PlanItem['reason'],
): PlanItem {
  return {
    category: category.category,
    practice,
    score: practice.score,
    reason,
    alternatives: category.practices.filter((item) => item.text !== practice.text),
    startWithThis: false,
  };
}

function startWithThisSettings(settings: MatchingSettings) {
  return {
    ...DEFAULT_SETTINGS.startWithThis,
    ...settings.startWithThis,
  };
}

export function startScore(
  item: PlanItem,
  pillarId: Pillar,
  respondent: Respondent,
  settings: MatchingSettings = DEFAULT_SETTINGS,
): number {
  const effort = item.practice.effort;
  const visibility = item.practice.visibility;
  if (!Number.isInteger(effort) || !Number.isInteger(visibility)) return Number.NEGATIVE_INFINITY;
  const start = startWithThisSettings(settings);
  let score = (4 - effort) * start.effortWeight + visibility * start.visibilityWeight;

  const habitDriver = categoryHabitDriver(pillarId, item.category, respondent, settings);
  if (habitDriver && habitDriver.weakness < 0.99) {
    score += (1 - habitDriver.weakness) * start.habitProximityBonus;
  }

  const bonus = start.barrierMatchBonus;
  const barriers = respondent.barriers ?? [];
  if (barriers.includes("I don't have much time") && effort === 1) score += bonus;
  if (barriers.includes('My schedule changes a lot') && effort === 1) score += bonus;
  if (barriers.includes('I struggle to stay consistent') && effort === 1) score += bonus;
  if (barriers.includes("I don't know where to start") && effort === 1 && visibility >= 2) score += bonus;

  return score;
}

export function flagStartWithThis(
  planItems: PlanItem[],
  pillarId: Pillar,
  respondent: Respondent,
  settings: MatchingSettings = DEFAULT_SETTINGS,
): PlanItem[] {
  const start = startWithThisSettings(settings);
  const byStartScore = (left: PlanItem, right: PlanItem) => {
    const delta = startScore(right, pillarId, respondent, settings) - startScore(left, pillarId, respondent, settings);
    if (delta !== 0) return delta;
    return planItems.indexOf(left) - planItems.indexOf(right);
  };

  const nonShare = planItems.filter((item) => !isShareWithGroupCategory(item.category));
  const preferred = nonShare.filter((item) => {
    const visibility = item.practice.visibility;
    return Number.isInteger(visibility) && visibility >= start.minVisibility;
  });
  const fallback = nonShare.filter((item) => !preferred.includes(item));
  const ranked = [...preferred].sort(byStartScore).concat([...fallback].sort(byStartScore));
  const flagged = new Set(ranked.slice(0, Math.min(START_FLAGS_PER_PLAN, ranked.length)));
  return planItems.map((item) => ({ ...item, startWithThis: flagged.has(item) }));
}

export function practicesForDisplay(items: PlanItem[]): Array<{ item: PlanItem; slotIndex: number }> {
  const ranked = items
    .map((item, slotIndex) => ({ item, slotIndex }))
    .sort((a, b) => Number(b.item.startWithThis) - Number(a.item.startWithThis) || a.slotIndex - b.slotIndex);

  const share = ranked.filter((entry) => isShareWithGroupCategory(entry.item.category));
  const rest = ranked.filter((entry) => !isShareWithGroupCategory(entry.item.category));
  if (share.length === 0 || rest.length === 0) return ranked;

  const headCount = Math.min(2, rest.length);
  return [...rest.slice(0, headCount), ...share, ...rest.slice(headCount)];
}

export function buildDiverseGroups(
  pool: Respondent[],
  settings: MatchingSettings = DEFAULT_SETTINGS,
): Array<Pick<Circle, 'members' | 'needsMore' | 'mixed'>> {
  const { minCircleSize, maxCircleSize, targetCircleSize } = settings;
  const people = [...pool].sort((a, b) => a.preferredName.localeCompare(b.preferredName));
  if (people.length < minCircleSize) {
    return [{ members: people, needsMore: true, mixed: false }];
  }

  const groupCount = chooseGroupCount(people.length, minCircleSize, maxCircleSize, targetCircleSize);
  const capacity = Math.ceil(people.length / groupCount);
  const groups: Respondent[][] = Array.from({ length: groupCount }, () => []);

  people.forEach((person) => {
    const available = groups.filter((group) => group.length < capacity);
    const candidates = available.length ? available : groups;
    const best = candidates.reduce((winner, group) => {
      const score = clashScore(group, person, settings);
      const winnerScore = clashScore(winner, person, settings);
      if (score < winnerScore) return group;
      if (score === winnerScore && group.length < winner.length) return group;
      return winner;
    }, candidates[0]);
    best.push(person);
  });

  return groups
    .filter((group) => group.length > 0)
    .map((members) => ({
      members,
      needsMore: members.length < minCircleSize,
      mixed: members.length > maxCircleSize,
    }));
}

function chooseGroupCount(n: number, minSize: number, maxSize: number, _targetSize: number): number {
  if (n <= maxSize) return 1;
  let numGroups = Math.max(1, Math.ceil(n / maxSize));
  while (numGroups > 1 && n / numGroups < minSize) numGroups -= 1;
  return numGroups;
}

function clashScore(group: Respondent[], candidate: Respondent, settings: MatchingSettings): number {
  const weights = settings.traitWeights;
  return group.reduce((score, member) => {
    return (
      score +
      same(member.ageBand, candidate.ageBand) * weights.ageBand +
      same(member.gender, candidate.gender) * weights.gender +
      same(member.personality, candidate.personality) * weights.personality +
      same(member.workStatus, candidate.workStatus) * weights.work +
      same(member.homeLife, candidate.homeLife) * weights.home
    );
  }, 0);
}

function topScore(category: ScoredCategory): number {
  return category.practices[0]?.score ?? 0;
}


function same(a: string, b: string): number {
  return (a || 'Unspecified') === (b || 'Unspecified') ? 1 : 0;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.includes(';')) return value.split(';').map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value) return [value];
  return [];
}

function isChallenge(value: string): value is Challenge {
  return Object.prototype.hasOwnProperty.call(PILLAR_BOOST_MAP, value);
}

function isBarrier(value: string): value is Barrier {
  return (BARRIER_OPTIONS as string[]).includes(value);
}

function pillarOrUnsure(value: unknown): Pillar | 'unsure' {
  return PILLARS.includes(value as Pillar) ? (value as Pillar) : 'unsure';
}

function timeValue(value: unknown): TimePerDay {
  return value === 'under5' || value === '5to15' || value === '15to30' || value === '30plus' ? value : '15to30';
}

function ageBandValue(value: unknown): Respondent['ageBand'] {
  const bands: Respondent['ageBand'][] = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  return bands.includes(value as Respondent['ageBand']) ? (value as Respondent['ageBand']) : '25-34';
}

function personalityValue(value: unknown): Respondent['personality'] {
  return value === 'introvert' || value === 'ambivert' || value === 'extrovert' ? value : 'ambivert';
}
