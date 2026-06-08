export function fmt(n: number | string | null | undefined, decimals = 2) {
  const v = typeof n === "string" ? Number(n) : n;
  if (v == null || isNaN(v as number)) return "—";
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export const inr = (n: number | string | null | undefined) => "₹" + fmt(n);
