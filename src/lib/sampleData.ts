import type { Challenge, Pillar, Respondent, TimePerDay } from '../types';

const NAMES = [
  'Alex',
  'Jordan',
  'Sam',
  'Riley',
  'Casey',
  'Morgan',
  'Taylor',
  'Jamie',
  'Rowan',
  'Quinn',
  'Avery',
  'Elliot',
  'Noor',
  'Mateus',
  'Sofia',
  'Diego',
  'Leila',
  'Priya',
  'Hana',
  'Kofi',
  'Ines',
  'Tomas',
  'Bea',
  'Rui',
  'Marta',
  'Nuno',
  'Ana',
  'Pedro',
  'Clara',
  'Luis',
];

const CHALLENGES_BY_PILLAR: Record<Pillar, Challenge[]> = {
  sleep: ['Trouble sleeping', 'Difficulty unwinding'],
  move: ['Sedentary lifestyle', 'Low energy'],
  eat: ['Unhealthy eating habits'],
  mind: ['Stress/overwhelm', 'Social isolation', 'Screen overuse', 'Low motivation/accountability'],
};

const TIME_OPTIONS: TimePerDay[] = ['under5', '5to15', '15to30', '30plus'];

export function generateSampleRespondents(): Respondent[] {
  const cohorts: Array<{ city: string; pillar: Pillar; count: number }> = [
    { city: 'Lisbon, Portugal', pillar: 'mind', count: 6 },
    { city: 'Lisbon, Portugal', pillar: 'sleep', count: 6 },
    { city: 'Porto, Portugal', pillar: 'move', count: 5 },
    { city: 'Porto, Portugal', pillar: 'eat', count: 5 },
    { city: 'London, United Kingdom', pillar: 'sleep', count: 3 },
    { city: 'London, United Kingdom', pillar: 'mind', count: 3 },
    { city: 'Berlin, Germany', pillar: 'eat', count: 2 },
  ];

  const respondents: Respondent[] = [];
  cohorts.forEach((cohort) => {
    for (let i = 0; i < cohort.count; i += 1) {
      const index = respondents.length;
      const challenges = CHALLENGES_BY_PILLAR[cohort.pillar];
      respondents.push({
        id: `sample-${index}`,
        preferredName: `${NAMES[index % NAMES.length]} ${String.fromCharCode(65 + (index % 26))}.`,
        email: `sample${index}@example.com`,
        submittedAt: new Date(Date.UTC(2026, 7, 25 - (index % 20))).toISOString(),
        motivations: ['Build healthier habits', index % 2 ? 'Stay accountable' : 'Feel more energetic'],
        focusArea: cohort.pillar,
        mainChallenges: [challenges[i % challenges.length]],
        ageBand: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'][index % 6] as Respondent['ageBand'],
        workStatus: ['Studying', 'Working full-time', 'Working part-time or freelance', 'Between jobs', 'Retired or semi-retired'][index % 5],
        homeLife: ['No children at home', 'Parent of young children', 'Parent of teens or adult children', 'Caring for a family member'][index % 4],
        gender: ['Woman', 'Man', 'Non-binary', 'Prefer not to say'][index % 4],
        location: cohort.city,
        personality: ['introvert', 'ambivert', 'extrovert'][index % 3] as Respondent['personality'],
        lifeStage: ['Early career', 'Raising a family', 'Midlife', 'Later life'][index % 4],
        ...habitsFor(cohort.pillar),
        timePerDay: TIME_OPTIONS[index % TIME_OPTIONS.length],
      });
    }
  });

  return respondents;
}

function habitsFor(pillar: Pillar): Pick<
  Respondent,
  | 'sleepConsistency'
  | 'sleepWindDown'
  | 'movementFrequency'
  | 'structuredExercise'
  | 'mealComposition'
  | 'eatingRhythm'
  | 'calmPractice'
  | 'socialConnection'
> {
  return {
    sleepConsistency: pillar === 'sleep' ? 0 : 3,
    sleepWindDown: pillar === 'sleep' ? 0 : 2,
    movementFrequency: pillar === 'move' ? 0 : 3,
    structuredExercise: pillar === 'move' ? 0 : 2,
    mealComposition: pillar === 'eat' ? 0 : 3,
    eatingRhythm: pillar === 'eat' ? 0 : 2,
    calmPractice: pillar === 'mind' ? 0 : 2,
    socialConnection: pillar === 'mind' ? 0 : 2,
  };
}
