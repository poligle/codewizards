export function receiptLine(amount, region) {
  let rate = 0.21;
  if (region === 'canarias') rate = 0.07;
  else if (region === 'ceuta' || region === 'melilla') rate = 0.04;
  const tax = Math.round(amount * rate * 100) / 100;
  return `${amount.toFixed(2)} + ${tax.toFixed(2)} tax`;
}
