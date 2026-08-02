import { shiftCivilDate } from "@/lib/dashboard/tenant-timezone";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  start: string;
  end: string;
  tipo: string;
};

type Props = {
  weekStart: string;
  events: Event[];
};

export function AgendaWeekBoard({ weekStart, events }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => shiftCivilDate(weekStart, i));

  return (
    <div
      className="grid gap-2 md:grid-cols-7"
      data-agenda-view="semana"
      role="list"
      aria-label="Agenda da semana"
    >
      {days.map((day) => {
        const dayEvents = events.filter((e) => e.start.slice(0, 10) === day);
        return (
          <section
            key={day}
            role="listitem"
            className={cn(
              "min-h-40 rounded-xl border bg-card p-2",
              "flex flex-col gap-2",
            )}
          >
            <header className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {formatDay(day)}
            </header>
            <div className="flex flex-1 flex-col gap-1.5">
              {dayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Livre</p>
              ) : (
                dayEvents.map((ev) => (
                  <article
                    key={ev.id}
                    className="rounded-md border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/8 px-2 py-1.5 text-xs"
                  >
                    <div className="font-medium text-[var(--text-primary)]">
                      {ev.title}
                    </div>
                    <div className="text-muted-foreground">
                      {timeLabel(ev.start)} · {ev.tipo}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function formatDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!, 12));
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function timeLabel(iso: string) {
  const t = iso.includes("T") ? iso.slice(11, 16) : "—";
  return t;
}
