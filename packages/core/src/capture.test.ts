import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { installDom } from '../../../tests/helpers/dom';
import { checkCapture } from './capture';

let restore: () => void;
beforeAll(() => {
  restore = installDom();
});
afterAll(() => restore());
describe('capture privacy preflight', () => {
  beforeEach(() => document.body.replaceChildren());
  function element(tag = 'div') {
    const target = document.createElement(tag);
    target.getBoundingClientRect = () =>
      ({ width: 100, height: 100 }) as DOMRect;
    document.body.append(target);
    return target;
  }
  it('refuses private roots, form values, detached nodes and oversized regions before rendering', () => {
    for (const tag of ['input', 'textarea', 'select', 'iframe'])
      expect(() => checkCapture(element(tag))).toThrow();
    const privateRoot = element();
    privateRoot.setAttribute('data-nudge-private', '');
    expect(() => checkCapture(privateRoot)).toThrow();
    const detached = element();
    detached.remove();
    expect(() => checkCapture(detached)).toThrow();
    const huge = element();
    huge.getBoundingClientRect = () => ({ width: 2049, height: 20 }) as DOMRect;
    expect(() => checkCapture(huge)).toThrow();
  });
  it('refuses external and responsive image resources before the image library can fetch them', () => {
    const target = element('img');
    target.setAttribute('src', 'https://example.invalid/private.png');
    expect(() => checkCapture(target)).toThrow();
    const responsive = element('img');
    responsive.setAttribute('srcset', '/image.png 2x');
    expect(() => checkCapture(responsive)).toThrow();
  });
});
