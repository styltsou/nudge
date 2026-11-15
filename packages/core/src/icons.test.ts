import { afterAll, beforeAll, expect, it } from 'bun:test';
import { installDom } from '../../../tests/helpers/dom';
import { iconButton, submitOnEnter } from './icons';

let restoreDom: () => void;
beforeAll(() => {
  restoreDom = installDom();
});
afterAll(() => restoreDom());

it('Enter submits; Shift+Enter and IME composition keep a new line', () => {
  const input = document.createElement('textarea');
  let submitted = 0;
  submitOnEnter(input, () => submitted++);
  const press = (init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
      ...init,
    });
    input.dispatchEvent(event);
    return event.defaultPrevented;
  };
  expect(press({})).toBe(true);
  expect(submitted).toBe(1);
  expect(press({ shiftKey: true })).toBe(false);
  expect(press({ isComposing: true })).toBe(false);
  expect(submitted).toBe(1);
});

it('icon buttons keep an accessible name and a styled tooltip', () => {
  const button = iconButton('<svg></svg>', 'Run agent', () => {}, 'primary');
  expect(button.getAttribute('aria-label')).toBe('Run agent');
  expect(button.dataset.tip).toBe('Run agent');
  expect(button.className).toBe('icon primary');
  expect(button.title).toBe('');
});
