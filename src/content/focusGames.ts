import type { Rng } from '../engine/types';

/**
 * Focus Finisher games — short, non-math sustained-attention exercises that end
 * the session on PLAY. One is chosen per session (rotating). Pure generators so
 * they're deterministic under a seeded RNG and easy to reason about.
 */

export interface Cell {
  id: number;
  emoji: string;
}

/** "Tap the picture that appears only once." */
export interface OddOneOutGame {
  kind: 'odd-one-out';
  prompt: string;
  cells: Cell[];
  answerId: number;
}

/** "How many blue diamonds can you find?" — tap the count. */
export interface CountTargetGame {
  kind: 'count-target';
  prompt: string;
  cells: Cell[];
  choices: number[];
  answer: number;
}

export type FocusGame = OddOneOutGame | CountTargetGame;

const FILLERS = ['🍀', '🌸', '🐢', '🦋', '🍄', '🐞', '⭐', '🌙', '🍁', '🐙'] as const;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeOddOneOut(rng: Rng): OddOneOutGame {
  const size = 9; // 3×3 grid
  const [common, unique] = shuffle([...FILLERS], rng);
  const emojis: string[] = Array(size - 1).fill(common);
  emojis.push(unique);
  const shuffled = shuffle(emojis, rng);
  const cells: Cell[] = shuffled.map((emoji, id) => ({ id, emoji }));
  const answerId = cells.find((c) => c.emoji === unique)!.id;
  return {
    kind: 'odd-one-out',
    prompt: 'Tap the one that appears only once.',
    cells,
    answerId,
  };
}

function makeCountTarget(rng: Rng): CountTargetGame {
  const size = 12; // 4×3 grid
  const [target, distractor] = shuffle([...FILLERS], rng);
  const answer = rng.int(3, 6);
  const emojis: string[] = Array(answer).fill(target);
  while (emojis.length < size) emojis.push(distractor);
  const cells: Cell[] = shuffle(emojis, rng).map((emoji, id) => ({ id, emoji }));

  const choiceSet = new Set<number>([answer]);
  while (choiceSet.size < 4) {
    const c = answer + rng.int(-2, 3);
    if (c >= 1 && c !== answer) choiceSet.add(c);
  }
  const choices = shuffle([...choiceSet], rng);

  return {
    kind: 'count-target',
    prompt: `How many ${target} can you find?`,
    cells,
    choices,
    answer,
  };
}

/** Generate the focus game for a session (rotates kind by day + rng). */
export function makeFocusGame(rng: Rng, date = new Date()): FocusGame {
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return dayNumber % 2 === 0 ? makeOddOneOut(rng) : makeCountTarget(rng);
}
