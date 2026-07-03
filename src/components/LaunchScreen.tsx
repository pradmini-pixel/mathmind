import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

/**
 * Step 5 — Launch. The satisfying "YOU'RE READY 🚀" moment: confetti, today's
 * streak flame, effort points earned. The app DELIBERATELY ends here — success
 * is the child closing it and starting real math work, not more screen time.
 */
export function LaunchScreen({
  streak,
  effortPoints,
  onClose,
}: {
  streak: number;
  effortPoints: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.6 },
        particleCount: Math.floor(180 * particleRatio),
        colors: ['#ff7a6b', '#ffd15c', '#67e0b0', '#b79cff'],
        ...opts,
      });
    };
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.35, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  }, []);

  return (
    <div className="screen">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        style={{ fontSize: 72 }}
      >
        🚀
      </motion.div>
      <h1 className="headline" style={{ fontSize: 34 }}>
        YOU'RE READY
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div className="stat-pill">
          <span style={{ fontSize: 30 }}>🔥</span>
          <span>{streak}-day streak</span>
        </div>
        <div className="stat-pill">
          <span style={{ fontSize: 30 }}>⚡</span>
          <span>+{effortPoints} effort</span>
        </div>
      </div>

      <p className="subtext">Now go crush your math practice.</p>

      <button className="btn btn--wide" onClick={onClose}>
        Done 👋
      </button>
    </div>
  );
}
