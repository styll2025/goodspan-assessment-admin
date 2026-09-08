import type { Level, Pillar } from '../types';

const OVERRIDES_KEY = 'gs_admin_overrides';

export type AdminOverrides = {
  swaps: Record<string, string>;
  levelOverrides: Record<string, Level>;
  pillarOverrides: Record<string, Pillar>;
  circleOverrides: Record<string, string>;
};

export const EMPTY_OVERRIDES: AdminOverrides = {
  swaps: {},
  levelOverrides: {},
  pillarOverrides: {},
  circleOverrides: {},
};

export function loadAdminOverrides(): AdminOverrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(raw) as Partial<AdminOverrides>;
    return {
      swaps: isStringRecord(parsed.swaps) ? parsed.swaps : {},
      levelOverrides: isLevelRecord(parsed.levelOverrides) ? parsed.levelOverrides : {},
      pillarOverrides: isPillarRecord(parsed.pillarOverrides) ? parsed.pillarOverrides : {},
      circleOverrides: isStringRecord(parsed.circleOverrides) ? parsed.circleOverrides : {},
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

export function keepSwapsForMembers(swaps: Record<string, string>, memberIds: Set<string>): Record<string, string> {
  return Object.fromEntries(Object.entries(swaps).filter(([key]) => memberIds.has(key.split(':')[0] ?? '')));
}

export function pruneAdminOverrides(overrides: AdminOverrides, memberIds: Set<string>): AdminOverrides {
  return {
    swaps: keepSwapsForMembers(overrides.swaps, memberIds),
    levelOverrides: keepKeyedByMember(overrides.levelOverrides, memberIds),
    pillarOverrides: keepKeyedByMember(overrides.pillarOverrides, memberIds),
    circleOverrides: keepKeyedByMember(overrides.circleOverrides, memberIds),
  };
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
