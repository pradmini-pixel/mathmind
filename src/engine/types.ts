/**
 * Core type definitions for the MathMind ProblemEngine.
 *
 * The engine is a PURE module: no React, no DOM, no localStorage. Everything
 * here is plain data so it can be unit-tested and reasoned about in isolation.
 */

/** The kinds of warm-up problems the engine can produce. */
export type ProblemType =
  | 'fact-fluency' // 7 + 8, 13 - 6, 6 × 7
  | 'missing-number' // 7 × __ = 63, __ − 18 = 24
  | 'pattern' // 2, 6, 18, 54, __
  | 'estimation' // about how much is 41 × 19?
  | 'balance'; // 🔺 + 🔺 = 12, so 🔺 = ?

/** Difficulty tiers, 1 (Grade 3 fluency) → 8 (Pre-Algebra). */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const MIN_TIER: Tier = 1;
export const MAX_TIER: Tier = 8;

/**
 * How the child answers a problem. `numeric` renders an on-screen number pad
 * (also accepts keyboard); `choice` renders large multiple-choice buttons.
 */
export type InputMode = 'numeric' | 'choice';

/** A single generated problem. Fully self-contained and serializable. */
export interface Problem {
  /** Unique per generated problem (stable within a session). */
  id: string;
  type: ProblemType;
  tier: Tier;
  inputMode: InputMode;
  /**
   * The question as a display string. For `balance` problems the emoji/shape
   * is embedded so no extra rendering data is required for a basic view.
   */
  prompt: string;
  /** The single correct numeric answer. */
  answer: number;
  /**
   * For `choice` problems: the shuffled options shown to the child. The correct
   * `answer` is always among them.
   */
  choices?: number[];
  /**
   * Gentle nudge revealed only on a second attempt. Never shown up front —
   * time-pressure-free, hint-on-request-only keeps anxiety low.
   */
  hint: string;
  /**
   * A friendly worked explanation shown after two misses. Frames the answer as
   * "here's how it works", never "you got it wrong".
   */
  worked: string;
}

/** Result of the child's attempt on a problem, fed into the adaptive engine. */
export type AttemptOutcome = 'correct' | 'miss';

/**
 * Rolling adaptive state. The engine is a pure reducer over this: given the
 * current state and an outcome, it returns the next state (including the next
 * tier and whether to inject an easier "reset" problem).
 */
export interface AdaptiveState {
  /** Tier the NEXT problem should be generated at. */
  tier: Tier;
  /** Consecutive correct answers (resets to 0 on a miss). */
  correctStreak: number;
  /** Consecutive misses (resets to 0 on a correct answer). */
  missStreak: number;
  /**
   * When true, the next problem should be an easy confidence-restoring "reset"
   * — generated at the current (already stepped-down) tier. Ensures the child
   * always gets an easy win after struggling; the session never ends on frustration.
   */
  needsReset: boolean;
  /** Lower bound for the tier (startTier − 2, clamped to MIN_TIER). */
  floorTier: Tier;
  /** Upper bound for the tier (the child's configured start level). */
  ceilingTier: Tier;
}

/** A seedable, deterministic random source so tests are reproducible. */
export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Returns a random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}
