import test from 'node:test';
import assert from 'node:assert/strict';
import { notesFor } from '../../../tools/release-notes.mjs';

const log = `# Changelog

## [1.3.0] · 2026-10-23 · Step 3

Intro line.

### Added
- One

## [1.2.2] · 2026-10-23 · Before

- Old

[1.3.0]: https://example.invalid
`;

test('the notes are the version\'s own section of the changelog', () => {
  const n = notesFor(log, '1.3.0');
  assert.match(n, /^\*\*2026-10-23 · Step 3\*\*/);
  assert.match(n, /### Added\n- One/);
  assert.doesNotMatch(n, /Old|example\.invalid/);
  assert.match(notesFor(log, '9.9.9'), /See CHANGELOG/);
});
