import { diffLines } from 'diff';

/**
 * @typedef {{ lineNum: number|null, content: string, type: 'equal'|'deletion'|'insertion'|'empty' }} DiffRow
 * @typedef {{ leftRows: DiffRow[], rightRows: DiffRow[] }} DiffResult
 */

/**
 * Split a diff chunk value into individual lines, discarding the trailing empty
 * string that results from a value ending with '\n'.
 * @param {string} value
 * @returns {string[]}
 */
export function splitLines(value) {
  const lines = value.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

/**
 * Compute side-by-side diff rows from two text strings.
 *
 * Consecutive removed/added blocks are aligned so deleted and inserted lines
 * appear next to each other. Orphaned deletions get empty placeholders on the
 * right; orphaned insertions get empty placeholders on the left.
 *
 * @param {string} leftText
 * @param {string} rightText
 * @returns {DiffResult}
 */
export function computeDiff(leftText, rightText) {
  const changes = diffLines(leftText, rightText);

  /** @type {DiffRow[]} */
  const leftRows = [];
  /** @type {DiffRow[]} */
  const rightRows = [];

  let leftLineNum = 1;
  let rightLineNum = 1;

  let i = 0;
  while (i < changes.length) {
    const change = changes[i];

    if (!change.added && !change.removed) {
      // Equal block — synchronise row counts before appending
      pad(leftRows, rightRows);

      for (const line of splitLines(change.value)) {
        leftRows.push({ lineNum: leftLineNum++, content: line, type: 'equal' });
        rightRows.push({ lineNum: rightLineNum++, content: line, type: 'equal' });
      }
      i++;
      continue;
    }

    if (change.removed) {
      const removedLines = splitLines(change.value);
      let addedLines = [];

      // Greedily consume an immediately following 'added' block so we can
      // align them side-by-side.
      if (i + 1 < changes.length && changes[i + 1].added) {
        addedLines = splitLines(changes[i + 1].value);
        i += 2;
      } else {
        i++;
      }

      const count = Math.max(removedLines.length, addedLines.length);
      for (let j = 0; j < count; j++) {
        if (j < removedLines.length) {
          leftRows.push({ lineNum: leftLineNum++, content: removedLines[j], type: 'deletion' });
        } else {
          leftRows.push({ lineNum: null, content: '', type: 'empty' });
        }

        if (j < addedLines.length) {
          rightRows.push({ lineNum: rightLineNum++, content: addedLines[j], type: 'insertion' });
        } else {
          rightRows.push({ lineNum: null, content: '', type: 'empty' });
        }
      }
      continue;
    }

    if (change.added) {
      // Insertion with no preceding deletion — blank out the left side.
      for (const line of splitLines(change.value)) {
        leftRows.push({ lineNum: null, content: '', type: 'empty' });
        rightRows.push({ lineNum: rightLineNum++, content: line, type: 'insertion' });
      }
      i++;
    }
  }

  pad(leftRows, rightRows);
  return { leftRows, rightRows };
}

/** Pad the shorter array with empty rows so both arrays have the same length. */
function pad(leftRows, rightRows) {
  while (leftRows.length < rightRows.length) {
    leftRows.push({ lineNum: null, content: '', type: 'empty' });
  }
  while (rightRows.length < leftRows.length) {
    rightRows.push({ lineNum: null, content: '', type: 'empty' });
  }
}
