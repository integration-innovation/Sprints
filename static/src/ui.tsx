import React from "react";
import { STATUS_TONE } from "./model";

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

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-400">{sub}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
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
        <span key={item} className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
          {item}
        </span>
      ))}
    </span>
  );
}

/** A thin bar showing complete / partial / blocked out of targets set. */
export function Bar({
  complete,
  partial,
  blocked,
  total,
}: {
  complete: number;
  partial: number;
  blocked: number;
  total: number;
}) {
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-ink-100" />;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div style={{ width: w(complete) }} className="bg-emerald-500" />
      <div style={{ width: w(partial) }} className="bg-amber-400" />
      <div style={{ width: w(blocked) }} className="bg-rose-500" />
    </div>
  );
}

/** A transient confirmation line, e.g. "Plan saved." */
export function Flash({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
      {message}
    </p>
  );
}

export function useFlash(): [string | null, (message: string) => void] {
  const [message, setMessage] = React.useState<string | null>(null);
  const show = React.useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage(null), 4000);
  }, []);
  return [message, show];
}
