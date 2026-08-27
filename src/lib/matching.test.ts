import { describe, expect, it } from 'vitest';
import type { Barrier, PlanItem, Practice, Respondent } from '../types';
import {
  AGE_BAND_ORDER,
  DEFAULT_SETTINGS,
  SOCIAL_CATEGORIES,
  autoCluster,
  buildDiverseGroups,
  buildPlan,
  cloneSettings,
  computeRecommendation,
  flagStartWithThis,
} from './matching';
import { generateSampleRespondents } from './sampleData';

function respondent(overrides: Partial<Respondent> = {}): Respondent {
  return {
    id: 'r1',
    preferredName: 'Test Person',
    email: 'test@example.com',
    submittedAt: '2026-01-01T00:00:00.000Z',
    motivations: [],
    focusArea: 'unsure',
    mainChallenges: [],
    barriers: [],
    ageBand: '25-34',
    workStatus: 'Working full-time',
    homeLife: 'No children at home',
    gender: 'Woman',
    location: 'Lisbon, Portugal',
    personality: 'ambivert',
    sleepConsistency: 3,
    sleepWindDown: 2,
    movementFrequency: 3,
    structuredExercise: 2,
    mealComposition: 3,
    eatingRhythm: 2,
    calmPractice: 2,
    socialConnection: 2,
    timePerDay: '15to30',
    ...overrides,
  };
}

function settingsWithGoal(statedGoalWeight: number) {
  const settings = cloneSettings();
  settings.statedGoalWeight = statedGoalWeight;
  return settings;
}

function practice(overrides: Partial<Practice> & Pick<Practice, 'text'>): Practice {
  return {
    level: 'gentle',
    why: '',
    evidence: '',
    references: [],
    effort: 2,
    visibility: 2,
    ...overrides,
  };
}

function item(category: string, overrides: Partial<Practice> = {}): PlanItem {
  return {
    category,
    practice: practice({ text: category, ...overrides }),
    score: 0,
    reason: 'balance',
    alternatives: [],
    startWithThis: false,
  };
}

describe('A3 pillar match', () => {
  it('picks Mind when habits are perfect except Mind and one challenge maps to Move, at 0% goal weight', () => {
    const rec = computeRecommendation(
      respondent({
        calmPractice: 0,
        socialConnection: 0,
        mainChallenges: ['Low energy'],
      }),
      settingsWithGoal(0),
    );
    expect(rec.pillarId).toBe('mind');
    expect(rec.overridden).toBe(false);
  });

  it('uses a literal 100% stated-goal override even when Move scores much higher', () => {
    const rec = computeRecommendation(
      respondent({
        focusArea: 'sleep',
        movementFrequency: 0,
        structuredExercise: 0,
        mainChallenges: ['Low energy', 'Sedentary lifestyle'],
      }),
      settingsWithGoal(1),
    );
    expect(rec.pillarId).toBe('sleep');
    expect(rec.overridden).toBe(true);
  });

  it('does not override when focusArea is unsure, even at 100% goal weight', () => {
    const rec = computeRecommendation(
      respondent({
        focusArea: 'unsure',
        movementFrequency: 0,
        structuredExercise: 0,
        mainChallenges: ['Low energy', 'Sedentary lifestyle'],
      }),
      settingsWithGoal(1),
    );
    expect(rec.pillarId).toBe('move');
    expect(rec.overridden).toBe(false);
  });

  it('treats a mid-range stated-goal weight as a nudge, not a guarantee', () => {
    const rec = computeRecommendation(
      respondent({
        focusArea: 'sleep',
        movementFrequency: 0,
        structuredExercise: 0,
        mainChallenges: ['Low energy', 'Sedentary lifestyle'],
      }),
      settingsWithGoal(0.5),
    );
    expect(rec.pillarId).toBe('move');
    expect(rec.overridden).toBe(false);
  });
});

describe('C3 habit differentiation', () => {
  it('gives two people on the same Span different categories from different weak habits', () => {
    const settings = settingsWithGoal(1);
    const weakConsistency = buildPlan(
      respondent({
        id: 'a',
        focusArea: 'sleep',
        sleepConsistency: 0,
        sleepWindDown: 2,
      }),
      settings,
    );
    const weakWindDown = buildPlan(
      respondent({
        id: 'b',
        focusArea: 'sleep',
        sleepConsistency: 3,
        sleepWindDown: 0,
      }),
      settings,
    );

    expect(weakConsistency.pillarId).toBe('sleep');
    expect(weakWindDown.pillarId).toBe('sleep');
    const consistencyCategories = weakConsistency.items.map((entry) => entry.category);
    const windDownCategories = weakWindDown.items.map((entry) => entry.category);
    expect(consistencyCategories).toContain('Circadian Alignment');
    expect(windDownCategories).toContain('Wind Down');
    expect(weakConsistency.items.some((entry) => entry.reason === 'habit:sleepConsistency')).toBe(true);
    expect(weakWindDown.items.some((entry) => entry.reason === 'habit:sleepWindDown')).toBe(true);
    expect(consistencyCategories.indexOf('Circadian Alignment')).toBeLessThan(consistencyCategories.indexOf('Wind Down'));
    expect(windDownCategories.indexOf('Wind Down')).toBeLessThan(windDownCategories.indexOf('Circadian Alignment'));
  });
});

describe('C5 start with this', () => {
  it('never flags a visibility=1 practice even when it would otherwise rank in the top 2', () => {
    const person = respondent({ barriers: ["I don't have much time"] });
    const items = [
      item('Sleep Environment', { text: 'track steps baseline', effort: 1, visibility: 1 }),
      item('Sleep Pressure', { text: 'higher effort visible', effort: 3, visibility: 2 }),
      item('Wind Down', { text: 'medium visible', effort: 2, visibility: 2 }),
    ];
    const flagged = flagStartWithThis(items, 'sleep', person);
    expect(flagged.find((entry) => entry.practice.visibility === 1)?.startWithThis).toBe(false);
    expect(flagged.filter((entry) => entry.startWithThis).every((entry) => entry.practice.visibility >= 2)).toBe(true);
  });

  it('gives a near-max mapped habit a meaningful bonus over an equally easy weak-habit practice', () => {
    const person = respondent({
      sleepConsistency: 3,
      sleepWindDown: 0,
    });
    const items = [
      item('Circadian Alignment', { text: 'already doing well', effort: 2, visibility: 2 }),
      item('Wind Down', { text: 'biggest gap', effort: 2, visibility: 2 }),
      item('Sleep Environment', { text: 'unmapped higher vis', effort: 2, visibility: 3 }),
    ];
    const flagged = flagStartWithThis(items, 'sleep', person);
    expect(flagged.find((entry) => entry.category === 'Circadian Alignment')?.startWithThis).toBe(true);
    expect(flagged.find((entry) => entry.category === 'Wind Down')?.startWithThis).toBe(false);
  });

  it('flags an effort=1 practice over a same-visibility effort=2-3 practice when time is the barrier', () => {
    const person = respondent({ barriers: ["I don't have much time"] });
    const items = [
      item('Sleep Environment', { text: 'quick', effort: 1, visibility: 2 }),
      item('Sleep Pressure', { text: 'slow', effort: 3, visibility: 2 }),
      item('Wind Down', { text: 'medium', effort: 2, visibility: 2 }),
    ];
    const flagged = flagStartWithThis(items, 'sleep', person);
    expect(flagged.find((entry) => entry.practice.effort === 1)?.startWithThis).toBe(true);
    expect(flagged.find((entry) => entry.practice.effort === 3)?.startWithThis).toBe(false);
  });

  it('bonuses the Circle-facing practice when the barrier is lack of accountability', () => {
    const person = respondent({
      barriers: ['I lose motivation without support or accountability'],
    });
    const socialCategory = SOCIAL_CATEGORIES.sleep[0];
    const items = [
      item(socialCategory, { text: 'circle practice', effort: 2, visibility: 2 }),
      item('Sleep Environment', { text: 'solo practice', effort: 2, visibility: 2 }),
    ];
    const flagged = flagStartWithThis(items, 'sleep', person);
    expect(flagged.find((entry) => entry.category === socialCategory)?.startWithThis).toBe(true);
  });

  it('never flags a Circle-facing practice when they prefer to do things on their own', () => {
    const person = respondent({
      barriers: ['I prefer to do things on my own'],
    });
    const socialCategory = SOCIAL_CATEGORIES.sleep[0];
    const items = [
      item(socialCategory, { text: 'would otherwise win', effort: 1, visibility: 3 }),
      item('Sleep Environment', { text: 'solo fallback', effort: 2, visibility: 2 }),
      item('Sleep Pressure', { text: 'solo other', effort: 2, visibility: 2 }),
    ];
    const flagged = flagStartWithThis(items, 'sleep', person);
    expect(flagged.find((entry) => entry.category === socialCategory)?.startWithThis).toBe(false);
    expect(flagged.some((entry) => entry.startWithThis)).toBe(true);
  });

  it('does not treat a mismatched solo-preference string as the hard gate', () => {
    const person = respondent({
      barriers: ['I prefer doing things alone'] as unknown as Barrier[],
    });
    const socialCategory = SOCIAL_CATEGORIES.sleep[0];
    const items = [
      item(socialCategory, { text: 'would win', effort: 1, visibility: 3 }),
      item('Sleep Environment', { text: 'solo fallback', effort: 3, visibility: 2 }),
    ];
    const flagged = flagStartWithThis(items, 'sleep', person);
    expect(flagged.find((entry) => entry.category === socialCategory)?.startWithThis).toBe(true);
  });

  it('flags 0, 1, or 2 practices depending on the plan, and never more than 2', () => {
    const none = flagStartWithThis(
      [
        item('Sleep Environment', { text: 'a', effort: 1, visibility: 1 }),
        item('Sleep Pressure', { text: 'b', effort: 1, visibility: 1 }),
        item('Wind Down', { text: 'c', effort: 1, visibility: 1 }),
      ],
      'sleep',
      respondent(),
    );
    const one = flagStartWithThis(
      [
        item('Sleep Environment', { text: 'visible', effort: 2, visibility: 2 }),
        item('Sleep Pressure', { text: 'hidden', effort: 1, visibility: 1 }),
        item('Wind Down', { text: 'also hidden', effort: 1, visibility: 1 }),
      ],
      'sleep',
      respondent(),
    );
    const two = flagStartWithThis(
      [
        item('Sleep Environment', { text: 'a', effort: 1, visibility: 2 }),
        item('Sleep Pressure', { text: 'b', effort: 1, visibility: 3 }),
        item('Wind Down', { text: 'c', effort: 2, visibility: 2 }),
      ],
      'sleep',
      respondent(),
    );
    expect(none.filter((entry) => entry.startWithThis)).toHaveLength(0);
    expect(one.filter((entry) => entry.startWithThis)).toHaveLength(1);
    expect(two.filter((entry) => entry.startWithThis)).toHaveLength(2);

    generateSampleRespondents().forEach((person) => {
      const plan = buildPlan(person, DEFAULT_SETTINGS);
      const flagged = plan.items.filter((entry) => entry.startWithThis).length;
      expect(flagged).toBeGreaterThanOrEqual(0);
      expect(flagged).toBeLessThanOrEqual(2);
      expect(plan.items).toHaveLength(5);
    });
  });
});

describe('E circle diversity', () => {
  it('puts all 6 age bands and all 3 genders in every group of an 18-person same-city same-pillar pool', () => {
    const genders = ['Woman', 'Man', 'Non-binary'] as const;
    const people = Array.from({ length: 18 }, (_, index) =>
      respondent({
        id: `p${index}`,
        preferredName: `Person ${String(index).padStart(2, '0')}`,
        ageBand: AGE_BAND_ORDER[index % 6],
        gender: genders[index % 3],
        personality: (['introvert', 'ambivert', 'extrovert'] as const)[index % 3],
        workStatus: ['Studying', 'Working full-time', 'Working part-time or freelance'][index % 3],
        homeLife: ['No children at home', 'Parent of young children', 'Caring for a family member'][index % 3],
        location: 'Lisbon, Portugal',
        focusArea: 'mind',
      }),
    );

    const groups = buildDiverseGroups(people, DEFAULT_SETTINGS);
    expect(groups).toHaveLength(3);
    groups.forEach((group) => {
      expect(group.members).toHaveLength(6);
      expect(new Set(group.members.map((member) => member.ageBand)).size).toBe(6);
      expect(new Set(group.members.map((member) => member.gender)).size).toBe(3);
      expect(group.needsMore).toBe(false);
      expect(group.mixed).toBe(false);
    });
  });

  it('reuses the same clustering pass for per-person Circle lookup', () => {
    const people = generateSampleRespondents();
    const plans = new Map(people.map((person) => [person.id, buildPlan(person, DEFAULT_SETTINGS)]));
    const circles = autoCluster(people, plans, DEFAULT_SETTINGS);
    const person = people[0];
    const match = circles.find((circle) => circle.members.some((member) => member.id === person.id));
    expect(match).toBeTruthy();
    expect(match?.members.some((member) => member.id === person.id)).toBe(true);
  });
});
