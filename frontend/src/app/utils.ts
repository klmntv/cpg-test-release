import { STORAGE_KEY } from './constants';
import type { ModuleKey, PersistedState } from './types';

export function detectModule(pkg: string): ModuleKey {
  if (pkg.startsWith('client_golang/')) return 'client_golang';
  if (pkg.startsWith('adapter/')) return 'adapter';
  if (pkg.startsWith('alertmanager/')) return 'alertmanager';
  if (pkg.startsWith('prometheus/')) return 'prometheus';
  return 'other';
}

export function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedState;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function parseKVInput(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const chunk of raw.split(/[\n,]/g)) {
    const row = chunk.trim();
    if (!row) continue;
    const idx = row.indexOf('=');
    if (idx <= 0) continue;
    const key = row.slice(0, idx).trim();
    const value = row.slice(idx + 1).trim();
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function uniquePositiveLines(lines: Array<number | null | undefined>): number[] {
  return Array.from(new Set(lines.filter((line): line is number => typeof line === 'number' && line > 0)));
}
