export function taxFor(amount, region) {
  let rate = 0.21;
  if (region === 'canarias') rate = 0.07;
  else if (region === 'ceuta' || region === 'melilla') rate = 0.04;
  return Math.round(amount * rate * 100) / 100;
}
