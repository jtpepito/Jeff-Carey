"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string; paragraphs: string[] };

export function ProductTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div className="mt-10">
      <div role="tablist" aria-label="Product information" className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={cn(
              "-mb-px min-h-12 border-b-2 px-3 text-[15px] font-semibold",
              t.id === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={t.id !== active} className="space-y-3 pt-5 text-[15px] leading-relaxed">
          {t.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
