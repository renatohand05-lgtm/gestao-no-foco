"use client";

import { RouteError } from "@/components/layout/route-error";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto min-h-[60vh] px-4 py-16">
      <RouteError error={error} reset={reset} />
    </main>
  );
}
