import { expect, test } from "vitest";
import { costRecipe, unitCostOf } from "@/lib/costing";

// A batch of 12 cinnamon rolls: 500 g flour at P48/kg, 2 eggs at P9 each, 100 g butter at P420/kg.
const batch = {
  yield: 12,
  labourMinutes: 90,
  packagingCost: 1500, // P15 per box
  items: [
    { qty: 500, packQty: 1000, packCost: 4800 },
    { qty: 2, packQty: 1, packCost: 900 },
    { qty: 100, packQty: 1000, packCost: 42000 },
  ],
};

test("adds up ingredients, labour and packaging and divides the batch by its yield", () => {
  const c = costRecipe(batch, 8000); // P80 per hour
  expect(c.ingredientsCost).toBe(2400 + 1800 + 4200);
  expect(c.labourCost).toBe(12000);
  expect(c.batchCost).toBe(8400 + 12000);
  expect(c.unitCost).toBe(Math.round(20400 / 12) + 1500);
});

test("unitCostOf rounds to whole centavos and handles an empty recipe", () => {
  expect(unitCostOf({ yield: 7, labourMinutes: 0, packagingCost: 0, items: [{ qty: 1, packQty: 3, packCost: 100 }] }, 0)).toBe(5);
  expect(unitCostOf({ yield: 1, labourMinutes: 0, packagingCost: 0, items: [] }, 8000)).toBe(0);
});

test("a yield below 1 or a pack size of 0 cannot blow up the maths", () => {
  expect(unitCostOf({ yield: 0, labourMinutes: 30, packagingCost: 500, items: [{ qty: 10, packQty: 0, packCost: 100 }] }, 8000)).toBe(0);
});
