"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { loadStarterData } from "@/actions/seed";

/** Shown on the dashboard of a shop with no products: one tap loads the menu from the costing file. */
export function LoadStarterData() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <section className="rounded-2xl border border-dashed border-input bg-card p-5" aria-labelledby="starter-heading">
      <h2 id="starter-heading" className="text-xl">Nothing on the shelves yet</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Load the menu from the costing file: the cinnamon rolls and cupcakes, their ingredients and recipes, and a few sample orders to try the console with.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await loadStarterData();
            if (result.ok) toast.success("Menu loaded");
            else toast.error(result.error);
            router.refresh();
          })
        }
        className="btn btn-primary mt-4"
      >
        {pending ? "Loading…" : "Load the menu and sample data"}
      </button>
    </section>
  );
}
