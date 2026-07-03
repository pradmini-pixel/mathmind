import { DEFAULT_PROGRESS, DEFAULT_SETTINGS, type Progress, type Settings } from './types';

/**
 * Local-first persistence. Everything lives in localStorage — no backend, no
 * accounts, single child. Reads are defensive: a corrupt or partial payload
 * falls back to sensible defaults rather than crashing the app.
 */

const SCHEMA_VERSION = 1;
const KEY = `mathmind:v${SCHEMA_VERSION}`;

interface PersistShape {
  settings: Settings;
  progress: Progress;
}

const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

function load(): PersistShape {
  const fallback: PersistShape = {
    settings: { ...DEFAULT_SETTINGS },
    progress: { ...DEFAULT_PROGRESS },
  };
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      progress: { ...DEFAULT_PROGRESS, ...(parsed.progress ?? {}) },
    };
  } catch {
    return fallback;
  }
}

function persist(data: PersistShape): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode) — fail silently; play still works.
  }
}

export function loadSettings(): Settings {
  return load().settings;
}

export function loadProgress(): Progress {
  return load().progress;
}

export function saveSettings(settings: Settings): void {
  const current = load();
  persist({ ...current, settings });
}

export function saveProgress(progress: Progress): void {
  const current = load();
  persist({ ...current, progress });
}
