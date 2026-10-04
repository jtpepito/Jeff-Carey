import Link from "next/link";

export function EmptyState({
  title, body, action,
}: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-input bg-card px-6 py-14 text-center">
      <svg aria-hidden viewBox="0 0 48 48" className="size-12 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M24 42V20M24 20c0-8 5-13 13-14 0 8-5 13-13 14ZM24 27c0-6-4-10-11-11 0 6 4 10 11 11Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 42h20" strokeLinecap="round" />
      </svg>
      <h2 className="mt-5 text-2xl">{title}</h2>
      <p className="mt-2 text-[15px] text-muted-foreground">{body}</p>
      {action ? (
        <Link href={action.href} className="btn btn-primary mt-6">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
