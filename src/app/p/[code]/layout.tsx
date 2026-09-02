import Link from "next/link";
import { notFound } from "next/navigation";
import { signOutAction } from "@/lib/actions";
import { programmeByCode } from "@/lib/programme";
import { participantIn } from "@/lib/session";
import { ProgrammeNav } from "@/components/programme-nav";

export default async function ProgrammeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const me = await participantIn(programme);

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <Link href={`/p/${programme.join_code}`} className="block truncate">
              <span className="text-base font-semibold text-ink-900">{programme.name}</span>
            </Link>
            <p className="mt-0.5 text-xs text-ink-400">
              Join code{" "}
              <span className="font-mono font-semibold tracking-widest text-ink-600">
                {programme.join_code}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {me ? (
              <>
                <span className="text-sm text-ink-600">
                  {me.name}
                  {me.is_facilitator ? (
                    <span className="ml-1.5 rounded bg-accent-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700">
                      Facilitator
                    </span>
                  ) : null}
                </span>
                <form action={signOutAction}>
                  <button type="submit" className="btn-ghost">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href={`/join?code=${programme.join_code}`} className="btn-primary">
                Join
              </Link>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3">
          <ProgrammeNav code={programme.join_code} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
