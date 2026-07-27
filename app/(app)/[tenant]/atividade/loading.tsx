import { TimelineLoading } from "@/components/timeline/timeline-loading";

export default function AtividadeLoading() {
  return (
    <div className="space-y-4 p-2">
      <TimelineLoading label="Carregando Activity Timeline…" />
    </div>
  );
}
