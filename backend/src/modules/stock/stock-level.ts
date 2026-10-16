export type StockLevel = "OK" | "LOW" | "OUT";

export function stockLevel(item: { quantity: number; lowAt: number | null }): StockLevel {
  if (item.quantity <= 0) return "OUT";
  if (item.lowAt !== null && item.quantity <= item.lowAt) return "LOW";
  return "OK";
}
