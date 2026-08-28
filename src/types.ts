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

export type Barrier =
  | "I don't have much time"
  | 'I struggle to stay consistent'
  | "I don't know where to start"
  | 'I lose motivation without support or accountability'
  | 'My schedule changes a lot'
  | 'I prefer to do things on my own'
  | "Nothing major — I'm ready to start";

export type Respondent = {
  id: string;
  preferredName: string;
  email: string;
  submittedAt: string;
  motivations: string[];
  focusArea: Pillar | 'unsure';
  mainChallenges: Challenge[];
  barriers: Barrier[];
  ageBand: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  workStatus: string;
  homeLife: string;
  gender: string;
  genderSelfDescribe?: string;
  location: string;
  personality: 'introvert' | 'ambivert' | 'extrovert';
  lifeStage?: string;
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
  effort: 1 | 2 | 3;
  visibility: 1 | 2 | 3;
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
  startWithThis: boolean;
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

export type StartWithThisSettings = {
  flagsPerPlan: number;
  effortWeight: number;
  visibilityWeight: number;
  habitProximityBonus: number;
  barrierMatchBonus: number;
  minVisibility: 1 | 2;
};

export type MatchingSettings = {
  statedGoalWeight: number;
  challengeBoost: number;
  keywordWeight: number;
  habitPriority: number;
  circleGuarantee: boolean;
  startWithThis: StartWithThisSettings;
  targetCircleSize: number;
  minCircleSize: number;
  maxCircleSize: number;
  timeToLevel: Record<TimePerDay, Level>;
  traitWeights: {
    ageBand: number;
    gender: number;
    personality: number;
    lifeStage: number;
    work: number;
    home: number;
  };
  habitCategoryMap: Record<Pillar, Partial<Record<HabitKey, string[]>>>;
  challengeKeywords: Record<Challenge, string[]>;
  challengePillars: Record<Challenge, Pillar | 'none'>;
};
