"use client";

import type { NotificationPreference } from "@/lib/notifications";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  preference: NotificationPreference;
  className?: string;
};

export function NotificationPreferencesView({ preference, className }: Props) {
  const channels = preference.enabledChannels ?? [];

  return (
    <section
      aria-label="Preferências de notificação"
      data-notification-preferences
      className={cn("space-y-3", className)}
    >
      <h2 className={cn(gofTypography.title, "text-base")}>Preferências</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className={gofTypography.caption}>Idioma</dt>
          <dd className="font-medium">{preference.locale ?? "—"}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Timezone</dt>
          <dd className="font-medium">{preference.timezone ?? "—"}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Prioridade mínima</dt>
          <dd className="font-medium">{preference.minPriority ?? "—"}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Frequência</dt>
          <dd className="font-medium">
            {preference.digestEnabled
              ? preference.frequency ?? "digest"
              : (preference.frequency ?? "realtime")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className={gofTypography.caption}>Canais habilitados</dt>
          <dd className="font-medium">
            {channels.length ? channels.join(", ") : "nenhum"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className={gofTypography.caption}>Opt-out</dt>
          <dd className="font-medium">
            {preference.optOut ? "sim" : "não"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
