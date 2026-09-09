import type { Level, Pillar, PracticePatch, SlotSwap } from '../types';
import { isLevelValue, isScoreValue } from './practiceBank';

const OVERRIDES_KEY = 'gs_admin_overrides';

export type AdminOverrides = {
  swaps: Record<string, SlotSwap>;
  levelOverrides: Record<string, Level>;
  pillarOverrides: Record<string, Pillar>;
  circleOverrides: Record<string, string>;
  practiceEdits: Record<string, PracticePatch>;
};

export const EMPTY_OVERRIDES: AdminOverrides = {
  swaps: {},
  levelOverrides: {},
  pillarOverrides: {},
  circleOverrides: {},
  practiceEdits: {},
};

export function normalizeSwapRecord(value: unknown): Record<string, SlotSwap> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next: Record<string, SlotSwap> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (typeof item === 'string' && item) {
      next[key] = { category: '', text: item };
      return;
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const record = item as {
      category?: unknown;
      text?: unknown;
      displayCategory?: unknown;
      displayText?: unknown;
      displayEvidence?: unknown;
    };
    if (typeof record.text !== 'string' || !record.text) return;
    next[key] = {
      category: typeof record.category === 'string' ? record.category : '',
      text: record.text,
      ...(typeof record.displayCategory === 'string' && record.displayCategory
        ? { displayCategory: record.displayCategory }
        : {}),
      ...(typeof record.displayText === 'string' && record.displayText
        ? { displayText: record.displayText }
        : {}),
      ...(typeof record.displayEvidence === 'string'
        ? { displayEvidence: record.displayEvidence }
        : {}),
    };
  });
  return next;
}

export function loadAdminOverrides(): AdminOverrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(raw) as Partial<AdminOverrides>;
    return {
      swaps: normalizeSwapRecord(parsed.swaps),
      levelOverrides: isLevelRecord(parsed.levelOverrides) ? parsed.levelOverrides : {},
      pillarOverrides: isPillarRecord(parsed.pillarOverrides) ? parsed.pillarOverrides : {},
      circleOverrides: isStringRecord(parsed.circleOverrides) ? parsed.circleOverrides : {},
      practiceEdits: normalizePracticeEdits(parsed.practiceEdits),
    };
  } catch {
    return EMPTY_OVERRIDES;
  }
}

export function saveAdminOverrides(overrides: AdminOverrides) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore quota or private-mode failures; the session still keeps the in-memory values.
  }
}

export function keepKeyedByMember<T>(record: Record<string, T>, memberIds: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => memberIds.has(id)));
}

export function keepSwapsForMembers<T>(swaps: Record<string, T>, memberIds: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(swaps).filter(([key]) => memberIds.has(key.split(':')[0] ?? '')));
}

export function pruneAdminOverrides(overrides: AdminOverrides, memberIds: Set<string>): AdminOverrides {
  return {
    swaps: keepSwapsForMembers(overrides.swaps, memberIds),
    levelOverrides: keepKeyedByMember(overrides.levelOverrides, memberIds),
    pillarOverrides: keepKeyedByMember(overrides.pillarOverrides, memberIds),
    circleOverrides: keepKeyedByMember(overrides.circleOverrides, memberIds),
    practiceEdits: overrides.practiceEdits,
  };
}

export function normalizePracticeEdits(value: unknown): Record<string, PracticePatch> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next: Record<string, PracticePatch> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    const patch = normalizePracticePatch(item);
    if (patch) next[key] = patch;
  });
  return next;
}

function normalizePracticePatch(value: unknown): PracticePatch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const patch: PracticePatch = {};
  if (record.pillarId === 'sleep' || record.pillarId === 'eat' || record.pillarId === 'move' || record.pillarId === 'mind') {
    patch.pillarId = record.pillarId;
  }
  if (typeof record.category === 'string' && record.category.trim()) patch.category = record.category;
  if (isLevelValue(record.level)) patch.level = record.level;
  if (typeof record.text === 'string') patch.text = record.text;
  if (typeof record.why === 'string') patch.why = record.why;
  if (typeof record.evidence === 'string') patch.evidence = record.evidence;
  if (Array.isArray(record.references) && record.references.every((item) => typeof item === 'string')) {
    patch.references = record.references;
  }
  if (isScoreValue(record.effort)) patch.effort = record.effort;
  if (isScoreValue(record.visibility)) patch.visibility = record.visibility;
  if (typeof record.evidenceType === 'string') patch.evidenceType = record.evidenceType;
  if (typeof record.evidenceFit === 'string') patch.evidenceFit = record.evidenceFit;
  return Object.keys(patch).length ? patch : null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every((item) => typeof item === 'string');
}

function isLevelRecord(value: unknown): value is Record<string, Level> {
  return isStringRecord(value)
    && Object.values(value).every((item) => item === 'gentle' || item === 'moderate' || item === 'deep');
}

function isPillarRecord(value: unknown): value is Record<string, Pillar> {
  return isStringRecord(value)
    && Object.values(value).every((item) => item === 'sleep' || item === 'eat' || item === 'move' || item === 'mind');
}
