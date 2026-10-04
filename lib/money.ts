const fmt2 = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

export function formatPeso(centavos: number): string {
  return "₱" + (centavos % 100 === 0 ? fmt0.format(centavos / 100) : fmt2.format(centavos / 100));
}

/** "1,299.50" -> 129950. Returns null for anything that is not a non-negative peso amount. */
export function parsePeso(text: string): number | null {
  const cleaned = text.replace(/[₱,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** 129950 -> "1,299.50" for prefilling money inputs (no peso sign). */
export function pesoInputValue(centavos: number): string {
  return formatPeso(centavos).slice(1);
}
