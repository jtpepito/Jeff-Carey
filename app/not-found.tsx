import { EmptyState } from "@/components/store/empty-state";

export default function NotFound() {
  return (
    <main className="px-4 py-20">
      <EmptyState title="We can't find that page" body="It may have moved, or the link may be mistyped." action={{ href: "/", label: "Back to the shop" }} />
    </main>
  );
}
