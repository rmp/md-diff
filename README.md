# md-diff

A lightweight, standalone web component for visual side-by-side markdown diffs.

- Zero runtime dependencies beyond [`diff`](https://www.npmjs.com/package/diff) and [`marked`](https://www.npmjs.com/package/marked), both bundled
- Shadow DOM encapsulation — styles never leak in or out
- Inline markdown rendering (bold, italic, code, links) on each diff line
- Full UTF-8 support including CJK and emoji
- Works as a plain `<script>` tag, an ES module, or inside any framework (React, Vue, Svelte, …)

## Installation

```bash
npm install md-diff
```

Or grab the minified UMD bundle directly:

```html
<script src="https://unpkg.com/md-diff/dist/md-diff.umd.min.js"></script>
```

## Quick start

```html
<script src="node_modules/md-diff/dist/md-diff.umd.min.js"></script>

<md-diff id="diff" show-textareas="true" diff-height="400px"></md-diff>

<script>
  const el = document.getElementById('diff');
  el.leftContent  = '# Hello\nOriginal text\n';
  el.rightContent = '# Hello\nModified text\n';
</script>
```

## Usage

### Browser `<script>` tag

```html
<!-- production, minified (55 KB) -->
<script src="dist/md-diff.umd.min.js"></script>

<!-- development, with source maps -->
<script src="dist/md-diff.umd.js"></script>
```

The UMD bundle self-registers the `<md-diff>` custom element and also exposes
`window.MdDiff` with named exports if you need the JS API directly.

### ES module (bundlers, React, Vue, Svelte, …)

```js
// Registers <md-diff> as a side effect
import 'md-diff';

// Or import the class and the pure diff engine
import { MdDiff, computeDiff } from 'md-diff';
```

### React

```jsx
import 'md-diff';
import { useRef, useEffect } from 'react';

function MarkdownDiff({ left, right }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current.leftContent  = left;
    ref.current.rightContent = right;
  }, [left, right]);

  return <md-diff ref={ref} show-textareas="false" diff-height="500px" />;
}
```

## Content API

Content can be supplied three ways, listed in priority order:

| Method | Example |
|---|---|
| JS property (recommended) | `el.leftContent = '...'` |
| HTML attribute | `<md-diff left-content="...">` |
| Typing in the textarea | Live updates as the user types |

JS property assignment is preferred for non-trivial content because it avoids
HTML-encoding concerns and handles all Unicode correctly.

## Attributes

All attributes are optional. Changes at runtime trigger a re-render.

### Content

| Attribute | Type | Default | Description |
|---|---|---|---|
| `left-content` | string | `""` | Initial markdown for the left (original) pane |
| `right-content` | string | `""` | Initial markdown for the right (modified) pane |

### Layout

| Attribute | Type | Default | Description |
|---|---|---|---|
| `show-textareas` | `"true"` \| `"false"` | `"true"` | Show or hide the editable textarea inputs |
| `left-label` | string | `"Original"` | Label above the left textarea |
| `right-label` | string | `"Modified"` | Label above the right textarea |
| `textarea-height` | CSS length | `"150px"` | Height of each textarea |
| `diff-height` | CSS length | `"400px"` | Maximum height of the diff output area (scrolls internally) |
| `font-size` | CSS length | `"13px"` | Font size for both textareas and diff output |
| `font-family` | CSS value | monospace stack | Font family for both textareas and diff output |

### Colours

| Attribute | Type | Default | Description |
|---|---|---|---|
| `insertion-color` | CSS colour | `#e6ffec` | Background of inserted lines (right pane) |
| `insertion-text-color` | CSS colour | `inherit` | Text colour of inserted lines |
| `deletion-color` | CSS colour | `#ffebe9` | Background of deleted lines (left pane) |
| `deletion-text-color` | CSS colour | `inherit` | Text colour of deleted lines |
| `empty-color` | CSS colour | `#f8f8f8` | Background of placeholder rows that align the two panes |
| `line-number-color` | CSS colour | `#636e7b` | Text colour of line-number gutter |
| `line-number-bg` | CSS colour | `#f6f8fa` | Background of line-number gutter |
| `background-color` | CSS colour | `#ffffff` | Container background |
| `border-color` | CSS colour | `#d0d7de` | Border colour used throughout |
| `border-radius` | CSS length | `"6px"` | Corner radius of the outer container |

### Example: dark theme

```html
<md-diff
  show-textareas="false"
  background-color="#1e1e1e"
  border-color="#3a3a3a"
  insertion-color="#1a3a1a"
  insertion-text-color="#a8d5a2"
  deletion-color="#3a1a1a"
  deletion-text-color="#d5a2a2"
  line-number-color="#666"
  line-number-bg="#2a2a2a"
  empty-color="#252525"
  font-size="12px"
></md-diff>
```

## JS property API

The two content properties can be read and set directly on the element instance.
Setting either triggers an immediate diff re-render.

```js
const el = document.querySelector('md-diff');

el.leftContent  = '# Before\nSome text\n';
el.rightContent = '# After\nDifferent text\n';

console.log(el.leftContent);   // '# Before\nSome text\n'
console.log(el.rightContent);  // '# After\nDifferent text\n'
```

## CSS Parts

The internal elements are exposed as [CSS `::part`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part)
targets for styling from outside the shadow DOM:

| Part name | Element |
|---|---|
| `container` | Outer wrapper div |
| `textareas` | Textarea row |
| `left-textarea` | Left `<textarea>` |
| `right-textarea` | Right `<textarea>` |
| `diff-output` | The CSS grid that holds all diff rows |

```css
md-diff::part(diff-output) {
  font-size: 14px;
}
```

## Pure diff engine

The diff engine is exported separately for use outside the web component, for
example in a Node.js build pipeline or in tests:

```js
import { computeDiff, splitLines } from 'md-diff';

const { leftRows, rightRows } = computeDiff(originalText, modifiedText);

// Each row: { lineNum: number|null, content: string, type: 'equal'|'deletion'|'insertion'|'empty' }
for (const row of leftRows) {
  console.log(row.lineNum, row.type, row.content);
}
```

## Development

```bash
npm install        # install dependencies
npm test           # run tests (vitest, 45 tests, happy-dom)
npm run test:watch # watch mode
npm run build      # produce dist/ artifacts
npm run dev        # watch + rebuild
```

### Build outputs

| File | Format | Use case |
|---|---|---|
| `dist/md-diff.umd.min.js` | UMD minified | Production `<script>` tag |
| `dist/md-diff.umd.js` | UMD with source maps | Development `<script>` tag |
| `dist/md-diff.esm.js` | ES module | Bundlers, modern frameworks |
| `dist/md-diff.cjs.js` | CommonJS | Node.js / SSR environments |

## License

MIT
