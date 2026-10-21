import type { Metadata } from "next";
import { ComponentsManager } from "@/components/admin/components-manager";
import { listComponents, listIngredients } from "@/lib/recipes";

export const metadata: Metadata = { title: "Components" };

export default function ComponentsPage() {
  return (
    <>
      <h1 className="text-3xl">Components</h1>
      <p className="mt-1 mb-5 text-[15px] text-muted-foreground">
        Sub-recipes shared by several products: a dough, a filling, a topping. Recipes use them by weight or count, and their cost follows ingredient prices.
      </p>
      <ComponentsManager components={listComponents()} ingredients={listIngredients()} />
    </>
  );
}
