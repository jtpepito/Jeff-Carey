"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings, type SettingsFormValues } from "@/actions/settings";

const FIELDS: { name: keyof SettingsFormValues; label: string; hint: string; money: boolean }[] = [
  { name: "freeShippingThreshold", label: "Free-shipping threshold", hint: "Orders with a subtotal at or above this amount ship free.", money: true },
  { name: "feeNcr", label: "NCR shipping fee", hint: "Metro Manila.", money: true },
  { name: "feeLuzon", label: "Luzon shipping fee", hint: "Luzon provinces outside Metro Manila.", money: true },
  { name: "feeVismin", label: "Visayas / Mindanao shipping fee", hint: "All Visayas and Mindanao provinces.", money: true },
  { name: "gcashNumber", label: "GCash number", hint: "Shown at checkout when a customer chooses GCash.", money: false },
];

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      className="mt-5 max-w-xl space-y-5 rounded-2xl border border-border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await saveSettings(values);
          if (result.ok) toast.success("Settings saved");
          else setError({ field: result.field, message: result.error });
        });
      }}
    >
      {FIELDS.map((f) => (
        <div key={f.name}>
          <label htmlFor={`s-${f.name}`} className="field-label">{f.label}</label>
          <div className="relative">
            {f.money ? <span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">₱</span> : null}
            <input
              id={`s-${f.name}`}
              className={f.money ? "field pl-8" : "field"}
              inputMode={f.money ? "decimal" : "tel"}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{f.hint}</p>
          {error?.field === f.name ? <p className="field-error" role="alert">{error.message}</p> : null}
        </div>
      ))}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
