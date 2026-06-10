export function normalizeMoney(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Некорректная денежная сумма");
  }

  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePurchaseTotal(price: number, quantity: number): number {
  return normalizeMoney(price * quantity);
}
