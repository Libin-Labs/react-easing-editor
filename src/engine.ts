export interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function createEasing(): CubicBezier {
  return { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };
}

export function validateEasing(value: CubicBezier): string[] {
  const errors: string[] = [];
  for (const key of ['x1', 'x2', 'y1', 'y2'] as const) {
    const min = key.startsWith('x') ? 0 : -4;
    const max = key.startsWith('x') ? 1 : 4;
    if (!Number.isFinite(value[key]) || value[key] < min || value[key] > max)
      errors.push(`${key} must be ${min} to ${max}.`);
  }
  return errors;
}

export function easingToCss(value: CubicBezier): string {
  const errors = validateEasing(value);
  if (errors.length) throw new RangeError(errors.join(' '));
  return `cubic-bezier(${value.x1}, ${value.y1}, ${value.x2}, ${value.y2})`;
}

export function parseEasing(css: string): CubicBezier {
  const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?';
  const expression = new RegExp(
    `^cubic-bezier\\(\\s*(${number})\\s*,\\s*(${number})\\s*,\\s*(${number})\\s*,\\s*(${number})\\s*\\)$`,
    'i',
  );
  const match = expression.exec(css.trim());
  if (!match) throw new SyntaxError('Expected cubic-bezier(x1, y1, x2, y2).');
  const [x1, y1, x2, y2] = match.slice(1).map(Number);
  const value = { x1, y1, x2, y2 };
  easingToCss(value);
  return value;
}

export function evaluateEasing(value: CubicBezier, progress: number): number {
  easingToCss(value);
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    throw new RangeError('Progress must be in [0,1].');
  if (progress === 0 || progress === 1) return progress;
  const coordinate = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    if (coordinate(mid, value.x1, value.x2) < progress) low = mid;
    else high = mid;
  }
  return coordinate((low + high) / 2, value.y1, value.y2);
}
