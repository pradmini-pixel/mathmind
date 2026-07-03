import type { Rng } from './types';

/**
 * A small, fast, deterministic PRNG (mulberry32). Given the same seed it always
 * produces the same sequence — essential for reproducible unit tests and for
 * generating a stable "problem of the day" if we ever want one.
 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('createRng.pick: empty array');
    return items[int(0, items.length - 1)];
  };

  return { next, int, pick };
}

/**
 * A non-deterministic RNG for real gameplay, seeded from the clock. Uses the
 * same implementation so behaviour matches the tested engine exactly.
 */
export function createRandomRng(): Rng {
  return createRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
}
