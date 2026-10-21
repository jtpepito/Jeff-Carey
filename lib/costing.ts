/** Pure costing maths. All money is integer centavos; quantities may be fractional. */

export type CostLine = { qty: number; packQty: number; packCost: number };
export type CostInput = { yield: number; labourMinutes: number; packagingCost: number; items: CostLine[] };
export type RecipeCost = {
  ingredientsCost: number; labourCost: number; batchCost: number; unitCost: number; packagingCost: number;
};

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

/** Cost of one line: the share of a pack that is used, times the pack price. */
export const lineCost = (l: CostLine) => (l.packQty > 0 ? Math.round(safe((l.qty / l.packQty) * l.packCost)) : 0);

export function costRecipe(r: CostInput, labourRatePerHour: number): RecipeCost {
  const ingredientsCost = r.items.reduce((sum, l) => sum + lineCost(l), 0);
  const labourCost = Math.round(safe((Math.max(0, r.labourMinutes) / 60) * labourRatePerHour));
  const batchCost = ingredientsCost + labourCost;
  const packagingCost = Math.max(0, r.packagingCost);
  const unitCost = r.yield >= 1 ? Math.round(batchCost / r.yield) + packagingCost : 0;
  return { ingredientsCost, labourCost, batchCost, unitCost, packagingCost };
}

export const unitCostOf = (r: CostInput, labourRatePerHour: number) => costRecipe(r, labourRatePerHour).unitCost;
