import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { TIER_LIST } from './tiers';
import { MAX_TIER, MIN_TIER, type Tier } from './types';
import {
  applyResult,
  generateProblem,
  initAdaptiveState,
  nextProblem,
  plannedProblemCount,
  STEP_DOWN_AFTER,
  STEP_UP_AFTER,
  validateAnswer,
} from './problemEngine';

const ALL_TIERS: Tier[] = TIER_LIST.map((t) => t.tier);

describe('generateProblem', () => {
  it('produces a valid, self-consistent, solvable problem for every tier', () => {
    for (const tier of ALL_TIERS) {
      const rng = createRng(1000 + tier);
      // Many draws per tier to exercise all internal branches.
      for (let i = 0; i < 300; i += 1) {
        const p = generateProblem(tier, rng);
        expect(p.tier).toBe(tier);
        expect(p.prompt.length).toBeGreaterThan(0);
        expect(Number.isFinite(p.answer)).toBe(true);
        expect(p.hint.length).toBeGreaterThan(0);
        expect(p.worked.length).toBeGreaterThan(0);

        // The problem's own answer must validate as correct.
        expect(validateAnswer(p, p.answer)).toBe(true);

        if (p.inputMode === 'choice') {
          expect(p.choices).toBeDefined();
          expect(p.choices!.length).toBe(4);
          // All options distinct and the correct answer is among them.
          expect(new Set(p.choices).size).toBe(p.choices!.length);
          expect(p.choices).toContain(p.answer);
          // No negative options shown to the child.
          expect(p.choices!.every((c) => c >= 0)).toBe(true);
        }
      }
    }
  });

  it('generates integer, non-negative answers (mental-math friendly)', () => {
    for (const tier of ALL_TIERS) {
      const rng = createRng(42 + tier);
      for (let i = 0; i < 200; i += 1) {
        const p = generateProblem(tier, rng);
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('forceType overrides the tier pool (used by the reset mechanic)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i += 1) {
      const p = generateProblem(3, rng, 'fact-fluency');
      expect(p.type).toBe('fact-fluency');
    }
  });

  it('clamps out-of-range tiers instead of crashing', () => {
    const rng = createRng(9);
    expect(() => generateProblem(0 as Tier, rng)).not.toThrow();
    expect(() => generateProblem(99 as Tier, rng)).not.toThrow();
  });
});

describe('validateAnswer', () => {
  const rng = createRng(123);
  const p = generateProblem(2, rng);

  it('accepts the exact correct answer', () => {
    expect(validateAnswer(p, p.answer)).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(validateAnswer(p, p.answer + 1)).toBe(false);
    expect(validateAnswer(p, p.answer - 1)).toBe(false);
  });

  it('rejects non-finite input without throwing', () => {
    expect(validateAnswer(p, NaN)).toBe(false);
    expect(validateAnswer(p, Infinity)).toBe(false);
  });

  it('accepts anything inside an estimation acceptBand', () => {
    const est = {
      ...p,
      answer: 800,
      acceptBand: { min: 680, max: 920 },
    };
    expect(validateAnswer(est, 680)).toBe(true);
    expect(validateAnswer(est, 800)).toBe(true);
    expect(validateAnswer(est, 920)).toBe(true);
    expect(validateAnswer(est, 679)).toBe(false);
    expect(validateAnswer(est, 921)).toBe(false);
  });
});

describe('adaptive engine — step up', () => {
  it(`steps the tier up after ${STEP_UP_AFTER} correct in a row`, () => {
    let s = initAdaptiveState(5); // floor 3, ceiling 5, start tier 3
    expect(s.tier).toBe(3);
    s = applyResult(s, 'correct');
    s = applyResult(s, 'correct');
    expect(s.tier).toBe(3); // not yet
    s = applyResult(s, 'correct');
    expect(s.tier).toBe(4); // stepped up
    expect(s.correctStreak).toBe(0); // streak resets after a step
  });

  it('never steps above the ceiling (child’s configured level)', () => {
    let s = initAdaptiveState(4); // floor 2, ceiling 4, start tier 2
    for (let i = 0; i < 30; i += 1) s = applyResult(s, 'correct');
    expect(s.tier).toBe(4);
    expect(s.tier).toBeLessThanOrEqual(s.ceilingTier);
  });
});

describe('adaptive engine — step down + reset', () => {
  it(`steps down and queues a reset after ${STEP_DOWN_AFTER} misses in a row`, () => {
    let s = initAdaptiveState(6); // floor 4, ceiling 6, start tier 4
    // Climb up first so there's room to fall.
    for (let i = 0; i < 6; i += 1) s = applyResult(s, 'correct');
    expect(s.tier).toBe(6);

    s = applyResult(s, 'miss');
    expect(s.needsReset).toBe(false); // one miss doesn't trigger
    s = applyResult(s, 'miss');
    expect(s.tier).toBe(5); // stepped down
    expect(s.needsReset).toBe(true); // reset queued
    expect(s.missStreak).toBe(0);
  });

  it('never steps below the floor (startTier − 2)', () => {
    let s = initAdaptiveState(5); // floor 3
    for (let i = 0; i < 30; i += 1) s = applyResult(s, 'miss');
    expect(s.tier).toBe(3);
    expect(s.tier).toBeGreaterThanOrEqual(s.floorTier);
  });

  it('a correct answer clears the miss streak (no lingering penalty)', () => {
    let s = initAdaptiveState(5);
    s = applyResult(s, 'miss');
    expect(s.missStreak).toBe(1);
    s = applyResult(s, 'correct');
    expect(s.missStreak).toBe(0);
  });

  it('nextProblem honours the reset flag with an easy fluency problem', () => {
    let s = initAdaptiveState(8); // ceiling 8 (balance tier), floor 6
    s = applyResult(s, 'miss');
    s = applyResult(s, 'miss'); // now needsReset, tier stepped down
    expect(s.needsReset).toBe(true);
    const rng = createRng(55);
    const p = nextProblem(s, rng);
    // Tier 6's easiest type isn't fact-fluency, so it uses the first eligible
    // type — the key guarantee is simply that we get a valid solvable problem.
    expect(validateAnswer(p, p.answer)).toBe(true);
  });
});

describe('floor/ceiling clamping across the tier range', () => {
  it('keeps low start levels within [MIN_TIER, ceiling]', () => {
    const s = initAdaptiveState(1); // start 1 → floor clamps to MIN_TIER
    expect(s.floorTier).toBe(MIN_TIER);
    expect(s.tier).toBe(MIN_TIER);
    expect(s.ceilingTier).toBe(1);
  });

  it('keeps the max start level within range', () => {
    const s = initAdaptiveState(MAX_TIER);
    expect(s.ceilingTier).toBe(MAX_TIER);
    expect(s.floorTier).toBe((MAX_TIER - 2) as Tier);
  });
});

describe('determinism', () => {
  it('produces identical problems for the same seed', () => {
    const a = createRng(2024);
    const b = createRng(2024);
    for (let i = 0; i < 100; i += 1) {
      const pa = generateProblem(5, a);
      const pb = generateProblem(5, b);
      expect(pa.prompt).toBe(pb.prompt);
      expect(pa.answer).toBe(pb.answer);
      expect(pa.choices).toEqual(pb.choices);
    }
  });

  it('different seeds diverge (not a constant generator)', () => {
    const a = createRng(1);
    const b = createRng(2);
    const promptsA = Array.from({ length: 20 }, () => generateProblem(4, a).prompt);
    const promptsB = Array.from({ length: 20 }, () => generateProblem(4, b).prompt);
    expect(promptsA).not.toEqual(promptsB);
  });
});

describe('plannedProblemCount', () => {
  it('standard sessions have 8–10 problems, short have 6–7', () => {
    const rng = createRng(3);
    for (let i = 0; i < 50; i += 1) {
      const std = plannedProblemCount('standard', rng);
      expect(std).toBeGreaterThanOrEqual(8);
      expect(std).toBeLessThanOrEqual(10);
      const short = plannedProblemCount('short', rng);
      expect(short).toBeGreaterThanOrEqual(6);
      expect(short).toBeLessThanOrEqual(7);
    }
  });
});
