import { describe, it, expect } from 'vitest';
import { splitLines, computeDiff } from '../src/diff-engine.js';
import { splitLines as reExportedSplitLines, computeDiff as reExportedComputeDiff, MdDiff } from '../src/index.js';

// ── index.js re-exports ──────────────────────────────────────────────────────

describe('index.js re-exports', () => {
  it('re-exports splitLines from diff-engine', () => {
    expect(reExportedSplitLines).toBe(splitLines);
  });

  it('re-exports computeDiff from diff-engine', () => {
    expect(reExportedComputeDiff).toBe(computeDiff);
  });

  it('re-exports MdDiff from md-diff', () => {
    expect(MdDiff).toBeDefined();
    expect(typeof MdDiff).toBe('function');
  });
});

// ── splitLines ────────────────────────────────────────────────────────────────

describe('splitLines', () => {
  it('splits on newline characters', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('drops the trailing empty string when value ends with \\n', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
  });

  it('handles an empty string', () => {
    expect(splitLines('')).toEqual([]);
  });

  it('handles a single line without trailing newline', () => {
    expect(splitLines('hello')).toEqual(['hello']);
  });

  it('preserves internal blank lines', () => {
    expect(splitLines('a\n\nb')).toEqual(['a', '', 'b']);
  });
});

// ── computeDiff ───────────────────────────────────────────────────────────────

describe('computeDiff', () => {
  it('returns equal row counts for both panes', () => {
    const { leftRows, rightRows } = computeDiff('a\nb\nc\n', 'a\nb\nc\n');
    expect(leftRows.length).toBe(rightRows.length);
  });

  it('marks identical content as equal', () => {
    const { leftRows, rightRows } = computeDiff('hello\n', 'hello\n');
    expect(leftRows[0].type).toBe('equal');
    expect(rightRows[0].type).toBe('equal');
    expect(leftRows[0].content).toBe('hello');
    expect(rightRows[0].content).toBe('hello');
  });

  it('marks a deleted line on the left as deletion and pads the right', () => {
    const { leftRows, rightRows } = computeDiff('a\nb\n', 'a\n');
    const del = leftRows.find(r => r.type === 'deletion');
    expect(del).toBeDefined();
    expect(del.content).toBe('b');

    // Right side must have a placeholder at the same index
    const idx = leftRows.indexOf(del);
    expect(rightRows[idx].type).toBe('empty');
  });

  it('marks an inserted line on the right as insertion and pads the left', () => {
    const { leftRows, rightRows } = computeDiff('a\n', 'a\nb\n');
    const ins = rightRows.find(r => r.type === 'insertion');
    expect(ins).toBeDefined();
    expect(ins.content).toBe('b');

    const idx = rightRows.indexOf(ins);
    expect(leftRows[idx].type).toBe('empty');
  });

  it('aligns a replaced block side-by-side', () => {
    const left  = 'line1\nold line\nline3\n';
    const right = 'line1\nnew line\nline3\n';
    const { leftRows, rightRows } = computeDiff(left, right);

    const delIdx = leftRows.findIndex(r => r.type === 'deletion');
    const insIdx = rightRows.findIndex(r => r.type === 'insertion');

    expect(delIdx).toBe(insIdx);
    expect(leftRows[delIdx].content).toBe('old line');
    expect(rightRows[insIdx].content).toBe('new line');
  });

  it('assigns ascending sequential line numbers on each side', () => {
    const { leftRows, rightRows } = computeDiff('a\nb\nc\n', 'a\nx\ny\nc\n');
    const leftNums  = leftRows.filter(r  => r.lineNum !== null).map(r  => r.lineNum);
    const rightNums = rightRows.filter(r => r.lineNum !== null).map(r => r.lineNum);

    // Line numbers must be monotonically increasing
    for (let i = 1; i < leftNums.length;  i++) expect(leftNums[i]).toBeGreaterThan(leftNums[i - 1]);
    for (let i = 1; i < rightNums.length; i++) expect(rightNums[i]).toBeGreaterThan(rightNums[i - 1]);
  });

  it('handles empty inputs', () => {
    const { leftRows, rightRows } = computeDiff('', '');
    expect(leftRows.length).toBe(0);
    expect(rightRows.length).toBe(0);
  });

  it('handles left-only content (full deletion)', () => {
    const { leftRows, rightRows } = computeDiff('a\nb\n', '');
    expect(leftRows.every(r  => r.type === 'deletion')).toBe(true);
    expect(rightRows.every(r => r.type === 'empty')).toBe(true);
  });

  it('handles right-only content (full insertion)', () => {
    const { leftRows, rightRows } = computeDiff('', 'a\nb\n');
    expect(rightRows.every(r => r.type === 'insertion')).toBe(true);
    expect(leftRows.every(r  => r.type === 'empty')).toBe(true);
  });

  it('handles UTF-8 multibyte characters', () => {
    const left  = '# Héllo\nCafé\n';
    const right = '# Héllo\nCafé!\n';
    const { leftRows, rightRows } = computeDiff(left, right);
    expect(leftRows.some(r  => r.content === 'Café')).toBe(true);
    expect(rightRows.some(r => r.content === 'Café!')).toBe(true);
  });

  it('handles CJK characters', () => {
    const left  = '你好世界\n';
    const right = '你好地球\n';
    const { leftRows, rightRows } = computeDiff(left, right);
    expect(leftRows.some(r  => r.type === 'deletion')).toBe(true);
    expect(rightRows.some(r => r.type === 'insertion')).toBe(true);
  });

  it('handles emoji characters', () => {
    const left  = 'Hello 🌍\n';
    const right = 'Hello 🌎\n';
    const { leftRows, rightRows } = computeDiff(left, right);
    expect(leftRows[0].type).toBe('deletion');
    expect(rightRows[0].type).toBe('insertion');
  });

  it('preserves equal lines surrounding a changed block', () => {
    const left  = 'before\nchanged\nafter\n';
    const right = 'before\nnew line\nafter\n';
    const { leftRows } = computeDiff(left, right);
    const types = leftRows.map(r => r.type);
    expect(types[0]).toBe('equal');   // 'before'
    expect(types[1]).toBe('deletion');
    expect(types[2]).toBe('equal');   // 'after'
  });

  it('handles multiple separate changed blocks', () => {
    const left  = 'a\nb\nc\nd\n';
    const right = 'a\nB\nc\nD\n';
    const { leftRows, rightRows } = computeDiff(left, right);
    const leftTypes  = leftRows.map(r  => r.type);
    const rightTypes = rightRows.map(r => r.type);

    expect(leftTypes.filter(t  => t === 'deletion')).toHaveLength(2);
    expect(rightTypes.filter(t => t === 'insertion')).toHaveLength(2);
  });

  it('null lineNum only on empty placeholder rows', () => {
    const { leftRows, rightRows } = computeDiff('a\n', 'a\nb\n');
    for (const row of [...leftRows, ...rightRows]) {
      if (row.type === 'empty') {
        expect(row.lineNum).toBeNull();
      } else {
        expect(row.lineNum).toBeTypeOf('number');
      }
    }
  });

  it('content is empty string on placeholder rows', () => {
    const { leftRows } = computeDiff('', 'inserted\n');
    expect(leftRows[0].content).toBe('');
  });
});
