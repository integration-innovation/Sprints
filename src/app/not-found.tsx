import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold text-ink-900">Not found</h1>
      <p className="mt-2 text-sm text-ink-600">
        That programme, sprint or page doesn&apos;t exist here.
      </p>
      <Link href="/" className="btn-secondary mt-6">
        Back to start
      </Link>
    </main>
  );
}
