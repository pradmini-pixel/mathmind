/**
 * ProblemEngine — the pure, testable heart of MathMind.
 *
 * Responsibilities:
 *   1. Generate warm-up problems by type + difficulty tier (deterministic given
 *      a seeded RNG).
 *   2. Validate a child's answer (exact, or within an estimation band).
 *   3. Run the adaptive step-up / step-down rules that keep the child in FLOW.
 *
 * Design rules that come straight from the pedagogy brief:
 *   - Warm-ups build fluency & confidence; they never test at the edge of ability.
 *   - Start 2 tiers below the child's level; rise gently; cap at their level.
 *   - After a wobble (2 misses) drop a tier AND queue an easy "reset" problem so
 *     the session can never spiral or end on frustration.
 */

import type {
  AdaptiveState,
  AttemptOutcome,
  Problem,
  ProblemType,
  Rng,
  Tier,
} from './types';
import { MAX_TIER, MIN_TIER } from './types';
import { TIERS } from './tiers';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clampTier = (t: number): Tier =>
  Math.max(MIN_TIER, Math.min(MAX_TIER, t)) as Tier;

let idCounter = 0;
function makeId(type: ProblemType, tier: Tier): string {
  idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${type}-t${tier}-${idCounter}`;
}

/**
 * Build a shuffled multiple-choice set that always contains `answer` and
 * `count` total distinct options. `distractor` produces plausible wrong values;
 * we retry until we have enough distinct, non-negative options.
 */
function makeChoices(
  answer: number,
  count: number,
  rng: Rng,
  distractor: () => number,
): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < count && guard < 200) {
    const d = distractor();
    if (d >= 0 && d !== answer) set.add(d);
    guard += 1;
  }
  // Fallback padding in the unlikely event distractors collide too often.
  let pad = answer + 1;
  while (set.size < count) {
    if (!set.has(pad) && pad >= 0) set.add(pad);
    pad += 1;
  }
  const arr = [...set];
  // Fisher–Yates shuffle with the seeded RNG.
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SHAPES = ['🔺', '🟦', '🟢', '⬛', '⭐'] as const;

// ---------------------------------------------------------------------------
// Per-type generators. Each returns a fully-valid Problem whose `answer` is
// guaranteed correct by construction.
// ---------------------------------------------------------------------------

function genFactFluency(tier: Tier, rng: Rng): Problem {
  let a: number;
  let b: number;
  let op: '+' | '−' | '×';
  let answer: number;

  if (tier <= 1) {
    // Add/subtract facts to ~20.
    op = rng.pick(['+', '−']);
    if (op === '+') {
      a = rng.int(2, 9);
      b = rng.int(2, Math.min(9, 18 - a));
      answer = a + b;
    } else {
      a = rng.int(6, 18);
      b = rng.int(2, a - 1);
      answer = a - b;
    }
  } else if (tier === 2) {
    // Times-table fluency, with add/sub mixed in.
    op = rng.pick(['×', '×', '+', '−']);
    if (op === '×') {
      a = rng.int(2, 9);
      b = rng.int(2, 9);
      answer = a * b;
    } else if (op === '+') {
      a = rng.int(5, 15);
      b = rng.int(3, 12);
      answer = a + b;
    } else {
      a = rng.int(10, 20);
      b = rng.int(2, a - 1);
      answer = a - b;
    }
  } else if (tier === 3) {
    // Tables to 12, and 2-digit ± 1-digit.
    op = rng.pick(['×', '×', '+', '−']);
    if (op === '×') {
      a = rng.int(3, 12);
      b = rng.int(3, 9);
      answer = a * b;
    } else if (op === '+') {
      a = rng.int(15, 45);
      b = rng.int(3, 9);
      answer = a + b;
    } else {
      a = rng.int(20, 60);
      b = rng.int(3, 9);
      answer = a - b;
    }
  } else {
    // tier >= 4: 2-digit mental add/sub.
    op = rng.pick(['+', '−']);
    if (op === '+') {
      a = rng.int(12, 49);
      b = rng.int(11, 49);
      answer = a + b;
    } else {
      a = rng.int(31, 89);
      b = rng.int(11, a - 5);
      answer = a - b;
    }
  }

  return {
    id: makeId('fact-fluency', tier),
    type: 'fact-fluency',
    tier,
    inputMode: 'numeric',
    prompt: `${a} ${op} ${b}`,
    answer,
    hint:
      op === '×'
        ? `Think of ${a} groups of ${b}.`
        : op === '+'
          ? `Try starting at ${a} and counting on ${b}.`
          : `Start at ${a} and count back ${b}.`,
    worked: `${a} ${op} ${b} = ${answer}`,
  };
}

function genMissingNumber(tier: Tier, rng: Rng): Problem {
  // Choose the hidden answer first, then build a true equation around it.
  let prompt: string;
  let answer: number;
  let hint: string;
  let worked: string;

  if (tier <= 3) {
    // Missing factor / addend within fact range: e.g. 7 × __ = 63.
    const kind = rng.pick(['×', '+', '−'] as const);
    if (kind === '×') {
      const a = rng.int(2, 9);
      answer = rng.int(2, 9);
      const c = a * answer;
      prompt = `${a} × ▢ = ${c}`;
      hint = `What times ${a} makes ${c}? Try ${c} ÷ ${a}.`;
      worked = `${a} × ${answer} = ${c}`;
    } else if (kind === '+') {
      const b = rng.int(3, 12);
      answer = rng.int(3, 15);
      const c = answer + b;
      prompt = `▢ + ${b} = ${c}`;
      hint = `Take ${b} away from ${c}.`;
      worked = `${answer} + ${b} = ${c}`;
    } else {
      const b = rng.int(3, 12);
      answer = rng.int(b + 2, b + 15);
      const c = answer - b;
      prompt = `▢ − ${b} = ${c}`;
      hint = `Add ${b} back onto ${c}.`;
      worked = `${answer} − ${b} = ${c}`;
    }
  } else {
    // 2-digit missing number: e.g. __ − 18 = 24, or 6 × __ = 84.
    const kind = rng.pick(['−', '+', '×'] as const);
    if (kind === '−') {
      const b = rng.int(11, 39);
      answer = rng.int(b + 5, b + 45);
      const c = answer - b;
      prompt = `▢ − ${b} = ${c}`;
      hint = `Add ${b} back onto ${c}.`;
      worked = `${answer} − ${b} = ${c}`;
    } else if (kind === '+') {
      const b = rng.int(15, 45);
      answer = rng.int(12, 48);
      const c = answer + b;
      prompt = `▢ + ${b} = ${c}`;
      hint = `Take ${b} away from ${c}.`;
      worked = `${answer} + ${b} = ${c}`;
    } else {
      const a = rng.int(3, 9);
      answer = rng.int(6, 15);
      const c = a * answer;
      prompt = `${a} × ▢ = ${c}`;
      hint = `What times ${a} makes ${c}? Try ${c} ÷ ${a}.`;
      worked = `${a} × ${answer} = ${c}`;
    }
  }

  return {
    id: makeId('missing-number', tier),
    type: 'missing-number',
    tier,
    inputMode: 'numeric',
    prompt,
    answer,
    hint,
    worked,
  };
}

function genPattern(tier: Tier, rng: Rng): Problem {
  // Show four terms, ask for the fifth. Multiple-choice.
  let terms: number[];
  let answer: number;
  let hint: string;

  const style =
    tier <= 5
      ? rng.pick(['add', 'add', 'geo'] as const)
      : rng.pick(['add', 'geo', 'geo2'] as const);

  if (style === 'add') {
    const start = rng.int(1, 9);
    const step = rng.int(2, tier <= 5 ? 6 : 12);
    terms = [start, start + step, start + 2 * step, start + 3 * step];
    answer = start + 4 * step;
    hint = `How much do you add each time? It's +${step}.`;
  } else if (style === 'geo') {
    const start = rng.int(1, 3);
    const ratio = rng.pick([2, 3] as const);
    terms = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
    answer = start * ratio ** 4;
    hint = `Each number is the one before it × ${ratio}.`;
  } else {
    // "geo2": ×2 then +1 style growing pattern (still integer, still tidy).
    const start = rng.int(1, 4);
    const seq = [start];
    for (let i = 0; i < 4; i += 1) seq.push(seq[i] * 2 + 1);
    terms = seq.slice(0, 4);
    answer = seq[4];
    hint = `Double the number, then add 1.`;
  }

  // Distractors sit a few "gaps" away from the answer — plausible near-misses,
  // well-separated for geometric patterns where the gap is large.
  const gap = Math.max(1, Math.abs(terms[3] - terms[2]));
  const choices = makeChoices(answer, 4, rng, () => answer + rng.pick([-2, -1, 1, 2] as const) * gap);

  return {
    id: makeId('pattern', tier),
    type: 'pattern',
    tier,
    inputMode: 'choice',
    prompt: `${terms.join(', ')}, ▢`,
    answer,
    choices,
    hint,
    worked: `The pattern continues: …, ${terms[3]}, ${answer}`,
  };
}

function genEstimation(tier: Tier, rng: Rng): Problem {
  // "About how much is 41 × 19?" — multiple choice of clearly-separated estimates.
  const a = rng.int(tier >= 7 ? 21 : 11, tier >= 7 ? 89 : 49);
  const b = rng.int(tier >= 7 ? 12 : 8, tier >= 7 ? 49 : 21);
  const exact = a * b;

  // The "good estimate" = round each factor to the nearest ten, then multiply.
  const roundTen = (n: number) => Math.round(n / 10) * 10;
  const estimate = Math.max(roundTen(a), 10) * Math.max(roundTen(b), 10);

  // Distractors are an order of magnitude off — teaches place-value sense.
  const choices = makeChoices(estimate, 4, rng, () => {
    const factor = rng.pick([0.1, 10, 0.5, 2] as const);
    return Math.round((estimate * factor) / 10) * 10;
  });

  return {
    id: makeId('estimation', tier),
    type: 'estimation',
    tier,
    inputMode: 'choice',
    prompt: `About how much is ${a} × ${b}?`,
    answer: estimate,
    choices,
    hint: `Round ${a} and ${b} to the nearest ten, then multiply.`,
    worked: `${a} ≈ ${roundTen(a)} and ${b} ≈ ${roundTen(b)}, so about ${roundTen(a)} × ${roundTen(b)} = ${estimate}. (Exactly ${exact}.)`,
  };
}

function genBalance(tier: Tier, rng: Rng): Problem {
  const shape = rng.pick(SHAPES);
  const style = rng.pick(['repeat', 'repeat', 'linear'] as const);

  let prompt: string;
  let answer: number;
  let hint: string;
  let worked: string;

  if (style === 'repeat') {
    // shape + shape + … = total  →  shape = total / k
    const k = rng.int(2, 4);
    answer = rng.int(2, 12);
    const total = k * answer;
    prompt = `${Array(k).fill(shape).join(' + ')} = ${total}\nWhat is ${shape}?`;
    hint = `${k} of them make ${total}, so share ${total} into ${k} equal parts.`;
    worked = `${total} ÷ ${k} = ${answer}, so ${shape} = ${answer}`;
  } else {
    // k × shape + c = total  →  shape = (total − c) / k
    const k = rng.int(2, 3);
    answer = rng.int(2, 9);
    const c = rng.int(1, 9);
    const total = k * answer + c;
    prompt = `${k} × ${shape} + ${c} = ${total}\nWhat is ${shape}?`;
    hint = `First take away the ${c}. Then split what's left into ${k} equal parts.`;
    worked = `${total} − ${c} = ${k * answer}, and ${k * answer} ÷ ${k} = ${answer}, so ${shape} = ${answer}`;
  }

  return {
    id: makeId('balance', tier),
    type: 'balance',
    tier,
    inputMode: 'numeric',
    prompt,
    answer,
    hint,
    worked,
  };
}

const GENERATORS: Record<ProblemType, (tier: Tier, rng: Rng) => Problem> = {
  'fact-fluency': genFactFluency,
  'missing-number': genMissingNumber,
  pattern: genPattern,
  estimation: genEstimation,
  balance: genBalance,
};

// ---------------------------------------------------------------------------
// Public generation API
// ---------------------------------------------------------------------------

/**
 * Generate a single problem at the given tier. If `forceType` is supplied it is
 * used directly (used by the "reset" mechanic to guarantee an easy type);
 * otherwise a type is chosen from the tier's eligible pool.
 */
export function generateProblem(
  tier: Tier,
  rng: Rng,
  forceType?: ProblemType,
): Problem {
  const spec = TIERS[clampTier(tier)];
  const type = forceType ?? rng.pick(spec.types);
  return GENERATORS[type](clampTier(tier), rng);
}

// ---------------------------------------------------------------------------
// Answer validation
// ---------------------------------------------------------------------------

/**
 * Returns true if `input` exactly matches the problem's answer. (Estimation is
 * multiple-choice, so the chosen estimate is compared exactly too.) Non-finite
 * input is always incorrect — but the UI never "punishes" it.
 */
export function validateAnswer(problem: Problem, input: number): boolean {
  return Number.isFinite(input) && input === problem.answer;
}

// ---------------------------------------------------------------------------
// Adaptive engine
// ---------------------------------------------------------------------------

export const STEP_UP_AFTER = 3; // correct-in-a-row to step up a tier
export const STEP_DOWN_AFTER = 2; // misses-in-a-row to step down + reset

/**
 * Create the starting adaptive state for a child whose configured level is
 * `startTier`. The warm-up FLOORS at startTier − 2 (early easy wins) and
 * CEILINGS at startTier (never harder than "comfortably challenging").
 */
export function initAdaptiveState(startTier: Tier): AdaptiveState {
  const ceilingTier = clampTier(startTier);
  const floorTier = clampTier(startTier - 2);
  return {
    tier: floorTier,
    correctStreak: 0,
    missStreak: 0,
    needsReset: false,
    floorTier,
    ceilingTier,
  };
}

/**
 * Pure reducer: given the current adaptive state and the outcome of the
 * problem just answered, produce the state used to generate the NEXT problem.
 *
 *   - 3 correct in a row  → tier + 1 (capped at ceiling), streak resets.
 *   - 2 misses in a row   → tier − 1 (floored), queue an easy reset problem.
 */
export function applyResult(
  state: AdaptiveState,
  outcome: AttemptOutcome,
): AdaptiveState {
  const next: AdaptiveState = { ...state, needsReset: false };

  if (outcome === 'correct') {
    next.correctStreak = state.correctStreak + 1;
    next.missStreak = 0;
    if (next.correctStreak >= STEP_UP_AFTER) {
      next.tier = clampTier(Math.min(next.tier + 1, state.ceilingTier));
      next.correctStreak = 0;
    }
  } else {
    next.missStreak = state.missStreak + 1;
    next.correctStreak = 0;
    if (next.missStreak >= STEP_DOWN_AFTER) {
      next.tier = clampTier(Math.max(next.tier - 1, state.floorTier));
      next.missStreak = 0;
      next.needsReset = true; // next problem should be an easy confidence-restorer
    }
  }

  return next;
}

/**
 * Generate the next problem given the current adaptive state, honouring the
 * "reset" flag by forcing the tier's easiest available type.
 */
export function nextProblem(state: AdaptiveState, rng: Rng): Problem {
  if (state.needsReset) {
    const spec = TIERS[state.tier];
    // Prefer a pure-fluency type for the reset; fall back to the first eligible.
    const easyType: ProblemType = spec.types.includes('fact-fluency')
      ? 'fact-fluency'
      : spec.types[0];
    return generateProblem(state.tier, rng, easyType);
  }
  return generateProblem(state.tier, rng);
}

// ---------------------------------------------------------------------------
// Session sizing
// ---------------------------------------------------------------------------

export type SessionLength = 'short' | 'standard';

/**
 * How many warm-up problems a session should contain. Standard = 8–10 (the
 * pedagogy target); short = 6–7 for a quicker ritual. Deterministic given rng.
 */
export function plannedProblemCount(length: SessionLength, rng: Rng): number {
  return length === 'short' ? rng.int(6, 7) : rng.int(8, 10);
}
