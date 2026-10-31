import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import {
  easingToCss,
  evaluateEasing,
  parseEasing,
  validateEasing,
  type CubicBezier,
} from './engine.js';

export * from './engine.js';

export interface EasingEditorProps {
  value: CubicBezier;
  onChange: (value: CubicBezier) => void;
  disabled?: boolean;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function EasingEditor({
  value,
  onChange,
  disabled = false,
  duration = 1000,
  className = '',
  style,
  'aria-label': label = 'Easing editor',
}: EasingEditorProps) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<1 | 2 | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [draft, setDraft] = useState('');
  const [parseError, setParseError] = useState('');
  const errors = validateEasing(value);
  const validDuration = Number.isFinite(duration) && duration > 0 && duration <= 600000;
  useEffect(() => {
    if (!playing || disabled || !validDuration || errors.length) return;
    let frame = 0;
    let start: number | undefined;
    const tick = (time: number) => {
      start ??= time;
      const next = Math.min(1, (time - start) / duration);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, disabled, duration, validDuration, errors.length]);
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (drag.current === null || disabled) return;
    const rect = svg.current!.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(
      0,
      Math.min(1, (((event.clientX - rect.left) / rect.width) * 300 - 30) / 240),
    );
    const y = Math.max(
      -4,
      Math.min(4, (270 - ((event.clientY - rect.top) / rect.height) * 300) / 240),
    );
    onChange({ ...value, [`x${drag.current}`]: x, [`y${drag.current}`]: y });
  };
  const stop = () => {
    drag.current = null;
  };
  const handle = (index: 1 | 2) => (
    <circle
      cx={30 + value[`x${index}`] * 240}
      cy={270 - value[`y${index}`] * 240}
      r={8}
      role="button"
      aria-label={`Control point ${index}`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(event) => {
        if (disabled) return;
        drag.current = index;
        event.currentTarget.ownerSVGElement?.setPointerCapture?.(event.pointerId);
      }}
      onKeyDown={(event) => {
        if (disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
          return;
        event.preventDefault();
        const key: keyof CubicBezier =
          event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? `x${index}` : `y${index}`;
        const delta =
          (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1) *
          (event.shiftKey ? 0.1 : 0.01);
        onChange({
          ...value,
          [key]: Math.max(
            key.startsWith('x') ? 0 : -4,
            Math.min(key.startsWith('x') ? 1 : 4, Number((value[key] + delta).toFixed(4))),
          ),
        });
      }}
    />
  );
  return (
    <section className={`lpe-editor ${className}`} style={style} aria-label={label}>
      <p>
        Drag handles or use arrow keys (Shift: larger steps). Numeric inputs also support off-chart
        overshoot.
      </p>
      <svg
        ref={svg}
        viewBox="0 0 300 300"
        aria-label="Bezier graph"
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
      >
        <path className="lpe-axis" d="M30 30 V270 H270" />
        <path
          className="lpe-guide"
          d={`M30 270 L${30 + value.x1 * 240} ${270 - value.y1 * 240} M270 30 L${30 + value.x2 * 240} ${270 - value.y2 * 240}`}
        />
        <path
          className="lpe-curve"
          d={`M30 270 C${30 + value.x1 * 240} ${270 - value.y1 * 240}, ${30 + value.x2 * 240} ${270 - value.y2 * 240}, 270 30`}
        />
        {handle(1)}
        {handle(2)}
      </svg>
      <fieldset disabled={disabled}>
        <legend>Control coordinates</legend>
        {(['x1', 'y1', 'x2', 'y2'] as const).map((key) => (
          <label key={key}>
            {key}
            <input
              type="number"
              step="0.01"
              min={key.startsWith('x') ? 0 : -4}
              max={key.startsWith('x') ? 1 : 4}
              value={value[key]}
              onChange={(event) => {
                if (Number.isFinite(event.target.valueAsNumber))
                  onChange({ ...value, [key]: event.target.valueAsNumber });
              }}
            />
          </label>
        ))}
        <label>
          CSS to import
          <input value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>
        <button
          type="button"
          onClick={() => {
            try {
              onChange(parseEasing(draft));
              setParseError('');
            } catch (error) {
              setParseError((error as Error).message);
            }
          }}
        >
          Apply CSS
        </button>
      </fieldset>
      <button
        type="button"
        disabled={disabled || errors.length > 0 || !validDuration}
        onClick={() => {
          setProgress(0);
          setPlaying(false);
        }}
      >
        Reset preview
      </button>
      <button
        type="button"
        disabled={disabled || playing || errors.length > 0 || !validDuration}
        onClick={() => {
          setProgress(0);
          setPlaying(true);
        }}
      >
        Play preview
      </button>
      <div className="lpe-track" aria-label="Easing preview">
        <span style={{ left: `${errors.length ? 0 : evaluateEasing(value, progress) * 100}%` }} />
      </div>
      <label>
        CSS export
        <input readOnly value={errors.length ? '' : easingToCss(value)} />
      </label>
      {(errors.length > 0 || parseError || !validDuration) && (
        <p role="alert">
          {errors.join(' ')} {parseError}{' '}
          {!validDuration && 'Duration must be > 0 and <= 600000 ms.'}
        </p>
      )}
    </section>
  );
}
