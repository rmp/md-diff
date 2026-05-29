import { marked } from 'marked';
import { computeDiff } from './diff-engine.js';

// Configure marked: safe defaults, no async
marked.use({ async: false, breaks: false });

const OBSERVED = [
  'left-content',
  'right-content',
  'show-textareas',
  'left-label',
  'right-label',
  'textarea-height',
  'diff-height',
  'font-size',
  'font-family',
  'insertion-color',
  'insertion-text-color',
  'deletion-color',
  'deletion-text-color',
  'line-number-color',
  'line-number-bg',
  'background-color',
  'border-color',
  'border-radius',
  'empty-color',
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render one source line as HTML.
 *
 * Uses marked.parse() so headings, lists, blockquotes, etc. are styled.
 * A bare <p>…</p> wrapper is stripped so single-line prose stays compact.
 *
 * Note: multi-line markdown constructs (fenced code blocks, tables) that are
 * split across diff rows will render each line independently and may look
 * fragmented — this is an inherent limit of line-by-line diffing.
 *
 * @param {string} content  Raw markdown line
 * @returns {string}        Safe HTML fragment
 */
function renderBlock(content) {
  if (!content) return '';
  const html = /** @type {string} */ (marked.parse(content)).trim();
  // Unwrap a single bare <p>…</p> so plain lines don't add extra block spacing
  return html.replace(/^<p>([\s\S]*)<\/p>$/, '$1');
}

function buildStyles(p) {
  return /* css */`
    :host {
      display: block;
      box-sizing: border-box;
      height: 100%;
    }
    *, *::before, *::after { box-sizing: inherit; }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 1px solid ${p.borderColor};
      border-radius: ${p.borderRadius};
      overflow: hidden;
      background: ${p.bgColor};
      font-family: ${p.fontFamily};
      font-size: ${p.fontSize};
    }

    /* ── Textarea section ──────────────────────────────────────────── */
    .textareas {
      display: flex;
      flex: 1;
      min-height: 0;
      gap: 8px;
      padding: 8px;
      background: #f6f8fa;
      border-bottom: 1px solid ${p.borderColor};
    }
    .textareas.hidden { display: none; }
    .ta-wrapper { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .ta-label {
      font-size: 12px;
      font-weight: 600;
      color: #57606a;
      font-family: ${p.fontFamily};
    }
    textarea {
      width: 100%;
      flex: 1;
      min-height: ${p.textareaHeight};
      font-family: ${p.fontFamily};
      font-size: ${p.fontSize};
      border: 1px solid ${p.borderColor};
      border-radius: 4px;
      padding: 8px;
      resize: vertical;
      line-height: 1.5;
    }

    /* ── Diff grid ─────────────────────────────────────────────────── */
    /*
     * A single CSS grid drives both columns.  Every pair of diff cells
     * shares a grid row, so their heights always match — no JS measurement
     * needed even when a heading or list item is taller than a plain line.
     *
     * Columns: [left gutter] [left content] [right gutter] [right content]
     */
    .diff-table {
      display: grid;
      grid-template-columns: 3em 1fr 3em 1fr;
      overflow: auto;
      max-height: ${p.diffHeight};
    }

    /* ── Gutter cells (line numbers) ───────────────────────────────── */
    .diff-gutter {
      padding: 2px 8px 2px 4px;
      text-align: right;
      color: ${p.lineNumColor};
      background: ${p.lineNumBg};
      border-right: 1px solid ${p.borderColor};
      border-bottom: 1px solid transparent;
      user-select: none;
      font-size: 0.85em;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      /* Align number to the top of the cell when content is multi-line */
      display: flex;
      align-items: flex-start;
      padding-top: 3px;
    }

    /* ── Content cells ─────────────────────────────────────────────── */
    .diff-cell {
      padding: 2px 8px;
      word-break: break-word;
      overflow-wrap: anywhere;
      min-height: 1.5em;
      line-height: 1.5;
    }
    /* Right border of left content = centre divider */
    .lcell {
      border-right: 2px solid ${p.borderColor};
    }
    .diff-cell.insertion {
      background: ${p.insertionColor};
      color: ${p.insertionTextColor};
    }
    .diff-cell.deletion {
      background: ${p.deletionColor};
      color: ${p.deletionTextColor};
    }
    .diff-cell.empty {
      background: ${p.emptyColor};
    }
    /* Match gutter colour for empty/deletion/insertion gutters */
    .diff-gutter.lnum-deletion { background: color-mix(in srgb, ${p.deletionColor} 60%, ${p.lineNumBg}); }
    .diff-gutter.lnum-insertion { background: color-mix(in srgb, ${p.insertionColor} 60%, ${p.lineNumBg}); }
    .diff-gutter.rnum-deletion { background: color-mix(in srgb, ${p.deletionColor} 60%, ${p.lineNumBg}); }
    .diff-gutter.rnum-insertion { background: color-mix(in srgb, ${p.insertionColor} 60%, ${p.lineNumBg}); }

    /* ── Markdown element resets inside diff cells ─────────────────── */
    .diff-cell p        { margin: 0; }
    .diff-cell h1       { font-size: 1.35em; font-weight: 700; margin: 0; line-height: 1.3; }
    .diff-cell h2       { font-size: 1.15em; font-weight: 700; margin: 0; line-height: 1.3; }
    .diff-cell h3       { font-size: 1.05em; font-weight: 600; margin: 0; line-height: 1.3; }
    .diff-cell h4,
    .diff-cell h5,
    .diff-cell h6       { font-size: 1em;    font-weight: 600; margin: 0; }
    .diff-cell ul,
    .diff-cell ol       { margin: 0; padding-left: 1.4em; }
    .diff-cell li       { margin: 0; padding: 0; }
    /* Single-line list items get rendered as <ul><li>…</li></ul>; strip
       the extra vertical space so they sit flush with other rows. */
    .diff-cell ul:only-child,
    .diff-cell ol:only-child { display: contents; }
    .diff-cell li:only-child { display: list-item; list-style-position: inside; padding-left: 0; }
    .diff-cell blockquote {
      margin: 0;
      padding-left: 0.75em;
      border-left: 3px solid ${p.borderColor};
      color: #57606a;
    }
    .diff-cell pre {
      margin: 0;
      padding: 2px 6px;
      background: rgba(0,0,0,0.06);
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
      overflow-x: auto;
      white-space: pre;
    }
    .diff-cell code {
      font-family: monospace;
      background: rgba(0,0,0,0.06);
      border-radius: 3px;
      padding: 0 3px;
    }
    .diff-cell pre code { background: none; padding: 0; }
    .diff-cell hr {
      border: none;
      border-top: 2px solid currentColor;
      opacity: 0.25;
      margin: 0.4em 0;
    }
    .diff-cell a         { color: inherit; }
    .diff-cell strong    { font-weight: 700; }
    .diff-cell em        { font-style: italic; }
  `;
}

export class MdDiff extends HTMLElement {
  static get observedAttributes() { return OBSERVED; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._left = '';
    this._right = '';
    this._connected = false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  connectedCallback() {
    // Replay any properties set as plain own-properties before the element was
    // upgraded (e.g. el.leftContent = x in a classic script that ran before the
    // module loaded).  Delete the own-property first so the prototype setter fires.
    this._upgradeProperty('leftContent');
    this._upgradeProperty('rightContent');

    this._connected = true;
    // Attribute values take priority over JS property values set before connect
    if (this.hasAttribute('left-content'))  this._left  = this.getAttribute('left-content');
    if (this.hasAttribute('right-content')) this._right = this.getAttribute('right-content');
    this._fullRender();
  }

  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const val = this[prop];
      delete this[prop];
      this[prop] = val;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._connected) return;
    if (name === 'left-content')  { this._left  = newVal ?? ''; this._syncTextarea('left',  this._left);  this._renderDiff(); return; }
    if (name === 'right-content') { this._right = newVal ?? ''; this._syncTextarea('right', this._right); this._renderDiff(); return; }
    this._fullRender();
  }

  // ── Public API ────────────────────────────────────────────────────

  /** @returns {string} */
  get leftContent()  { return this._left; }
  /** @param {string} v */
  set leftContent(v) {
    this._left = v ?? '';
    this._syncTextarea('left', this._left);
    if (this._connected) this._renderDiff();
  }

  /** @returns {string} */
  get rightContent()  { return this._right; }
  /** @param {string} v */
  set rightContent(v) {
    this._right = v ?? '';
    this._syncTextarea('right', this._right);
    if (this._connected) this._renderDiff();
  }

  // ── Private helpers ───────────────────────────────────────────────

  _attr(name, fallback) {
    const v = this.getAttribute(name);
    return (v !== null && v !== '') ? v : fallback;
  }

  _params() {
    return {
      showTextareas:      this.getAttribute('show-textareas') !== 'false',
      leftLabel:          this._attr('left-label',          'Original'),
      rightLabel:         this._attr('right-label',         'Modified'),
      textareaHeight:     this._attr('textarea-height',     '150px'),
      diffHeight:         this._attr('diff-height',         '400px'),
      fontSize:           this._attr('font-size',           '13px'),
      fontFamily:         this._attr('font-family',         "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"),
      insertionColor:     this._attr('insertion-color',     '#e6ffec'),
      insertionTextColor: this._attr('insertion-text-color','inherit'),
      deletionColor:      this._attr('deletion-color',      '#ffebe9'),
      deletionTextColor:  this._attr('deletion-text-color', 'inherit'),
      lineNumColor:       this._attr('line-number-color',   '#636e7b'),
      lineNumBg:          this._attr('line-number-bg',      '#f6f8fa'),
      bgColor:            this._attr('background-color',    '#ffffff'),
      borderColor:        this._attr('border-color',        '#d0d7de'),
      borderRadius:       this._attr('border-radius',       '6px'),
      emptyColor:         this._attr('empty-color',         '#f8f8f8'),
    };
  }

  _fullRender() {
    const p = this._params();
    const sr = this.shadowRoot;

    sr.innerHTML = /* html */`
      <style>${buildStyles(p)}</style>
      <div class="container" part="container">
        <div class="textareas${p.showTextareas ? '' : ' hidden'}" part="textareas">
          <div class="ta-wrapper">
            <div class="ta-label">${escapeHtml(p.leftLabel)}</div>
            <textarea class="left-textarea" part="left-textarea"
              placeholder="Enter original markdown…"
              spellcheck="false"
              autocorrect="off"
              autocomplete="off"
            ></textarea>
          </div>
          <div class="ta-wrapper">
            <div class="ta-label">${escapeHtml(p.rightLabel)}</div>
            <textarea class="right-textarea" part="right-textarea"
              placeholder="Enter modified markdown…"
              spellcheck="false"
              autocorrect="off"
              autocomplete="off"
            ></textarea>
          </div>
        </div>
        <div class="diff-table" part="diff-output"></div>
      </div>
    `;

    const leftTA  = sr.querySelector('.left-textarea');
    const rightTA = sr.querySelector('.right-textarea');
    leftTA.value  = this._left;
    rightTA.value = this._right;

    leftTA.addEventListener('input',  () => { this._left  = leftTA.value;  this._renderDiff(); });
    rightTA.addEventListener('input', () => { this._right = rightTA.value; this._renderDiff(); });

    this._renderDiff();
  }

  _syncTextarea(side, value) {
    const el = this.shadowRoot.querySelector(`.${side}-textarea`);
    if (el && el.value !== value) el.value = value;
  }

  _renderDiff() {
    const table = this.shadowRoot.querySelector('.diff-table');
    if (!table) return;

    const { leftRows, rightRows } = computeDiff(this._left, this._right);
    table.innerHTML = leftRows.map((l, i) => rowHtml(l, rightRows[i])).join('');
  }
}

/**
 * Render one pair of diff rows as four grid cells (left gutter, left content,
 * right gutter, right content).
 *
 * @param {import('./diff-engine.js').DiffRow} left
 * @param {import('./diff-engine.js').DiffRow} right
 * @returns {string}
 */
function rowHtml(left, right) {
  const lNum  = left.lineNum  ?? '';
  const rNum  = right.lineNum ?? '';
  const lType = left.type  === 'equal' ? '' : ` ${left.type}`;
  const rType = right.type === 'equal' ? '' : ` ${right.type}`;
  const lGutterType = left.type  !== 'equal' && left.type  !== 'empty' ? ` lnum-${left.type}`  : '';
  const rGutterType = right.type !== 'equal' && right.type !== 'empty' ? ` rnum-${right.type}` : '';
  const lContent = left.content  ? renderBlock(left.content)  : '';
  const rContent = right.content ? renderBlock(right.content) : '';
  return (
    `<span class="diff-gutter lnum${lGutterType}">${lNum}</span>` +
    `<span class="diff-cell lcell${lType}">${lContent}</span>` +
    `<span class="diff-gutter rnum${rGutterType}">${rNum}</span>` +
    `<span class="diff-cell rcell${rType}">${rContent}</span>`
  );
}

customElements.define('md-diff', MdDiff);
