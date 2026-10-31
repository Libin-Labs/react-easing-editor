# @lp-labs/react-easing-editor

An original controlled cubic Bezier editor with pointer and keyboard handles,
numeric controls, a timed preview, and CSS validation. React 18.2 or 19 is its
only runtime peer. There are no runtime dependencies or sibling package imports.

## Use

```sh
npm install @lp-labs/react-easing-editor react react-dom
```

```tsx
import { useState } from "react";
import {
  EasingEditor,
  createEasing,
  easingToCss,
  validateEasing,
} from "@lp-labs/react-easing-editor";
import "@lp-labs/react-easing-editor/styles.css";

export default function App() {
  const [value, setValue] = useState(createEasing);
  const valid = validateEasing(value).length === 0;
  return (
    <>
      <EasingEditor value={value} onChange={setValue} duration={1200} />
      <div style={{ transitionTimingFunction: valid ? easingToCss(value) : "linear" }}>
        Your preview
      </div>
    </>
  );
}
```

This example belongs in a React application with CSS imports enabled.
Both ESM and CommonJS expose the named API. CSS is separately imported from
`@lp-labs/react-easing-editor/styles.css`. Module import is safe without a DOM.

## Component and types

`EasingEditor(props: EasingEditorProps)` requires `value: CubicBezier` and
`onChange(next: CubicBezier): void`. Persist the emitted next value; there is no
uncontrolled mode and incoming objects are not mutated.

Exported `CubicBezier` is `{ x1: number; y1: number; x2: number; y2: number }`.
All coordinates must be finite. X coordinates are constrained to [0,1] so the
curve is a valid CSS timing function. This editor deliberately bounds Y to
[-4,4], a subset of CSS's unrestricted finite Y range.

Exported `EasingEditorProps` also includes:

| Optional prop | Default | Behavior |
| --- | --- | --- |
| `disabled?: boolean` | `false` | Prevents editing and stops scheduling preview frames |
| `duration?: number` | `1000` | Preview milliseconds, finite > 0 and <= 600000 |
| `className?: string` | `""` | Additional root class |
| `style?: React.CSSProperties` | absent | Root styles |
| `"aria-label"?: string` | `"Easing editor"` | Accessible root label |

## All runtime exports

* `EasingEditor`: the component above.
* `createEasing(): CubicBezier`: fresh `{ x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 }`.
* `validateEasing(value: CubicBezier): string[]`: returns field constraint errors,
  or `[]`; expects a structurally typed object, not arbitrary unknown JSON.
* `easingToCss(value: CubicBezier): string`: returns
  `cubic-bezier(x1, y1, x2, y2)` without rounding. Throws `RangeError` for
  nonfinite or out-of-range coordinates.
* `parseEasing(css: string): CubicBezier`: trims the string and accepts only a
  whole, case-insensitive `cubic-bezier(...)` with four comma-separated numeric
  coordinates, including exponent notation. Throws `SyntaxError` for unsupported
  syntax, and `RangeError` for coordinates outside this editor's bounds.
  Keywords, steps, CSS variables and trailing declarations are not supported.
* `evaluateEasing(value: CubicBezier, progress: number): number`: validates and
  solves the X coordinate by 50 bisection steps, then returns the corresponding
  Y. Progress must be finite and in [0,1], otherwise `RangeError` is thrown.
  Endpoints return exactly 0 and 1. Y may overshoot [0,1]; it is not clamped.

The exported types are only `CubicBezier` and `EasingEditorProps`. No default
export, constants, or custom error classes are exported.

## Interaction, lifecycle and limits

Drag a handle with pointer capture. Arrow Left/Right changes X and Up/Down
changes Y by 0.01; Shift uses 0.1. Keyboard and drag edits clamp coordinates to
the supported bounds. Numeric inputs emit finite intermediate values; invalid
ones are announced and disable export and preview. CSS import has an explicit
Apply CSS button; parse errors are announced without replacing the controlled
value. Export is a read-only input for selection/copy, not a download.

The graph shows coordinates 0-1; overshoot handles can leave the chart, so use
numeric fields or keyboard to edit them. Preview uses `requestAnimationFrame`,
cleans up on unmount or disable, and does not start automatically. Reset preview
returns to progress 0. Play is disabled during an active run; reset before
restarting. Duration affects preview only, not the exported curve.
Changing value updates the current preview curve. There is no spring physics,
multi-segment spline, general CSS parser, or CSS keyword expansion.

## Customization and accessibility

Styles are scoped to `.lpe-editor`; customize `--lpe-accent`, root `style`,
or `className`. Handles are focusable named buttons with keyboard support;
equivalent labeled number inputs cover precision edits and off-chart handles.
Native buttons and visible focus outlines support keyboard use; errors use
`role="alert"`. The stylesheet hides preview movement for
`prefers-reduced-motion` without changing the saved curve. Choose accessible
contrast when overriding colors. No production certification is claimed.

[cubic-bezier](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/cubic-bezier) |

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
