import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";

// Every storefront page reads live stock and prices from SQLite, so nothing is prerendered.
export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
