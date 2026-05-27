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

  it('treats null/undefined as empty string', () => {
    const el = createElement({ 'left-content': 'something\n' });
    el.leftContent = null;
    expect(el.leftContent).toBe('');
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
