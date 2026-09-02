import Link from "next/link";
import { STATUS_TONE } from "@/lib/types";

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE["Not started"];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}
    >
      {status}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">{eyebrow}</p>
      ) : null}
      <h2 className="mt-0.5 text-lg font-semibold text-ink-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="hint">{hint}</p> : null}
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-400">{sub}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card border-dashed p-8 text-center">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Semicolon-separated workbook values rendered as chips. */
export function Chips({ value }: { value: string }) {
  const items = value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return <span className="text-ink-400">—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600"
        >
          {item}
        </span>
      ))}
    </span>
  );
}

export function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
      }`}
    >
      {children}
    </Link>
  );
}
