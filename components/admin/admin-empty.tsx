import Link from "next/link";

export function AdminEmpty({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-input bg-card px-6 py-12 text-center">
      <p className="font-heading text-xl">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-muted-foreground">{body}</p>
      {action ? (
        <Link href={action.href} className="btn btn-primary mt-5">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
