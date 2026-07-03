import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Step 1 — Arrive. A friendly shape slowly expands ("breathe in") and contracts
 * ("breathe out") for a few cycles. Kept SHORT (10-year-olds won't sit through a
 * long meditation) and skippable after the first breath so it never feels like a
 * gate. A brief mindful moment measurably improves attention in children.
 */
const CYCLES = 3;
const IN_MS = 4000;
const OUT_MS = 4000;
const CYCLE_MS = IN_MS + OUT_MS;

export function BreathingExercise({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [cycle, setCycle] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    // Toggle in/out every half-cycle; count completed cycles.
    const half = setInterval(() => {
      setPhase((p) => (p === 'in' ? 'out' : 'in'));
    }, IN_MS);
    const skipTimer = setTimeout(() => setCanSkip(true), CYCLE_MS);
    const full = setInterval(() => setCycle((c) => c + 1), CYCLE_MS);
    return () => {
      clearInterval(half);
      clearInterval(full);
      clearTimeout(skipTimer);
    };
  }, []);

  useEffect(() => {
    if (cycle >= CYCLES) onDone();
  }, [cycle, onDone]);

  return (
    <div className="screen">
      <div className="step-label">Settle in</div>
      <motion.div
        aria-hidden
        animate={{
          scale: phase === 'in' ? 1 : 0.55,
          opacity: phase === 'in' ? 1 : 0.75,
        }}
        transition={{ duration: IN_MS / 1000, ease: 'easeInOut' }}
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 40% 35%, var(--sunshine), var(--coral))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 56,
          boxShadow: '0 0 60px rgba(255, 209, 92, 0.35)',
        }}
      >
        ⭐
      </motion.div>
      <p className="headline">
        {phase === 'in' ? 'Breathe in…' : 'Breathe out…'}
      </p>
      <p className="subtext">Watch the star grow and shrink.</p>
      {canSkip && (
        <button className="btn btn--soft" onClick={onDone}>
          I'm ready →
        </button>
      )}
    </div>
  );
}
