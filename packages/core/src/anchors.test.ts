import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { installDom } from '../../../tests/helpers/dom';
import {
  anchorFor,
  findAnchor,
  locateAnchor,
  selectorFor,
  textPreview,
} from './anchors';

let restoreDom: () => void;
beforeAll(() => {
  restoreDom = installDom();
});
afterAll(() => restoreDom());

describe('safe element context', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    window.history.replaceState(null, '', '/');
  });
  it('prefers test IDs over IDs and escapes selector metacharacters', () => {
    const element = document.createElement('div');
    element.id = 'stable-chart';
    element.dataset.testid = 'chart"[]';
    document.body.append(element);
    const selector = selectorFor(element)!;
    expect(document.querySelector(selector)).toBe(element);
    expect(selector.startsWith('[data-testid=')).toBe(true);
    delete element.dataset.testid;
    expect(selectorFor(element)).toBe('[id="stable-chart"]');
  });
  it('excludes form content, private/hidden text and scrubs visible emails and token-like text', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<span>Safe title</span><input value="input-secret"><textarea>text-secret</textarea><div hidden>hidden-secret</div><span style="display:none">css-secret</span><div data-nudge-private>private-secret</div><div contenteditable>editing-secret</div><span>a@example.com sk_abcdefghijklmnopqrstuvwxyz</span>';
    document.body.append(root);
    const preview = textPreview(root);
    expect(preview).toContain('Safe title');
    expect(preview).not.toContain('-secret');
    expect(preview).not.toContain('a@example.com');
    expect(preview).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(textPreview(root.querySelector('textarea')!)).toBe('');
    expect(JSON.stringify(anchorFor(root))).not.toContain('-secret');
  });
  it('strips URL credentials, query and hash and bounds text', () => {
    window.history.replaceState(null, '', '/?token=secret#secret');
    const element = document.createElement('div');
    element.textContent = 'a'.repeat(500);
    document.body.append(element);
    const anchor = anchorFor(element);
    expect(anchor.pageUrl).not.toContain('secret');
    expect(anchor.textPreview).toHaveLength(160);
  });
  it('does not guess when stable anchors are missing, ambiguous, invalid or on another page', () => {
    const element = document.createElement('div');
    element.dataset.testid = 'chart';
    document.body.append(element);
    const anchor = anchorFor(element);
    expect(findAnchor(anchor).state).toBe('found');
    document.body.append(element.cloneNode());
    expect(findAnchor(anchor).state).toBe('ambiguous');
    document.body.replaceChildren();
    expect(findAnchor(anchor).state).toBe('missing');
    const { testId: _testId, ...withoutTestId } = anchor;
    expect(findAnchor({ ...withoutTestId, selector: '???' }).state).toBe(
      'missing',
    );
    expect(
      findAnchor({ ...anchor, pageUrl: 'http://localhost/another' }).state,
    ).toBe('missing');
  });
  it('retains positional paths as context without claiming a confident recapture match', () => {
    const element = document.createElement('div');
    element.textContent = 'Chart';
    document.body.append(element);
    const anchor = anchorFor(element);
    expect(anchor.selector).not.toBeNull();
    expect(findAnchor(anchor).state).toBe('missing');
  });
  it('locates pins by unique position and matching text after a re-render, never for comparison', () => {
    document.body.innerHTML =
      '<main><button>Save</button><button>Cancel</button></main>';
    const anchor = anchorFor(document.querySelectorAll('button')[1]!);
    // Simulate a framework re-render: same structure, new nodes.
    document.body.innerHTML =
      '<main><button>Save</button><button>Cancel</button></main>';
    const again = document.querySelectorAll('button')[1]!;
    expect(locateAnchor(anchor)).toBe(again);
    expect(findAnchor(anchor).state).toBe('missing');
    again.textContent = 'Delete everything';
    expect(locateAnchor(anchor)).toBeNull();
    expect(
      locateAnchor({ ...anchor, pageUrl: 'http://localhost/another' }),
    ).toBeNull();
  });
});
