import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import {
  EasingEditor,
  createEasing,
  easingToCss,
  evaluateEasing,
  parseEasing,
  validateEasing,
} from '../dist/esm/index.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const frames = new Map();
let sequence = 0;
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: (callback) => {
    frames.set(++sequence, callback);
    return sequence;
  },
  cancelAnimationFrame: (id) => frames.delete(id),
});
const { createRoot } = await import('react-dom/client');
after(() => dom.window.close());

test('defaults, parse/export roundtrip, evaluation and overshoot', () => {
  const value = createEasing();
  assert.deepEqual(validateEasing(value), []);
  assert.deepEqual(parseEasing(easingToCss(value)), value);
  assert.equal(evaluateEasing(value, 0), 0);
  assert.equal(evaluateEasing(value, 1), 1);
  assert.ok(Math.abs(evaluateEasing({ x1: 0, y1: 0, x2: 1, y2: 1 }, 0.4) - 0.4) < 1e-10);
  assert.ok(evaluateEasing({ x1: 0.2, y1: 3, x2: 0.8, y2: 3 }, 0.5) > 1);
  value.x1 = 0;
  assert.equal(createEasing().x1, 0.25);
});

test('invalid x, finite bounds, progress and CSS injection fail', () => {
  for (const patch of [{ x1: -0.01 }, { x2: 1.1 }, { y1: -5 }, { y2: Infinity }]) {
    assert.throws(() => easingToCss({ ...createEasing(), ...patch }), RangeError);
  }
  assert.throws(() => parseEasing('linear'), SyntaxError);
  assert.throws(() => parseEasing('cubic-bezier(--1,0,1,1)'), SyntaxError);
  assert.throws(() => parseEasing('cubic-bezier(.,0,1,1)'), SyntaxError);
  assert.deepEqual(parseEasing('CUBIC-BEZIER(0, +.2, 1, -1E-1)'), {
    x1: 0,
    y1: 0.2,
    x2: 1,
    y2: -0.1,
  });
  assert.throws(() => parseEasing('cubic-bezier(0,0,1,1); color:red'), SyntaxError);
  assert.throws(() => parseEasing('cubic-bezier(2,0,1,1)'), RangeError);
  assert.throws(() => evaluateEasing(createEasing(), NaN), RangeError);
  assert.throws(() => evaluateEasing(createEasing(), 2), RangeError);
});

test('keyboard handles clamp x, pointer drag edits, and playback cleans up', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let value = createEasing();
  const render = (disabled = false) =>
    root.render(
      React.createElement(EasingEditor, {
        value,
        disabled,
        onChange: (next) => {
          value = next;
          render();
        },
      }),
    );
  await act(() => render());
  const handle = host.querySelector('[aria-label="Control point 1"]');
  await act(() =>
    handle.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    ),
  );
  assert.equal(value.x1, 0.26);
  const svg = host.querySelector('svg');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 300 });
  await act(() => {
    handle.dispatchEvent(
      new dom.window.MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 100 }),
    );
    svg.dispatchEvent(
      new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: 900, clientY: 150 }),
    );
    svg.dispatchEvent(new dom.window.MouseEvent('pointerup', { bubbles: true }));
  });
  assert.equal(value.x1, 1);
  assert.equal(value.y1, 0.5);
  const play = [...host.querySelectorAll('button')].find(
    (node) => node.textContent === 'Play preview',
  );
  await act(() => play.click());
  assert.equal(frames.size, 1);
  const [id, callback] = [...frames][0];
  frames.delete(id);
  await act(() => callback(0));
  assert.equal(frames.size, 1);
  await act(() => render(true));
  assert.equal(frames.size, 0);
  await act(() => root.unmount());
  assert.equal(frames.size, 0);
  host.remove();
});
