/**
 * Web component tests.
 * Vitest runs with happy-dom which provides a minimal DOM environment.
 * We import the component module so the custom element gets registered.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../src/md-diff.js';

function createElement(attrs = {}) {
  const el = document.createElement('md-diff');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

function cleanup(el) {
  el?.parentNode?.removeChild(el);
}

// ── Registration ──────────────────────────────────────────────────────────────

describe('custom element registration', () => {
  it('is defined as a custom element', () => {
    expect(customElements.get('md-diff')).toBeDefined();
  });

  it('creates an instance with a shadow root', () => {
    const el = createElement();
    expect(el.shadowRoot).toBeTruthy();
    cleanup(el);
  });
});

// ── Attribute API ─────────────────────────────────────────────────────────────

describe('attributes', () => {
  it('accepts left-content and right-content attributes', () => {
    const el = createElement({
      'left-content':  '# Hello\n',
      'right-content': '# World\n',
    });
    expect(el.leftContent).toBe('# Hello\n');
    expect(el.rightContent).toBe('# World\n');
    cleanup(el);
  });

  it('defaults show-textareas to true', () => {
    const el = createElement();
    const textareas = el.shadowRoot.querySelector('.textareas');
    expect(textareas.classList.contains('hidden')).toBe(false);
    cleanup(el);
  });

  it('hides textareas when show-textareas="false"', () => {
    const el = createElement({ 'show-textareas': 'false' });
    const textareas = el.shadowRoot.querySelector('.textareas');
    expect(textareas.classList.contains('hidden')).toBe(true);
    cleanup(el);
  });

  it('uses custom labels', () => {
    const el = createElement({ 'left-label': 'Before', 'right-label': 'After' });
    const labels = el.shadowRoot.querySelectorAll('.ta-label');
    expect(labels[0].textContent).toBe('Before');
    expect(labels[1].textContent).toBe('After');
    cleanup(el);
  });
});

// ── JS property API ───────────────────────────────────────────────────────────

describe('JS property setters', () => {
  it('setting leftContent updates the textarea value', () => {
    const el = createElement();
    el.leftContent = 'foo\n';
    const ta = el.shadowRoot.querySelector('.left-textarea');
    expect(ta.value).toBe('foo\n');
    cleanup(el);
  });

  it('setting rightContent updates the textarea value', () => {
    const el = createElement();
    el.rightContent = 'bar\n';
    const ta = el.shadowRoot.querySelector('.right-textarea');
    expect(ta.value).toBe('bar\n');
    cleanup(el);
  });

  it('getters reflect last set value', () => {
    const el = createElement();
    el.leftContent  = 'left\n';
    el.rightContent = 'right\n';
    expect(el.leftContent).toBe('left\n');
    expect(el.rightContent).toBe('right\n');
    cleanup(el);
  });

  it('treats null/undefined as empty string for leftContent', () => {
    const el = createElement({ 'left-content': 'something\n' });
    el.leftContent = null;
    expect(el.leftContent).toBe('');
    cleanup(el);
  });

  it('treats null/undefined as empty string for rightContent', () => {
    const el = createElement({ 'right-content': 'something\n' });
    el.rightContent = null;
    expect(el.rightContent).toBe('');
    cleanup(el);
  });

  it('syncing textarea to same value is a no-op', () => {
    const el = createElement();
    el.leftContent = 'test\n';
    const ta = el.shadowRoot.querySelector('.left-textarea');
    expect(ta.value).toBe('test\n');
    el.leftContent = 'test\n';
    expect(ta.value).toBe('test\n');
    cleanup(el);
  });
});

// ── Diff rendering ────────────────────────────────────────────────────────────

describe('diff rendering', () => {
  let el;
  beforeEach(() => {
    el = createElement({
      'left-content':  '# Title\nOriginal line\nShared\n',
      'right-content': '# Title\nModified line\nShared\n',
    });
  });

  it('renders diff-cell elements', () => {
    const cells = el.shadowRoot.querySelectorAll('.diff-cell');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders a deletion cell in the left column', () => {
    const deletions = el.shadowRoot.querySelectorAll('.lcell.deletion');
    expect(deletions.length).toBeGreaterThan(0);
  });

  it('renders an insertion cell in the right column', () => {
    const insertions = el.shadowRoot.querySelectorAll('.rcell.insertion');
    expect(insertions.length).toBeGreaterThan(0);
  });

  it('left and right column have equal cell counts', () => {
    const leftCells  = el.shadowRoot.querySelectorAll('.lcell');
    const rightCells = el.shadowRoot.querySelectorAll('.rcell');
    expect(leftCells.length).toBe(rightCells.length);
  });

  it('renders line numbers for non-empty rows', () => {
    const gutters = el.shadowRoot.querySelectorAll('.diff-gutter');
    const withNum = [...gutters].filter(g => g.textContent.trim() !== '');
    expect(withNum.length).toBeGreaterThan(0);
  });

  it('does not render a line number in the gutter beside a placeholder cell', () => {
    // Each grid row is 4 sibling spans; empty lcell is preceded by its lnum gutter
    const emptyCells = el.shadowRoot.querySelectorAll('.lcell.empty');
    for (const cell of emptyCells) {
      const gutter = cell.previousElementSibling;
      expect(gutter.textContent.trim()).toBe('');
    }
  });

  afterEach(() => cleanup(el));
});

// ── Dynamic updates ───────────────────────────────────────────────────────────

describe('dynamic content updates', () => {
  it('re-renders when leftContent property changes', () => {
    const el = createElement({
      'left-content':  'aaa\n',
      'right-content': 'bbb\n',
    });
    const before = el.shadowRoot.querySelector('.diff-table').innerHTML;
    el.leftContent = 'xxx\n';
    const after = el.shadowRoot.querySelector('.diff-table').innerHTML;
    expect(after).not.toBe(before);
    cleanup(el);
  });

  it('re-renders when left-content attribute changes', () => {
    const el = createElement({
      'left-content':  'aaa\n',
      'right-content': 'bbb\n',
    });
    const before = el.shadowRoot.querySelector('.diff-table').innerHTML;
    el.setAttribute('left-content', 'yyy\n');
    const after = el.shadowRoot.querySelector('.diff-table').innerHTML;
    expect(after).not.toBe(before);
    cleanup(el);
  });
});

// ── UTF-8 ─────────────────────────────────────────────────────────────────────

describe('UTF-8 support', () => {
  it('renders multibyte characters without corruption', () => {
    const el = createElement({
      'left-content':  'Héllo Wörld\n',
      'right-content': 'Héllo Wörld!\n',
    });
    const table = el.shadowRoot.querySelector('.diff-table');
    expect(table.textContent).toContain('Héllo');
    cleanup(el);
  });

  it('renders CJK characters', () => {
    const el = createElement({
      'left-content':  '你好世界\n',
      'right-content': '你好地球\n',
    });
    const table = el.shadowRoot.querySelector('.diff-table');
    expect(table.textContent).toContain('你好');
    cleanup(el);
  });

  it('renders emoji without crashing', () => {
    const el = createElement({
      'left-content':  'Hello 🌍\n',
      'right-content': 'Hello 🌎\n',
    });
    const table = el.shadowRoot.querySelector('.diff-table');
    expect(table.textContent).toContain('Hello');
    cleanup(el);
  });
});

// ── Block markdown rendering ──────────────────────────────────────────────────

describe('block markdown rendering', () => {
  it('renders a heading line as an <h1>', () => {
    const el = createElement({
      'left-content':  '# Hello\n',
      'right-content': '# Hello\n',
    });
    const h1 = el.shadowRoot.querySelector('.diff-cell h1');
    expect(h1).toBeTruthy();
    cleanup(el);
  });

  it('renders bold text as <strong>', () => {
    const el = createElement({
      'left-content':  '**bold**\n',
      'right-content': '**bold**\n',
    });
    const strong = el.shadowRoot.querySelector('.diff-cell strong');
    expect(strong).toBeTruthy();
    cleanup(el);
  });

  it('renders inline code as <code>', () => {
    const el = createElement({
      'left-content':  '`code`\n',
      'right-content': '`code`\n',
    });
    const code = el.shadowRoot.querySelector('.diff-cell code');
    expect(code).toBeTruthy();
    cleanup(el);
  });

  it('renders a list item as a <li>', () => {
    const el = createElement({
      'left-content':  '- item\n',
      'right-content': '- item\n',
    });
    const li = el.shadowRoot.querySelector('.diff-cell li');
    expect(li).toBeTruthy();
    cleanup(el);
  });
});

// ── Property upgrade ─────────────────────────────────────────────────────────

describe('property upgrade', () => {
  it('replays an own-property set before the element was connected', () => {
    const el = document.createElement('md-diff');
    // Simulate a pre-upgrade own-property (as if set before the CE definition loaded)
    Object.defineProperty(el, 'leftContent', {
      value: 'upgraded\n', writable: true, configurable: true, enumerable: true,
    });
    document.body.appendChild(el);
    expect(el.leftContent).toBe('upgraded\n');
    const ta = el.shadowRoot.querySelector('.left-textarea');
    expect(ta.value).toBe('upgraded\n');
    cleanup(el);
  });

  it('replays an own-property on rightContent', () => {
    const el = document.createElement('md-diff');
    Object.defineProperty(el, 'rightContent', {
      value: 'right-upgraded\n', writable: true, configurable: true, enumerable: true,
    });
    document.body.appendChild(el);
    expect(el.rightContent).toBe('right-upgraded\n');
    const ta = el.shadowRoot.querySelector('.right-textarea');
    expect(ta.value).toBe('right-upgraded\n');
    cleanup(el);
  });
});

// ── attributeChangedCallback edge cases ──────────────────────────────────────

describe('attributeChangedCallback edge cases', () => {
  it('re-renders when right-content attribute changes', () => {
    const el = createElement({
      'left-content':  'aaa\n',
      'right-content': 'bbb\n',
    });
    const before = el.shadowRoot.querySelector('.diff-table').innerHTML;
    el.setAttribute('right-content', 'zzz\n');
    const after = el.shadowRoot.querySelector('.diff-table').innerHTML;
    expect(after).not.toBe(before);
    expect(el.rightContent).toBe('zzz\n');
    cleanup(el);
  });

  it('does not re-render when attribute value is unchanged', () => {
    const el = createElement({ 'left-content': 'aaa\n' });
    const before = el.shadowRoot.querySelector('.diff-table').innerHTML;
    el.setAttribute('left-content', 'aaa\n');
    const after = el.shadowRoot.querySelector('.diff-table').innerHTML;
    expect(after).toBe(before);
    cleanup(el);
  });

  it('triggers a full re-render when a style attribute changes', () => {
    const el = createElement({ 'left-content': 'x\n', 'right-content': 'y\n' });
    const styleBefore = el.shadowRoot.querySelector('style').textContent;
    el.setAttribute('font-size', '20px');
    const styleAfter = el.shadowRoot.querySelector('style').textContent;
    expect(styleAfter).toContain('20px');
    expect(styleAfter).not.toBe(styleBefore);
    cleanup(el);
  });

  it('handles removing right-content attribute (null newVal)', () => {
    const el = createElement({ 'right-content': 'hello\n' });
    el.removeAttribute('right-content');
    expect(el.rightContent).toBe('');
    cleanup(el);
  });

  it('handles removing left-content attribute (null newVal)', () => {
    const el = createElement({ 'left-content': 'hello\n' });
    el.removeAttribute('left-content');
    expect(el.leftContent).toBe('');
    cleanup(el);
  });
});

// ── Identical inputs ──────────────────────────────────────────────────────────

describe('identical inputs', () => {
  it('shows no insertion or deletion cells when inputs are identical', () => {
    const content = '# Same\nSame line\n';
    const el = createElement({ 'left-content': content, 'right-content': content });
    const ins = el.shadowRoot.querySelectorAll('.insertion');
    const del = el.shadowRoot.querySelectorAll('.deletion');
    expect(ins.length).toBe(0);
    expect(del.length).toBe(0);
    cleanup(el);
  });
});

// ── Pre-connect behaviour ────────────────────────────────────────────────────

describe('pre-connect behaviour', () => {
  it('setting leftContent before connect does not throw', () => {
    const el = document.createElement('md-diff');
    el.leftContent = 'pre-connect\n';
    expect(el.leftContent).toBe('pre-connect\n');
    document.body.appendChild(el);
    expect(el.leftContent).toBe('pre-connect\n');
    cleanup(el);
  });

  it('setting rightContent before connect does not throw', () => {
    const el = document.createElement('md-diff');
    el.rightContent = 'pre-connect\n';
    expect(el.rightContent).toBe('pre-connect\n');
    document.body.appendChild(el);
    expect(el.rightContent).toBe('pre-connect\n');
    cleanup(el);
  });

  it('attribute set before connect is picked up on connect', () => {
    const el = document.createElement('md-diff');
    el.setAttribute('left-content', 'attr-before\n');
    el.setAttribute('right-content', 'attr-before-r\n');
    document.body.appendChild(el);
    expect(el.leftContent).toBe('attr-before\n');
    expect(el.rightContent).toBe('attr-before-r\n');
    cleanup(el);
  });
});

// ── Style / theme customisation ──────────────────────────────────────────────

describe('style customisation attributes', () => {
  it('applies custom insertion-color', () => {
    const el = createElement({ 'insertion-color': '#00ff00' });
    const style = el.shadowRoot.querySelector('style').textContent;
    expect(style).toContain('#00ff00');
    cleanup(el);
  });

  it('applies custom deletion-color', () => {
    const el = createElement({ 'deletion-color': '#ff0000' });
    const style = el.shadowRoot.querySelector('style').textContent;
    expect(style).toContain('#ff0000');
    cleanup(el);
  });

  it('applies custom border-radius', () => {
    const el = createElement({ 'border-radius': '12px' });
    const style = el.shadowRoot.querySelector('style').textContent;
    expect(style).toContain('12px');
    cleanup(el);
  });

  it('applies custom diff-height', () => {
    const el = createElement({ 'diff-height': '800px' });
    const style = el.shadowRoot.querySelector('style').textContent;
    expect(style).toContain('800px');
    cleanup(el);
  });
});

// ── HTML escaping ────────────────────────────────────────────────────────────

describe('HTML escaping in labels', () => {
  it('escapes angle brackets in labels', () => {
    const el = createElement({ 'left-label': '<script>alert(1)</script>' });
    const label = el.shadowRoot.querySelector('.ta-label');
    expect(label.textContent).toContain('<script>');
    expect(label.innerHTML).not.toContain('<script>');
    cleanup(el);
  });

  it('escapes ampersands and quotes in labels', () => {
    const el = createElement({ 'right-label': 'A & "B"' });
    const labels = el.shadowRoot.querySelectorAll('.ta-label');
    expect(labels[1].textContent).toBe('A & "B"');
    cleanup(el);
  });
});

// ── Empty / edge-case rendering ──────────────────────────────────────────────

describe('empty and edge-case rendering', () => {
  it('renders with both inputs empty', () => {
    const el = createElement({ 'left-content': '', 'right-content': '' });
    const cells = el.shadowRoot.querySelectorAll('.diff-cell');
    expect(cells.length).toBe(0);
    cleanup(el);
  });

  it('renders with only whitespace content', () => {
    const el = createElement({ 'left-content': '   \n', 'right-content': '   \n' });
    const cells = el.shadowRoot.querySelectorAll('.diff-cell');
    expect(cells.length).toBeGreaterThan(0);
    cleanup(el);
  });

  it('handles content without trailing newline', () => {
    const el = createElement({ 'left-content': 'no newline', 'right-content': 'no newline' });
    const table = el.shadowRoot.querySelector('.diff-table');
    expect(table.textContent).toContain('no newline');
    cleanup(el);
  });
});
