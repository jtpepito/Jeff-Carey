"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { refreshCart } from "@/actions/cart";
import { addLine, CART_KEY, countOf, parseCart, reconcile, setQty as setLineQty, type CartLine } from "@/lib/cart";

// The drawer (and the dialog code it pulls in) loads the first time the cart is opened.
const CartDrawer = dynamic(() => import("./cart-drawer").then((m) => m.CartDrawer), { ssr: false });

type CartContext = {
  lines: CartLine[];
  ready: boolean;
  notices: string[];
  threshold: number;
  isOpen: boolean;
  add(line: CartLine): void;
  setQty(variantId: number, qty: number): void;
  clear(): void;
  open(): void;
  close(): void;
  /** Re-reads prices and stock from the server and fixes the cart to match. */
  refresh(): Promise<void>;
};

const Ctx = createContext<CartContext | null>(null);

export function useCart(): CartContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function CartProvider({ threshold, children }: { threshold: number; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);
  const latest = useRef(lines);

  // Mutations go through the ref so a refresh that starts right after an add already sees the new line.
  const commit = useCallback((next: CartLine[]) => {
    latest.current = next;
    setLines(next);
  }, []);

  // localStorage only exists in the browser, so the cart is read after the first render.
  useEffect(() => {
    let stored: CartLine[] = [];
    try {
      stored = parseCart(window.localStorage.getItem(CART_KEY));
    } catch {
      // Storage can be blocked (private mode); the cart then lives in memory only.
    }
    commit(stored);
    setReady(true);
  }, [commit]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // See above.
    }
  }, [lines, ready]);

  const refresh = useCallback(async () => {
    const before = latest.current;
    if (before.length === 0) return;
    const fresh = await refreshCart(before.map((l) => l.variantId));
    // Only judge the lines we asked about; anything added while waiting is left alone.
    const asked = new Set(before.map((l) => l.variantId));
    const result = reconcile(latest.current.filter((l) => asked.has(l.variantId)), fresh);
    commit([...result.cart, ...latest.current.filter((l) => !asked.has(l.variantId))]);
    setNotices([
      ...result.removed.map((n) => `${n} is no longer available and was removed.`),
      ...result.reduced.map((n) => `${n} was reduced to the stock left.`),
    ]);
  }, [commit]);

  const value = useMemo<CartContext>(
    () => ({
      lines, ready, notices, threshold, isOpen,
      add: (line) => commit(addLine(latest.current, line)),
      setQty: (variantId, qty) => commit(setLineQty(latest.current, variantId, qty)),
      clear: () => { commit([]); setNotices([]); },
      open: () => { setEverOpened(true); setOpen(true); void refresh(); },
      close: () => setOpen(false),
      refresh,
    }),
    [lines, ready, notices, threshold, isOpen, refresh, commit],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {everOpened ? <CartDrawer /> : null}
    </Ctx.Provider>
  );
}

export function CartButton() {
  const { lines, ready, open } = useCart();
  const count = ready ? countOf(lines) : 0;
  return (
    <button type="button" onClick={open} aria-label="Open cart" className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-foreground/5">
      <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      {count > 0 ? (
        <span className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs leading-5 font-bold text-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );
}
