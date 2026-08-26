export type Pillar = 'sleep' | 'eat' | 'move' | 'mind';
export type Level = 'gentle' | 'moderate' | 'deep';
export type TimePerDay = 'under5' | '5to15' | '15to30' | '30plus';

export type HabitKey =
  | 'sleepConsistency'
  | 'sleepWindDown'
  | 'movementFrequency'
  | 'structuredExercise'
  | 'mealComposition'
  | 'eatingRhythm'
  | 'calmPractice'
  | 'socialConnection';

export type Challenge =
  | 'Trouble sleeping'
  | 'Low energy'
  | 'Stress/overwhelm'
  | 'Sedentary lifestyle'
  | 'Unhealthy eating habits'
  | 'Social isolation'
  | 'Lack of routine'
  | 'Screen overuse'
  | 'Difficulty unwinding'
  | 'Low motivation/accountability';

export type Respondent = {
  id: string;
  preferredName: string;
  email: string;
  submittedAt: string;
  motivations: string[];
  focusArea: Pillar | 'unsure';
  mainChallenges: Challenge[];
  ageBand: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  workStatus: string;
  homeLife: string;
  gender: string;
  genderSelfDescribe?: string;
  location: string;
  personality: 'introvert' | 'ambivert' | 'extrovert';
  habitAnswers?: Partial<Record<HabitKey, string>>;
  sleepConsistency: number;
  sleepWindDown: number;
  movementFrequency: number;
  structuredExercise: number;
  mealComposition: number;
  eatingRhythm: number;
  calmPractice: number;
  socialConnection: number;
  timePerDay: TimePerDay;
};

export type Practice = {
  level: Level;
  text: string;
  why: string;
  evidence: string;
  references: string[];
};

export type PracticesData = Record<Pillar, Record<string, Practice[]>>;

export type PlanItemReason =
  | 'social'
  | `habit:${HabitKey}`
  | 'challenge'
  | 'balance'
  | 'fill';

export type PlanItem = {
  category: string;
  practice: Practice;
  score: number;
  reason: PlanItemReason;
  alternatives: Practice[];
};

export type Plan = {
  respondentId: string;
  pillarId: Pillar;
  levelId: Level;
  overridden: boolean;
  scores: Record<Pillar, number>;
  items: PlanItem[];
};

export type Circle = {
  pillarId: Pillar;
  city: string;
  members: Respondent[];
  needsMore: boolean;
  mixed: boolean;
};

export type MatchingSettings = {
  statedGoalWeight: number;
  targetCircleSize: number;
  minCircleSize: number;
  maxCircleSize: number;
};
