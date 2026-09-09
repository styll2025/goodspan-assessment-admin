import type { Level, Pillar, Practice, PracticePatch, PracticesData } from '../types';
import { PILLARS, PRACTICES } from './matching';

export function practiceIdentity(pillarId: Pillar, category: string, practice: Pick<Practice, 'level' | 'text'>): string {
  return JSON.stringify([pillarId, category, practice.level, practice.text]);
}

export function clonePractices(data: PracticesData = PRACTICES): PracticesData {
  return {
    sleep: clonePillar(data.sleep),
    eat: clonePillar(data.eat),
    move: clonePillar(data.move),
    mind: clonePillar(data.mind),
  };
}

export function applyPracticeEdits(
  edits: Record<string, PracticePatch>,
  data: PracticesData = PRACTICES,
): PracticesData {
  if (!Object.keys(edits).length) return data;
  const next: PracticesData = { sleep: {}, eat: {}, move: {}, mind: {} };
  PILLARS.forEach((pillarId) => {
    Object.keys(data[pillarId]).forEach((category) => {
      next[pillarId][category] = [];
    });
  });
  PILLARS.forEach((pillarId) => {
    Object.entries(data[pillarId]).forEach(([category, practices]) => {
      practices.forEach((practice) => {
        const patch = edits[practiceIdentity(pillarId, category, practice)];
        const located = applyPracticePatch(pillarId, category, practice, patch);
        const family = next[located.pillarId][located.category] ?? [];
        family.push(located.practice);
        next[located.pillarId][located.category] = family;
      });
    });
  });
  PILLARS.forEach((pillarId) => {
    Object.keys(next[pillarId]).forEach((category) => {
      if (!next[pillarId][category].length) delete next[pillarId][category];
    });
  });
  return next;
}

export function practicePatchFrom(
  original: { pillarId: Pillar; category: string; practice: Practice },
  next: { pillarId: Pillar; category: string; practice: Practice },
): PracticePatch | null {
  const patch: PracticePatch = {};
  if (next.pillarId !== original.pillarId) patch.pillarId = next.pillarId;
  if (next.category !== original.category) patch.category = next.category;
  if (next.practice.level !== original.practice.level) patch.level = next.practice.level;
  if (next.practice.text !== original.practice.text) patch.text = next.practice.text;
  if (next.practice.why !== original.practice.why) patch.why = next.practice.why;
  if (next.practice.evidence !== original.practice.evidence) patch.evidence = next.practice.evidence;
  if (!sameStringList(next.practice.references, original.practice.references)) {
    patch.references = [...next.practice.references];
  }
  if (next.practice.effort !== original.practice.effort) patch.effort = next.practice.effort;
  if (next.practice.visibility !== original.practice.visibility) patch.visibility = next.practice.visibility;
  if (next.practice.evidenceType !== original.practice.evidenceType) patch.evidenceType = next.practice.evidenceType;
  if (next.practice.evidenceFit !== original.practice.evidenceFit) patch.evidenceFit = next.practice.evidenceFit;
  return Object.keys(patch).length ? patch : null;
}

export function applyPracticePatch(
  pillarId: Pillar,
  category: string,
  practice: Practice,
  patch?: PracticePatch,
): { pillarId: Pillar; category: string; practice: Practice } {
  if (!patch) {
    return {
      pillarId,
      category,
      practice: { ...practice, references: [...practice.references] },
    };
  }
  return {
    pillarId: patch.pillarId ?? pillarId,
    category: patch.category?.trim() || category,
    practice: {
      ...practice,
      level: patch.level ?? practice.level,
      text: patch.text ?? practice.text,
      why: patch.why ?? practice.why,
      evidence: patch.evidence ?? practice.evidence,
      references: patch.references ? [...patch.references] : [...practice.references],
      effort: patch.effort ?? practice.effort,
      visibility: patch.visibility ?? practice.visibility,
      evidenceType: patch.evidenceType ?? practice.evidenceType,
      evidenceFit: patch.evidenceFit ?? practice.evidenceFit,
    },
  };
}

export function practiceSourceText(practice: Practice): string {
  return practice.references.join('\n') || practice.evidence;
}

export function splitReferenceLines(value: string): string[] {
  return value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function clonePillar(categories: Record<string, Practice[]>): Record<string, Practice[]> {
  return Object.fromEntries(
    Object.entries(categories).map(([category, practices]) => [
      category,
      practices.map((practice) => ({ ...practice, references: [...practice.references] })),
    ]),
  );
}

function sameStringList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function isLevelValue(value: unknown): value is Level {
  return value === 'gentle' || value === 'moderate' || value === 'deep';
}

export function isScoreValue(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}
