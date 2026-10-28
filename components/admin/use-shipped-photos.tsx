"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { applyShippedPhotos } from "@/actions/seed";

/** One tap gives the seeded products the photos that ship with the app. Shown while any product still uses a stock photo. */
export function UseShippedPhotos() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const { changed } = await applyShippedPhotos();
          toast.success(changed ? `Photos updated on ${changed} ${changed === 1 ? "product" : "products"}` : "Photos were already up to date");
          router.refresh();
        })
      }
      className="btn btn-outline"
    >
      {pending ? "Updating…" : "Use the photos in the app"}
    </button>
  );
}
