import type { Tier } from '../engine/types';
import type { SessionLength } from '../engine/problemEngine';

/**
 * Child + session settings. Lives in localStorage and is editable only from the
 * Parent Corner (Phase 4). `startTier` is the child's "comfortably challenging"
 * level; warm-ups begin two tiers below it.
 */
export interface Settings {
  childName: string;
  /** Child's configured level (1–8). Warm-up ceiling; floor is startTier − 2. */
  startTier: Tier;
  sessionLength: SessionLength;
  muted: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  childName: '',
  startTier: 5, // Grade 4–5 (confirmed default). Floor lands at Grade 3–4.
  sessionLength: 'standard',
  muted: false,
};

/** Cumulative, non-comparative progress. Expanded in Phase 4. */
export interface Progress {
  /** Total sessions ever completed. */
  sessionsCompleted: number;
  /** Effort points (never shown as a score/accuracy — pure encouragement). */
  effortPoints: number;
  /** Streak flame level (cools down by one on a missed day, never resets to 0). */
  streak: number;
  /** ISO date (YYYY-MM-DD) of the last completed session. */
  lastSessionDate: string | null;
  /** One garden/galaxy item per completed day (Phase 4 renders these). */
  garden: string[];
}

export const DEFAULT_PROGRESS: Progress = {
  sessionsCompleted: 0,
  effortPoints: 0,
  streak: 0,
  lastSessionDate: null,
  garden: [],
};
