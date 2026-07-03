/**
 * Growth-mindset affirmations for the Power-Up step.
 *
 * PSYCHOLOGY: every line is PROCESS-oriented (effort, strategy, persistence) —
 * never ability praise like "I'm smart". Ability praise makes kids fear
 * failure; process praise builds resilience (Dweck). One is shown per day.
 */
export const AFFIRMATIONS: readonly string[] = [
  'Mistakes grow my brain.',
  "I can't do it… YET.",
  'Hard problems are how I level up.',
  "I don't have to be fast. I have to think.",
  'Every try teaches my brain something new.',
  'Getting stuck means I’m about to learn.',
  'I can figure things out step by step.',
  'My focus is a superpower I can switch on.',
];

/**
 * Deterministically pick the affirmation for a given day so it's stable across
 * reloads within the same day but rotates day to day.
 */
export function affirmationForDay(date = new Date()): string {
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return AFFIRMATIONS[dayNumber % AFFIRMATIONS.length];
}
