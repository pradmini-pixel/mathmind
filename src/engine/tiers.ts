import type { ProblemType, Tier } from './types';

/**
 * Human-facing metadata for each difficulty tier, plus the set of problem
 * types eligible at that tier. Tiers ascend from Grade 3 fluency (1) to
 * Pre-Algebra (8).
 *
 * PEDAGOGY: lower tiers are pure fluency (build automaticity + confidence).
 * Reasoning types (pattern, estimation, balance) only appear once the child
 * has fluency to lean on, so a warm-up never feels like a cold test.
 */
export interface TierSpec {
  tier: Tier;
  /** Short label, e.g. shown as a difficulty trend in the Parent Corner. */
  label: string;
  /** Rough grade-band description for the Parent Corner. */
  grade: string;
  /** Problem types that can be generated at this tier (weighted by order/repeats). */
  types: ProblemType[];
}

export const TIERS: Record<Tier, TierSpec> = {
  1: {
    tier: 1,
    label: 'Warm Start',
    grade: 'Grade 3 — facts to 20',
    types: ['fact-fluency'],
  },
  2: {
    tier: 2,
    label: 'Fact Flow',
    grade: 'Grade 3 — times tables',
    types: ['fact-fluency', 'fact-fluency'],
  },
  3: {
    tier: 3,
    label: 'Missing Pieces',
    grade: 'Grade 3–4 — missing ×/÷',
    types: ['fact-fluency', 'missing-number'],
  },
  4: {
    tier: 4,
    label: 'Two-Digit Mental',
    grade: 'Grade 4 — 2-digit + missing',
    types: ['fact-fluency', 'missing-number', 'missing-number'],
  },
  5: {
    tier: 5,
    label: 'Pattern Spotter',
    grade: 'Grade 4–5 — patterns',
    types: ['missing-number', 'pattern', 'pattern'],
  },
  6: {
    tier: 6,
    label: 'Smart Estimator',
    grade: 'Grade 5 — estimation',
    types: ['pattern', 'estimation', 'estimation'],
  },
  7: {
    tier: 7,
    label: 'Two-Step Thinker',
    grade: 'Grade 5–6 — multi-step',
    types: ['missing-number', 'estimation', 'pattern'],
  },
  8: {
    tier: 8,
    label: 'Pre-Algebra',
    grade: 'Pre-Algebra — balance & unknowns',
    types: ['balance', 'balance', 'missing-number'],
  },
};

/** Ordered list of tier specs, ascending. */
export const TIER_LIST: TierSpec[] = Object.values(TIERS).sort(
  (a, b) => a.tier - b.tier,
);
