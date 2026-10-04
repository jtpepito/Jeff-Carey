"use client";

import { useEffect } from "react";
import { useCart } from "./cart-provider";

/** Empties the cart once the order receipt is on screen. */
export function ClearCart() {
  const { ready, lines, clear } = useCart();
  useEffect(() => {
    if (ready && lines.length > 0) clear();
  }, [ready, lines.length, clear]);
  return null;
}
