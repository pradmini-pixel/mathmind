import { useEffect } from 'react';

/**
 * Large on-screen number pad for numeric problems. Also supports physical
 * keyboard input (digits, Backspace, Enter). Big 48px+ targets, no tiny UI.
 */
export function NumberPad({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key >= '0' && e.key <= '9') onChange((value + e.key).slice(0, 6));
      else if (e.key === 'Backspace') onChange(value.slice(0, -1));
      else if (e.key === 'Enter' && value.length > 0) onSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange, onSubmit, disabled]);

  const press = (digit: string) => {
    if (disabled) return;
    onChange((value + digit).slice(0, 6));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div style={{ width: '100%' }}>
      <div
        aria-live="polite"
        style={{
          minHeight: 72,
          borderRadius: 'var(--radius)',
          background: 'var(--bg-2)',
          fontSize: 44,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          letterSpacing: '0.04em',
        }}
      >
        {value === '' ? <span className="text-muted">—</span> : value}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {keys.map((k) => (
          <button key={k} className="pad-key" onClick={() => press(k)} disabled={disabled}>
            {k}
          </button>
        ))}
        <button
          className="pad-key pad-key--soft"
          onClick={() => onChange(value.slice(0, -1))}
          disabled={disabled}
          aria-label="Delete"
        >
          ⌫
        </button>
        <button className="pad-key" onClick={() => press('0')} disabled={disabled}>
          0
        </button>
        <button
          className="pad-key pad-key--go"
          onClick={onSubmit}
          disabled={disabled || value.length === 0}
          aria-label="Check answer"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
