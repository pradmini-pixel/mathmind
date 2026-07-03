import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from '../state/useSession';
import { BreathingExercise } from './BreathingExercise';
import { PowerUp } from './PowerUp';
import { ProblemView } from './ProblemEngine/ProblemView';
import { FocusGame } from './FocusGame';
import { LaunchScreen } from './LaunchScreen';

/**
 * Orchestrates the exact five-step ritual:
 *   Arrive → Power-Up → Warm-Up Streak → Focus Finisher → Launch.
 * Exactly one step is on screen at a time (one task per screen).
 */
export function SessionFlow() {
  const s = useSession();

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        <motion.div
          key={s.phase + (s.problem?.id ?? '')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          {s.phase === 'arrive' && <BreathingExercise onDone={s.finishBreathing} />}

          {s.phase === 'powerup' && (
            <PowerUp affirmation={s.affirmation} onCharged={s.chargePowerUp} />
          )}

          {s.phase === 'warmup' && s.problem && (
            <ProblemView
              problem={s.problem}
              feedback={s.feedback}
              gainedBounceBack={s.gainedBounceBack}
              index={s.index}
              total={s.total}
              onAnswer={s.answer}
              onNext={s.nextStep}
            />
          )}

          {s.phase === 'focus' && s.focus && (
            <FocusGame game={s.focus} onDone={s.finishFocus} />
          )}

          {s.phase === 'launch' && (
            <LaunchScreen
              streak={s.progress.streak}
              effortPoints={s.effortPoints}
              onClose={s.restart}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
