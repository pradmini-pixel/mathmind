import { useState } from 'react';
import { motion } from 'framer-motion';
import type { FocusGame as FocusGameData } from '../content/focusGames';

/**
 * Step 4 — Focus Finisher. A short, non-math sustained-attention game that ends
 * the session on PLAY. Like the warm-up, it can't fail: a wrong tap just says
 * "Look again!" and lets the child keep trying until they succeed.
 */
export function FocusGame({
  game,
  onDone,
}: {
  game: FocusGameData;
  onDone: () => void;
}) {
  const [solved, setSolved] = useState(false);
  const [nudge, setNudge] = useState(false);

  const win = () => {
    setSolved(true);
    setTimeout(onDone, 1100);
  };
  const miss = () => {
    setNudge(true);
    setTimeout(() => setNudge(false), 900);
  };

  const cols = game.cells.length <= 9 ? 3 : 4;

  return (
    <div className="screen">
      <div className="step-label">Focus Finisher</div>
      <p className="headline">{game.prompt}</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12,
          width: '100%',
        }}
      >
        {game.cells.map((cell) => (
          <motion.button
            key={cell.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (solved) return;
              if (game.kind === 'odd-one-out') {
                cell.id === game.answerId ? win() : miss();
              }
            }}
            disabled={game.kind !== 'odd-one-out'}
            className="focus-cell"
          >
            {cell.emoji}
          </motion.button>
        ))}
      </div>

      {game.kind === 'count-target' && !solved && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            width: '100%',
          }}
        >
          {game.choices.map((c) => (
            <button
              key={c}
              className="choice"
              onClick={() => (c === game.answer ? win() : miss())}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {nudge && (
        <p className="subtext" style={{ color: 'var(--sunshine)' }}>
          Look again! 👀
        </p>
      )}
      {solved && (
        <p className="headline" style={{ color: 'var(--mint)' }}>
          Sharp eyes! 🎯
        </p>
      )}
    </div>
  );
}
