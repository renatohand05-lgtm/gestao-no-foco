import { RouteLoading } from "@/components/layout/route-loading";

export default function RootLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <RouteLoading cards={3} label="Carregando aplicação…" />
    </main>
  );
}
