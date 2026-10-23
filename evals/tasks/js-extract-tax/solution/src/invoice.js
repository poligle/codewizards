import { taxFor } from './tax.js';

export function invoiceTotal(lines, region) {
  const net = lines.reduce((a, l) => a + l.price * l.qty, 0);
  return Math.round((net + taxFor(net, region)) * 100) / 100;
}
