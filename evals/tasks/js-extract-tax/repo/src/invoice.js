export function invoiceTotal(lines, region) {
  const net = lines.reduce((a, l) => a + l.price * l.qty, 0);
  let rate = 0.21;
  if (region === 'canarias') rate = 0.07;
  else if (region === 'ceuta' || region === 'melilla') rate = 0.04;
  const tax = Math.round(net * rate * 100) / 100;
  return Math.round((net + tax) * 100) / 100;
}
