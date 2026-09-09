import { describe, expect, it } from 'vitest';
import type { PlanItem, Practice, Respondent } from '../types';
import {
  AGE_BAND_ORDER,
  DEFAULT_SETTINGS,
  PRACTICES,
  practicesForLevel,
  SOCIAL_CATEGORIES,
  applyCircleOverrides,
  autoCluster,
  moveCircleMemberIn,
  snapshotCircleOverrides,
  buildDiverseGroups,
  buildPlan,
  cloneSettings,
  computeRecommendation,
  CIRCLE_LOCATION_KEY,
  flagStartWithThis,
  isShareWithGroupCategory,
  newCircleId,
  practicesForDisplay,
} from './matching';
import { clusterCity } from './cities';
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

function settingsWithStart(overrides: Partial<(typeof DEFAULT_SETTINGS)['startWithThis']>) {
  const settings = cloneSettings();
  settings.startWithThis = { ...settings.startWithThis, ...overrides };
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
    evidenceType: '',
    evidenceFit: '',
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
    expect(flagged.filter((entry) => entry.startWithThis)).toHaveLength(2);
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

  it('never flags Share or group practices as a recommended starting point', () => {
    const socialCategory = SOCIAL_CATEGORIES.sleep[0];
    const highScoringShare = [
      item(socialCategory, { text: 'would otherwise win', effort: 1, visibility: 3 }),
      item('Sleep Environment', { text: 'solo fallback', effort: 2, visibility: 2 }),
      item('Sleep Pressure', { text: 'solo other', effort: 2, visibility: 2 }),
    ];

    const byDefault = flagStartWithThis(highScoringShare, 'sleep', respondent());
    const withAccountability = flagStartWithThis(
      highScoringShare,
      'sleep',
      respondent({ barriers: ['I lose motivation without support or accountability'] }),
    );
    const preferAlone = flagStartWithThis(
      highScoringShare,
      'sleep',
      respondent({ barriers: ['I prefer to do things on my own'] }),
    );

    for (const flagged of [byDefault, withAccountability, preferAlone]) {
      expect(flagged.find((entry) => entry.category === socialCategory)?.startWithThis).toBe(false);
      expect(flagged.filter((entry) => entry.startWithThis)).toHaveLength(2);
    }
  });

  it('always flags two recommended starting points, filling from lower visibility only if needed', () => {
    const nonePreferred = flagStartWithThis(
      [
        item('Sleep Environment', { text: 'a', effort: 1, visibility: 1 }),
        item('Sleep Pressure', { text: 'b', effort: 1, visibility: 1 }),
        item('Wind Down', { text: 'c', effort: 1, visibility: 1 }),
      ],
      'sleep',
      respondent(),
    );
    const onePreferred = flagStartWithThis(
      [
        item('Sleep Environment', { text: 'visible', effort: 2, visibility: 2 }),
        item('Sleep Pressure', { text: 'hidden', effort: 1, visibility: 1 }),
        item('Wind Down', { text: 'also hidden', effort: 1, visibility: 1 }),
      ],
      'sleep',
      respondent(),
    );
    const twoPreferred = flagStartWithThis(
      [
        item('Sleep Environment', { text: 'a', effort: 1, visibility: 2 }),
        item('Sleep Pressure', { text: 'b', effort: 1, visibility: 3 }),
        item('Wind Down', { text: 'c', effort: 2, visibility: 2 }),
      ],
      'sleep',
      respondent(),
    );
    expect(nonePreferred.filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(onePreferred.filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(onePreferred.find((entry) => entry.practice.visibility === 2)?.startWithThis).toBe(true);
    expect(twoPreferred.filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(twoPreferred.filter((entry) => entry.startWithThis).every((entry) => entry.practice.visibility >= 2)).toBe(true);

    generateSampleRespondents().forEach((person) => {
      const plan = buildPlan(person, DEFAULT_SETTINGS);
      const flagged = plan.items.filter((entry) => entry.startWithThis);
      expect(flagged).toHaveLength(2);
      expect(plan.items).toHaveLength(5);
      plan.items.forEach((entry) => {
        expect([1, 2, 3]).toContain(entry.practice.effort);
        expect([1, 2, 3]).toContain(entry.practice.visibility);
      });
      flagged.forEach((entry) => {
        expect(isShareWithGroupCategory(entry.category)).toBe(false);
      });
    });
  });

  it('imports effort and visibility from the practice library, not placeholders', () => {
    const library = Object.values(PRACTICES).flatMap((categories) => Object.values(categories).flat());
    expect(library).toHaveLength(203);
    library.forEach((practice) => {
      expect([1, 2, 3]).toContain(practice.effort);
      expect([1, 2, 3]).toContain(practice.visibility);
      expect(practice.evidence.trim().length).toBeGreaterThan(0);
      expect(practice.evidenceType.trim().length).toBeGreaterThan(0);
      expect(practice.evidenceFit.trim().length).toBeGreaterThan(0);
    });
  });

  it('never flags the imported step-tracking practice even when nothing else in the plan scores well', () => {
    const tracker = PRACTICES.move['Movement Snacking & Self-Monitoring'].find((practice) =>
      practice.text.startsWith('Use a step tracker'),
    );
    expect(tracker).toMatchObject({ effort: 1, visibility: 1 });

    const person = respondent({
      barriers: ["I don't have much time", 'I struggle to stay consistent'],
    });
    const flagged = flagStartWithThis(
      [
        { category: 'Movement Snacking & Self-Monitoring', practice: tracker!, score: 0, reason: 'balance', alternatives: [], startWithThis: false },
        item('Incidental Movement & Sedentary Behavior', { text: 'also low vis', effort: 1, visibility: 1 }),
        item('Structured Cardio', { text: 'also low vis 2', effort: 1, visibility: 1 }),
        item('Strength & Resistance', { text: 'high effort visible', effort: 3, visibility: 2 }),
        item('Mobility, Flexibility & Balance', { text: 'also visible', effort: 2, visibility: 2 }),
        item('Social & Accountability', { text: 'circle', effort: 2, visibility: 2 }),
      ],
      'move',
      person,
    );

    const trackerItem = flagged.find((entry) => entry.practice.text.startsWith('Use a step tracker'));
    expect(trackerItem?.startWithThis).toBe(false);
    expect(flagged.filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(flagged.filter((entry) => entry.startWithThis).every((entry) => entry.practice.visibility >= 2)).toBe(true);
    expect(flagged.filter((entry) => entry.startWithThis).every((entry) => !isShareWithGroupCategory(entry.category))).toBe(true);
  });

  it('always flags two recommended starting points, even if flagsPerPlan is set lower', () => {
    const items = [
      item('Sleep Environment', { text: 'a', effort: 1, visibility: 2 }),
      item('Sleep Pressure', { text: 'b', effort: 1, visibility: 3 }),
      item('Wind Down', { text: 'c', effort: 2, visibility: 2 }),
    ];
    const person = respondent();
    expect(flagStartWithThis(items, 'sleep', person, settingsWithStart({ flagsPerPlan: 0 })).filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(flagStartWithThis(items, 'sleep', person, settingsWithStart({ flagsPerPlan: 1 })).filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(flagStartWithThis(items, 'sleep', person, settingsWithStart({ flagsPerPlan: 3 })).filter((entry) => entry.startWithThis)).toHaveLength(2);
  });

  it('prefers practices at the minimum visibility, then fills to two if needed', () => {
    const person = respondent({ barriers: ["I don't have much time"] });
    const items = [
      item('Sleep Environment', { text: 'track steps baseline', effort: 1, visibility: 1 }),
      item('Sleep Pressure', { text: 'higher effort visible', effort: 3, visibility: 2 }),
    ];
    const blocked = flagStartWithThis(items, 'sleep', person, settingsWithStart({ minVisibility: 2 }));
    const allowed = flagStartWithThis(items, 'sleep', person, settingsWithStart({ minVisibility: 1 }));
    expect(blocked.filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(blocked.find((entry) => entry.practice.visibility === 2)?.startWithThis).toBe(true);
    expect(blocked.find((entry) => entry.practice.visibility === 1)?.startWithThis).toBe(true);
    expect(allowed.find((entry) => entry.practice.visibility === 1)?.startWithThis).toBe(true);
    expect(allowed.filter((entry) => entry.startWithThis)).toHaveLength(2);
  });

  it('uses effort and visibility weights from settings in the score formula', () => {
    const person = respondent();
    const items = [
      item('Sleep Environment', { text: 'easy quieter benefit', effort: 1, visibility: 2 }),
      item('Sleep Pressure', { text: 'harder felt benefit', effort: 3, visibility: 3 }),
      item('Wind Down', { text: 'middle', effort: 2, visibility: 2 }),
    ];
    const effortLed = flagStartWithThis(
      items,
      'sleep',
      person,
      settingsWithStart({ effortWeight: 4, visibilityWeight: 0, habitProximityBonus: 0, barrierMatchBonus: 0 }),
    );
    const visibilityLed = flagStartWithThis(
      items,
      'sleep',
      person,
      settingsWithStart({ effortWeight: 0, visibilityWeight: 4, habitProximityBonus: 0, barrierMatchBonus: 0 }),
    );
    expect(effortLed.filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(effortLed.find((entry) => entry.practice.effort === 1)?.startWithThis).toBe(true);
    expect(effortLed.find((entry) => entry.practice.effort === 3)?.startWithThis).toBe(false);
    expect(visibilityLed.filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(visibilityLed.find((entry) => entry.practice.visibility === 3)?.startWithThis).toBe(true);
  });

  it('passes start-with-this settings through buildPlan and still flags two practices', () => {
    const person = respondent({ barriers: ["I don't have much time"] });
    const plan = buildPlan(person, settingsWithStart({ flagsPerPlan: 0 }));
    expect(plan.items.filter((entry) => entry.startWithThis)).toHaveLength(2);
    expect(plan.items).toHaveLength(5);
  });

  it('lists recommended starting points first, then keeps Share from the third slot onwards', () => {
    const items = [
      item('Wind Down'),
      { ...item('Circadian Alignment'), startWithThis: true },
      item('Caffeine Timing'),
      item('Share'),
    ];
    const ordered = practicesForDisplay(items);
    expect(ordered.map((entry) => entry.item.category)).toEqual([
      'Circadian Alignment',
      'Wind Down',
      'Share',
      'Caffeine Timing',
    ]);
    expect(ordered.map((entry) => entry.slotIndex)).toEqual([1, 0, 3, 2]);
    expect(ordered[0].item.startWithThis).toBe(true);
    expect(ordered.slice(0, 2).every((entry) => !isShareWithGroupCategory(entry.item.category))).toBe(true);
  });

  it('never shows Share or group practices as the first or second option on a five-practice plan', () => {
    const people = [
      respondent({ focusArea: 'sleep' }),
      respondent({ focusArea: 'eat' }),
      respondent({ focusArea: 'move' }),
      respondent({ focusArea: 'mind' }),
      respondent({
        focusArea: 'sleep',
        barriers: ['I lose motivation without support or accountability'],
      }),
      ...generateSampleRespondents(),
    ];

    for (const person of people) {
      const plan = buildPlan(person);
      const displayed = practicesForDisplay(plan.items);
      const flagged = displayed.filter((entry) => entry.item.startWithThis);
      const nonShareCount = displayed.filter((entry) => !isShareWithGroupCategory(entry.item.category)).length;
      const guarded = displayed.slice(0, Math.min(2, nonShareCount));
      expect(flagged.every((entry) => !isShareWithGroupCategory(entry.item.category))).toBe(true);
      expect(flagged).toHaveLength(Math.min(2, nonShareCount));
      expect(displayed.slice(0, flagged.length).every((entry) => entry.item.startWithThis)).toBe(true);
      expect(guarded.every((entry) => !isShareWithGroupCategory(entry.item.category))).toBe(true);
    }
  });

  it('rebuilds practices from an admin pillar override without changing scores', () => {
    const person = respondent({ focusArea: 'mind' });
    const matched = buildPlan(person);
    const overridden = buildPlan(person, DEFAULT_SETTINGS, { pillarId: 'sleep' });
    expect(overridden.pillarId).toBe('sleep');
    expect(overridden.items).toHaveLength(5);
    expect(overridden.scores).toEqual(matched.scores);
    expect(Object.keys(PRACTICES.sleep)).toEqual(expect.arrayContaining(overridden.items.map((item) => item.category)));
  });

  it('swaps a practice within the same category using a legacy text value', () => {
    const person = respondent({ focusArea: 'sleep' });
    const base = buildPlan(person, DEFAULT_SETTINGS, { pillarId: 'sleep' });
    const slotIndex = base.items.findIndex((entry) => entry.alternatives.length > 0);
    expect(slotIndex).toBeGreaterThanOrEqual(0);
    const original = base.items[slotIndex];
    const alternative = original.alternatives[0];
    const swapped = buildPlan(person, DEFAULT_SETTINGS, {
      pillarId: 'sleep',
      swaps: { [slotIndex]: alternative.text },
    });
    expect(swapped.items[slotIndex].category).toBe(original.category);
    expect(swapped.items[slotIndex].practice.text).toBe(alternative.text);
  });

  it('replaces a slot with an unused category', () => {
    const person = respondent({ focusArea: 'sleep' });
    const base = buildPlan(person, DEFAULT_SETTINGS, { pillarId: 'sleep' });
    const unused = Object.keys(PRACTICES.sleep).find((category) => !base.items.some((entry) => entry.category === category));
    expect(unused).toBeTruthy();
    const practice = practicesForLevel(PRACTICES.sleep[unused!], base.levelId)[0];
    expect(practice).toBeTruthy();
    const swapped = buildPlan(person, DEFAULT_SETTINGS, {
      pillarId: 'sleep',
      swaps: { 0: { category: unused!, text: practice.text } },
    });
    expect(swapped.items[0].category).toBe(unused);
    expect(swapped.items[0].practice.text).toBe(practice.text);
    expect(new Set(swapped.items.map((entry) => entry.category)).size).toBe(swapped.items.length);
  });

  it('exchanges two slots when the chosen category is already on the plan', () => {
    const person = respondent({ focusArea: 'sleep' });
    const base = buildPlan(person, DEFAULT_SETTINGS, { pillarId: 'sleep' });
    const first = base.items[0];
    const second = base.items[1];
    const swapped = buildPlan(person, DEFAULT_SETTINGS, {
      pillarId: 'sleep',
      swaps: {
        0: { category: second.category, text: second.practice.text },
        1: { category: first.category, text: first.practice.text },
      },
    });
    expect(swapped.items[0].category).toBe(second.category);
    expect(swapped.items[1].category).toBe(first.category);
    expect(new Set(swapped.items.map((entry) => entry.category)).size).toBe(swapped.items.length);
  });

  it('rewrites category, practice wording and evidence for one member only', () => {
    const person = respondent({ focusArea: 'sleep' });
    const base = buildPlan(person, DEFAULT_SETTINGS, { pillarId: 'sleep' });
    const original = base.items[0];
    const edited = buildPlan(person, DEFAULT_SETTINGS, {
      pillarId: 'sleep',
      swaps: {
        0: {
          category: original.category,
          text: original.practice.text,
          displayCategory: 'Evening rhythm',
          displayText: 'Put the phone in another room an hour before bed.',
          displayEvidence: 'This wording is for this member only.',
        },
      },
    });
    expect(edited.items[0].category).toBe('Evening rhythm');
    expect(edited.items[0].practice.text).toBe('Put the phone in another room an hour before bed.');
    expect(edited.items[0].practice.evidence).toBe('This wording is for this member only.');
    expect(edited.items[0].practice.references).toEqual([]);
    expect(edited.items[1].category).toBe(base.items[1].category);
    expect(edited.items[1].practice.text).toBe(base.items[1].practice.text);
  });

  it('keeps one Screentime practice on GoodSleep and offers it at every intensity', () => {
    const screentime = PRACTICES.sleep.Screentime;
    expect(screentime).toHaveLength(1);
    expect(screentime[0]).toMatchObject({
      effort: 2,
      visibility: 2,
      evidenceType: 'Experimental + observational',
      evidenceFit: 'Direct',
    });
    expect((['gentle', 'moderate', 'deep'] as const).map((level) => practicesForLevel(screentime, level)[0]?.text)).toEqual([
      screentime[0].text,
      screentime[0].text,
      screentime[0].text,
    ]);
    expect(PRACTICES.mind.Screentime).toBeUndefined();
    expect(DEFAULT_SETTINGS.habitCategoryMap.sleep.sleepWindDown).toContain('Screentime');
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
    expect(groups).toHaveLength(2);
    groups.forEach((group) => {
      expect(group.members).toHaveLength(9);
      expect(new Set(group.members.map((member) => member.ageBand)).size).toBe(6);
      expect(new Set(group.members.map((member) => member.gender)).size).toBe(3);
      expect(group.needsMore).toBe(false);
      expect(group.mixed).toBe(false);
    });
  });

  it('keeps a small same-Span city group in one Circle instead of splitting on traits', () => {
    const people = Array.from({ length: 8 }, (_, index) =>
      respondent({
        id: `small-${index}`,
        preferredName: `Small ${index}`,
        location: 'Lisbon, Portugal',
        focusArea: 'mind',
        personality: (['introvert', 'ambivert', 'extrovert'] as const)[index % 3],
      }),
    );
    const groups = buildDiverseGroups(people, DEFAULT_SETTINGS);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(8);
    expect(groups[0].mixed).toBe(false);
  });

  it('only splits a city-and-Span pool once it is larger than nine', () => {
    const people = Array.from({ length: 10 }, (_, index) =>
      respondent({
        id: `over-${index}`,
        preferredName: `Over ${index}`,
        location: 'Lisbon, Portugal',
        focusArea: 'mind',
      }),
    );
    const groups = buildDiverseGroups(people, DEFAULT_SETTINGS);
    expect(groups).toHaveLength(2);
    expect(groups.reduce((total, group) => total + group.members.length, 0)).toBe(10);
  });

  it('groups the same Span together regardless of city', () => {
    const people = [
      respondent({ id: 'lis', preferredName: 'Lisbon person', location: 'Lisbon, Portugal', focusArea: 'mind' }),
      respondent({ id: 'cas', preferredName: 'Cascais person', location: 'Cascais, Portugal', focusArea: 'mind' }),
      respondent({ id: 'cap', preferredName: 'Caparica person', location: 'Costa da Caparica, Portugal', focusArea: 'mind' }),
      respondent({ id: 'por', preferredName: 'Porto person', location: 'Porto, Portugal', focusArea: 'mind' }),
      respondent({ id: 'eat', preferredName: 'Eat person', location: 'Lisbon, Portugal', focusArea: 'eat' }),
    ];
    const plans = new Map(people.map((person) => [person.id, buildPlan(person, DEFAULT_SETTINGS, { pillarId: person.focusArea as 'mind' | 'eat' })]));
    const circles = autoCluster(people, plans, DEFAULT_SETTINGS);
    const mind = circles.find((circle) => circle.pillarId === 'mind');
    const eat = circles.find((circle) => circle.pillarId === 'eat');
    expect(mind?.members.map((member) => member.id).sort()).toEqual(['cap', 'cas', 'lis', 'por']);
    expect(eat?.members.map((member) => member.id)).toEqual(['eat']);
  });

  it('applies an admin move into a new Circle without losing the member', () => {
    const people = [
      respondent({ id: 'a', preferredName: 'A', location: 'Lisbon, Portugal', focusArea: 'mind' }),
      respondent({ id: 'b', preferredName: 'B', location: 'Lisbon, Portugal', focusArea: 'mind' }),
    ];
    const plans = new Map(people.map((person) => [person.id, buildPlan(person, DEFAULT_SETTINGS, { pillarId: 'mind' })]));
    const auto = autoCluster(people, plans, DEFAULT_SETTINGS);
    expect(auto).toHaveLength(1);
    const target = newCircleId('mind', CIRCLE_LOCATION_KEY, 'group');
    const moved = applyCircleOverrides(auto, { a: target }, DEFAULT_SETTINGS);
    expect(moved).toHaveLength(2);
    expect(moved.find((circle) => circle.id === target)?.members.map((member) => member.id)).toEqual(['a']);
    expect(moved.find((circle) => circle.id === auto[0].id)?.members.map((member) => member.id)).toEqual(['b']);
  });

  it('keeps a manual move when the original auto Circle no longer exists', () => {
    const people = Array.from({ length: 10 }, (_, index) =>
      respondent({
        id: `over-${index}`,
        preferredName: `Over ${index}`,
        location: 'Lisbon, Portugal',
        focusArea: 'mind',
      }),
    );
    const plans = new Map(people.map((person) => [person.id, buildPlan(person, DEFAULT_SETTINGS, { pillarId: 'mind' })]));
    const auto = autoCluster(people, plans, DEFAULT_SETTINGS);
    expect(auto.length).toBeGreaterThan(1);
    const targetId = auto[1].id;
    const laterPeople = people.slice(0, 2);
    const laterPlans = new Map(laterPeople.map((person) => [person.id, plans.get(person.id)!]));
    const laterAuto = autoCluster(laterPeople, laterPlans, DEFAULT_SETTINGS);
    expect(laterAuto).toHaveLength(1);
    expect(laterAuto[0].id).not.toBe(targetId);
    const kept = applyCircleOverrides(laterAuto, { 'over-0': targetId }, DEFAULT_SETTINGS);
    expect(kept.find((circle) => circle.id === targetId)?.members.map((member) => member.id)).toEqual(['over-0']);
    expect(kept.find((circle) => circle.id === laterAuto[0].id)?.members.map((member) => member.id)).toEqual(['over-1']);
  });

  it('stores every member in the layout after a move so the grouping survives a refresh', () => {
    const people = [
      respondent({ id: 'a', preferredName: 'A', location: 'Lisbon, Portugal', focusArea: 'mind' }),
      respondent({ id: 'b', preferredName: 'B', location: 'Lisbon, Portugal', focusArea: 'mind' }),
    ];
    const plans = new Map(people.map((person) => [person.id, buildPlan(person, DEFAULT_SETTINGS, { pillarId: 'mind' })]));
    const auto = autoCluster(people, plans, DEFAULT_SETTINGS);
    const target = newCircleId('mind', CIRCLE_LOCATION_KEY, 'split');
    const snapshot = snapshotCircleOverrides(moveCircleMemberIn(auto, 'a', target));
    expect(snapshot).toEqual({ a: target, b: auto[0].id });
    const kept = applyCircleOverrides(auto, snapshot, DEFAULT_SETTINGS);
    expect(kept.find((circle) => circle.id === target)?.members.map((member) => member.id)).toEqual(['a']);
    expect(kept.find((circle) => circle.id === auto[0].id)?.members.map((member) => member.id)).toEqual(['b']);
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

describe('clusterCity', () => {
  it('maps Cascais and Caparica into the Lisbon 50 km cluster', () => {
    expect(clusterCity('Lisbon, Portugal')).toBe(clusterCity('Cascais, Portugal'));
    expect(clusterCity('Costa da Caparica, Portugal')).toBe(clusterCity('Lisbon, Portugal'));
    expect(clusterCity('Caparica')).toBe(clusterCity('Lisbon'));
    expect(clusterCity('Porto, Portugal')).not.toBe(clusterCity('Lisbon, Portugal'));
  });
});
