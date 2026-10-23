import test from 'node:test';
import assert from 'node:assert/strict';
import { taxFor } from '../src/tax.js';
import { invoiceTotal } from '../src/invoice.js';
import { receiptLine } from '../src/receipt.js';
import fs from 'node:fs';

test('taxFor', () => {
  assert.equal(taxFor(100, 'madrid'), 21);
  assert.equal(taxFor(100, 'canarias'), 7);
  assert.equal(taxFor(10, 'ceuta'), 0.4);
  assert.equal(taxFor(10, 'melilla'), 0.4);
});
test('same results', () => {
  assert.equal(invoiceTotal([{ price: 10, qty: 3 }, { price: 2.5, qty: 2 }], 'madrid'), 42.35);
  assert.equal(invoiceTotal([{ price: 10, qty: 1 }], 'canarias'), 10.7);
  assert.equal(receiptLine(19.99, 'melilla'), '19.99 + 0.80 tax');
});
test('no copied rules left', () => {
  for (const f of ['src/invoice.js', 'src/receipt.js']) {
    const src = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /0\.21|canarias/, f);
    assert.match(src, /taxFor/, f);
  }
});
