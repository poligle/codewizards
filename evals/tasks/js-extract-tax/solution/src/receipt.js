import { taxFor } from './tax.js';

export function receiptLine(amount, region) {
  return `${amount.toFixed(2)} + ${taxFor(amount, region).toFixed(2)} tax`;
}
