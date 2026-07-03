/**
 * Large multiple-choice buttons for pattern & estimation problems. One tap =
 * one answer; big targets, generous spacing, no clutter.
 */
export function ChoiceGrid({
  choices,
  onPick,
  disabled,
}: {
  choices: number[];
  onPick: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        width: '100%',
      }}
    >
      {choices.map((c) => (
        <button
          key={c}
          className="choice"
          onClick={() => onPick(c)}
          disabled={disabled}
        >
          {c.toLocaleString()}
        </button>
      ))}
    </div>
  );
}
