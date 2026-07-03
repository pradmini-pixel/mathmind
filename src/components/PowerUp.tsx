import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Step 2 — Power-Up. One growth-mindset affirmation the child taps to "charge
 * up". Process-oriented statements only (effort/strategy), never ability praise.
 * The tap + charge animation makes the message feel earned, not preachy.
 */
export function PowerUp({
  affirmation,
  onCharged,
}: {
  affirmation: string;
  onCharged: () => void;
}) {
  const [charged, setCharged] = useState(false);

  const handleCharge = () => {
    if (charged) return;
    setCharged(true);
    // Let the charge animation play, then move on automatically.
    setTimeout(onCharged, 1100);
  };

  return (
    <div className="screen">
      <div className="step-label">Power-Up</div>
      <p className="subtext">Tap it to charge it up.</p>
      <motion.button
        onClick={handleCharge}
        aria-label={`Charge up: ${affirmation}`}
        animate={
          charged
            ? { scale: [1, 1.12, 1], boxShadow: '0 0 70px rgba(103,224,176,0.6)' }
            : { scale: 1 }
        }
        transition={{ duration: 0.7 }}
        style={{
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 28px',
          width: '100%',
          background: charged
            ? 'linear-gradient(135deg, var(--mint), var(--lav))'
            : 'var(--surface)',
          color: charged ? '#0c2c22' : 'var(--ink)',
          fontSize: 26,
          fontWeight: 800,
          lineHeight: 1.25,
          cursor: charged ? 'default' : 'pointer',
        }}
      >
        {charged ? '⚡ ' : ''}
        {affirmation}
      </motion.button>
      {charged && <p className="subtext">Charged! ⚡</p>}
    </div>
  );
}
