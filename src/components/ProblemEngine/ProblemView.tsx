import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Problem } from '../../engine/types';
import type { Feedback } from '../../state/useSession';
import { NumberPad } from './NumberPad';
import { ChoiceGrid } from './ChoiceGrid';

/**
 * Step 3 — one warm-up problem. Enforces the anti-anxiety rules:
 *   - NO red X, NO buzzer, NO per-problem timer.
 *   - A wrong answer → "Close! Try once more" + a gentle hint on the 2nd try.
 *   - A second miss → a friendly worked answer (never a failure state).
 * Correct answers auto-advance so the child stays in flow.
 */
export function ProblemView({
  problem,
  feedback,
  gainedBounceBack,
  index,
  total,
  onAnswer,
  onNext,
}: {
  problem: Problem;
  feedback: Feedback;
  gainedBounceBack: boolean;
  index: number;
  total: number;
  onAnswer: (value: number) => void;
  onNext: () => void;
}) {
  const [entry, setEntry] = useState('');

  // Reset the typed entry for a fresh problem, and again for a fresh 2nd try so
  // the child isn't left backspacing their first guess.
  useEffect(() => {
    setEntry('');
  }, [problem.id]);
  useEffect(() => {
    if (feedback === 'try-again') setEntry('');
  }, [feedback]);

  // Correct answers auto-advance after a beat of celebration.
  useEffect(() => {
    if (feedback === 'correct') {
      const t = setTimeout(onNext, 1000);
      return () => clearTimeout(t);
    }
  }, [feedback, onNext]);

  const locked = feedback === 'correct' || feedback === 'revealed';
  const submitNumeric = () => {
    if (entry === '') return;
    onAnswer(Number(entry));
  };

  return (
    <div className="screen">
      <div className="dots" aria-label={`Problem ${index} of ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={
              'dot' +
              (i < index - 1 ? ' dot--done' : i === index - 1 ? ' dot--current' : '')
            }
          />
        ))}
      </div>

      <motion.div
        key={problem.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          fontSize: 46,
          fontWeight: 800,
          lineHeight: 1.25,
          whiteSpace: 'pre-line',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {problem.prompt}
      </motion.div>

      {/* Feedback band — always kind, never punishing. */}
      <AnimatePresence mode="wait">
        {feedback === 'try-again' && (
          <motion.div
            key="try"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="subtext"
            style={{ color: 'var(--sunshine)' }}
          >
            Close! Try once more.
            <div className="subtext" style={{ marginTop: 6 }}>
              💡 {problem.hint}
            </div>
          </motion.div>
        )}
        {feedback === 'correct' && (
          <motion.div
            key="correct"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="headline"
            style={{ color: 'var(--mint)' }}
          >
            {gainedBounceBack ? 'Bounce-back bonus! 💪' : 'Nice! ✨'}
          </motion.div>
        )}
        {feedback === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="subtext"
          >
            <div style={{ color: 'var(--lav)', fontWeight: 700 }}>
              Here's how it works:
            </div>
            <div style={{ marginTop: 6, fontSize: 20, color: 'var(--ink)' }}>
              {problem.worked}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area (hidden once resolved). */}
      {!locked &&
        (problem.inputMode === 'numeric' ? (
          <NumberPad
            value={entry}
            onChange={setEntry}
            onSubmit={submitNumeric}
            disabled={locked}
          />
        ) : (
          <ChoiceGrid choices={problem.choices ?? []} onPick={onAnswer} disabled={locked} />
        ))}

      {feedback === 'revealed' && (
        <button className="btn btn--mint btn--wide" onClick={onNext}>
          Got it — keep going →
        </button>
      )}
    </div>
  );
}
