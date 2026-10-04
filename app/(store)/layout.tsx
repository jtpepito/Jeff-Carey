import { CartButton, CartProvider } from "@/components/store/cart-provider";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { getSettings } from "@/lib/settings";

// Every storefront page reads live stock and prices from SQLite, so nothing is prerendered.
export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider threshold={getSettings().freeShippingThreshold}>
      <Header cart={<CartButton />} />
      <main>{children}</main>
      <Footer />
    </CartProvider>
  );
}
