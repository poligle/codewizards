#!/usr/bin/env node
// CodeWizards command line: see `codewizards --help`.
import { main } from '../src/cli.js';

main(process.argv.slice(2)).then(
  code => { if (typeof code === 'number') process.exitCode = code; },
  err => { process.stderr.write(`codewizards: ${(err && err.message) || err}\n`); process.exitCode = 1; },
);
