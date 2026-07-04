import { useCallback, useMemo, useRef, useState } from 'react';
import { createRandomRng } from '../engine/rng';
import type { AdaptiveState, Problem, Rng } from '../engine/types';
import {
  applyResult,
  initAdaptiveState,
  nextProblem,
  plannedProblemCount,
  validateAnswer,
} from '../engine/problemEngine';
import { affirmationForDay } from '../content/affirmations';
import { makeFocusGame, type FocusGame } from '../content/focusGames';
import { loadProgress, loadSettings, saveProgress } from './storage';
import { type Progress, type Settings } from './types';

/** The five ritual steps, in order. */
export type Phase = 'arrive' | 'powerup' | 'warmup' | 'focus' | 'launch';

/** Feedback state for the problem currently on screen. */
export type Feedback = 'none' | 'try-again' | 'correct' | 'revealed';

// Effort points — encouragement only, never a score shown as accuracy.
const CORRECT_POINTS = 10;
const BOUNCE_POINTS = 15; // correct on the 2nd try — persistence pays MORE
const REVEAL_POINTS = 5; // stuck-but-stayed-with-it still earns effort
const COMPLETE_BONUS = 20;

const GARDEN_ITEMS = ['🌱', '🌸', '🍄', '🌷', '🌻', '🪴', '🌵', '🍀', '🌼', '🌟'] as const;

interface SessionState {
  phase: Phase;
  affirmation: string;
  // warm-up
  adaptive: AdaptiveState;
  problem: Problem | null;
  index: number; // 1-based number of the problem currently shown
  total: number; // problems this session
  attempt: 1 | 2;
  feedback: Feedback;
  gainedBounceBack: boolean;
  // focus finisher
  focus: FocusGame | null;
  // effort + silent timing (parent view only)
  effortPoints: number;
  bounceBacks: number;
  startedAt: number;
  calmToReadyMs: number | null;
}

function todayISO(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T00:00:00Z').getTime();
  const b = new Date(toISO + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Streak "with grace": completing today extends the flame; a missed day cools
 * it down by one level per day missed, but completing today never drops it
 * below 1. Punitive resets cause anxiety and quitting — so we never reset to 0.
 */
function updateStreak(prev: Progress, today: string): number {
  if (!prev.lastSessionDate) return 1;
  const gap = daysBetween(prev.lastSessionDate, today);
  if (gap <= 0) return Math.max(1, prev.streak); // already played today
  if (gap === 1) return prev.streak + 1;
  return Math.max(1, prev.streak - (gap - 1));
}

function freshState(rng: Rng, settings: Settings): SessionState {
  const adaptive = initAdaptiveState(settings.startTier);
  return {
    phase: 'arrive',
    affirmation: affirmationForDay(),
    adaptive,
    problem: null,
    index: 1,
    total: plannedProblemCount(settings.sessionLength, rng),
    attempt: 1,
    feedback: 'none',
    gainedBounceBack: false,
    focus: null,
    effortPoints: 0,
    bounceBacks: 0,
    startedAt: Date.now(),
    calmToReadyMs: null,
  };
}

/**
 * Drives the whole daily ritual. Keeps the RNG in a ref (so React re-renders
 * never reseed mid-session) and exposes plain handlers the UI calls to advance.
 * The ProblemEngine stays pure; this hook is the only stateful glue.
 */
export function useSession() {
  const rngRef = useRef<Rng>(createRandomRng());
  const settingsRef = useRef<Settings>(loadSettings());
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [state, setState] = useState<SessionState>(() =>
    freshState(rngRef.current, settingsRef.current),
  );

  const settings = settingsRef.current;

  /** Arrive → Power-Up. Records calm-to-ready time (silent, parent-only). */
  const finishBreathing = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: 'powerup',
      calmToReadyMs: Date.now() - s.startedAt,
    }));
  }, []);

  /** Power-Up → Warm-Up. Generates the first (deliberately easy) problem. */
  const chargePowerUp = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: 'warmup',
      problem: nextProblem(s.adaptive, rngRef.current),
    }));
  }, []);

  /**
   * Handle an answer. Never punishes: a first miss invites one more try (with a
   * hint); a second miss reveals a friendly worked answer. Both are progress.
   */
  const answer = useCallback((value: number) => {
    setState((s) => {
      if (!s.problem || s.feedback === 'correct' || s.feedback === 'revealed') {
        return s; // already resolved — ignore stray input
      }
      const correct = validateAnswer(s.problem, value);
      if (correct) {
        const bounce = s.attempt === 2;
        return {
          ...s,
          feedback: 'correct',
          gainedBounceBack: bounce,
          bounceBacks: s.bounceBacks + (bounce ? 1 : 0),
          effortPoints: s.effortPoints + (bounce ? BOUNCE_POINTS : CORRECT_POINTS),
        };
      }
      if (s.attempt === 1) {
        // First miss → "Close! Try once more" with a hint revealed.
        return { ...s, attempt: 2, feedback: 'try-again' };
      }
      // Second miss → reveal worked answer. Still earns effort for staying with it.
      return {
        ...s,
        feedback: 'revealed',
        effortPoints: s.effortPoints + REVEAL_POINTS,
      };
    });
  }, []);

  /** Advance from a resolved problem to the next one, or on to the Focus game. */
  const nextStep = useCallback(() => {
    setState((s) => {
      if (s.feedback !== 'correct' && s.feedback !== 'revealed') return s;
      const outcome = s.feedback === 'correct' ? 'correct' : 'miss';
      const adaptive = applyResult(s.adaptive, outcome);

      if (s.index >= s.total) {
        // Warm-up done → Focus Finisher.
        return {
          ...s,
          adaptive,
          phase: 'focus',
          focus: makeFocusGame(rngRef.current),
        };
      }
      return {
        ...s,
        adaptive,
        index: s.index + 1,
        attempt: 1,
        feedback: 'none',
        gainedBounceBack: false,
        problem: nextProblem(adaptive, rngRef.current),
      };
    });
  }, []);

  /** Focus → Launch. Finalizes and persists progress (streak, points, garden). */
  const finishFocus = useCallback(() => {
    setState((s) => {
      const today = todayISO();
      const alreadyToday = progress.lastSessionDate === today;
      const streak = updateStreak(progress, today);
      const gained = s.effortPoints + COMPLETE_BONUS;

      const nextProgress: Progress = {
        sessionsCompleted: progress.sessionsCompleted + 1,
        effortPoints: progress.effortPoints + gained,
        streak,
        lastSessionDate: today,
        // One garden item per NEW day completed (not for repeat same-day runs).
        garden: alreadyToday
          ? progress.garden
          : [
              ...progress.garden,
              GARDEN_ITEMS[progress.garden.length % GARDEN_ITEMS.length],
            ],
      };
      saveProgress(nextProgress);
      setProgress(nextProgress);
      return { ...s, phase: 'launch', effortPoints: gained };
    });
  }, [progress]);

  /** Start a brand-new session (new problems, fresh timing). */
  const restart = useCallback(() => {
    rngRef.current = createRandomRng();
    settingsRef.current = loadSettings();
    setProgress(loadProgress());
    setState(freshState(rngRef.current, settingsRef.current));
  }, []);

  return useMemo(
    () => ({
      ...state,
      settings,
      progress,
      finishBreathing,
      chargePowerUp,
      answer,
      nextStep,
      finishFocus,
      restart,
    }),
    [
      state,
      settings,
      progress,
      finishBreathing,
      chargePowerUp,
      answer,
      nextStep,
      finishFocus,
      restart,
    ],
  );
}
