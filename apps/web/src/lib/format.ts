const formatters = new Map<string, Intl.NumberFormat>();

export function formatPrice(amount: number, currency: string): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

export function ratingLabel(average: number, count: number): string {
  return `Rated ${average.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'rating' : 'ratings'}`;
}
