export const multiplyMinor = (unitPriceMinor: number, quantity: number): number => {
  const result = unitPriceMinor * quantity;
  if (!Number.isSafeInteger(result)) throw new RangeError('Monetary amount overflow');
  return result;
};

export const sumMinor = (amounts: number[]): number => {
  const total = amounts.reduce((acc, amount) => acc + amount, 0);
  if (!Number.isSafeInteger(total)) throw new RangeError('Monetary amount overflow');
  return total;
};
