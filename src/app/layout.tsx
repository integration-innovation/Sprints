import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Structured Sprints",
  description:
    "Run bi-weekly build sprints: each participant sets one sprint-sized target, builds it, and records what became possible.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
