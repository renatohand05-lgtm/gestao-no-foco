"use client";

import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { updateCommunicationSettingsAction } from "@/lib/retention/actions";
import type { CommunicationTenantSettings } from "@/lib/retention/settings";
import { cn } from "@/lib/utils";

type Health = { label: string; status: string; operatorLabel: string };

type Props = {
  tenantSlug: string;
  initial: CommunicationTenantSettings;
  whatsapp: Health;
  email: Health;
};

export function CommunicationSettingsForm({
  tenantSlug,
  initial,
  whatsapp,
  email,
}: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [s, setS] = useState(initial);

  function toggle<K extends keyof CommunicationTenantSettings>(
    key: K,
    value: CommunicationTenantSettings[K],
  ) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="space-y-6"
      data-phase35="comunicacoes-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        start(async () => {
          const res = await updateCommunicationSettingsAction(tenantSlug, s);
          if (!res.success) setError(res.error);
          else setOk(true);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">WhatsApp</p>
          <p className="text-lg font-semibold">{whatsapp.operatorLabel}</p>
          <p className="text-sm text-muted-foreground">{whatsapp.label}</p>
          <NativeSelect
            className="mt-2 h-10"
            value={s.whatsappMode}
            onChange={(e) =>
              toggle("whatsappMode", e.target.value as CommunicationTenantSettings["whatsappMode"])
            }
          >
            <option value="disabled">Desligado</option>
            <option value="manual_link">Link manual</option>
            <option value="provider">Provider</option>
          </NativeSelect>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">E-mail</p>
          <p className="text-lg font-semibold">{email.operatorLabel}</p>
          <p className="text-sm text-muted-foreground">{email.label}</p>
          <NativeSelect
            className="mt-2 h-10"
            value={s.emailMode}
            onChange={(e) =>
              toggle("emailMode", e.target.value as CommunicationTenantSettings["emailMode"])
            }
          >
            <option value="disabled">Desligado</option>
            <option value="provider">Provider</option>
          </NativeSelect>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Preferências</legend>
        {(
          [
            ["sendAppointmentCreated", "Agendamento criado"],
            ["sendAppointmentReminder", "Lembrete de agendamento"],
            ["sendReturn", "Retorno próximo"],
            ["sendServiceReady", "Serviço pronto"],
            ["sendDelivery", "Retirada concluída"],
            ["notifyReadyAuto", "Notificar automaticamente quando o serviço estiver pronto"],
            ["fallbackEmail", "Fallback para e-mail se WhatsApp indisponível"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(s[key])}
              onChange={(e) => toggle(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm space-y-1">
          Canal preferido
          <NativeSelect
            className="h-10"
            value={s.preferredChannel}
            onChange={(e) =>
              toggle(
                "preferredChannel",
                e.target.value as CommunicationTenantSettings["preferredChannel"],
              )
            }
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </NativeSelect>
        </label>
        <label className="text-sm space-y-1">
          Lembretes (ex.: D-1,H-2)
          <Input
            value={s.reminderOffsets.join(",")}
            onChange={(e) =>
              toggle(
                "reminderOffsets",
                e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <label className="text-sm space-y-1">
          Janela início
          <Input
            type="number"
            min={0}
            max={23}
            value={s.windowStartHour}
            onChange={(e) => toggle("windowStartHour", Number(e.target.value))}
          />
        </label>
        <label className="text-sm space-y-1">
          Janela fim
          <Input
            type="number"
            min={0}
            max={23}
            value={s.windowEndHour}
            onChange={(e) => toggle("windowEndHour", Number(e.target.value))}
          />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Segredos de API não são exibidos. Provider real permanece desligado até homologação.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {ok ? <p className="text-sm text-muted-foreground">Preferências salvas.</p> : null}
      <button type="submit" disabled={pending} className={cn(buttonVariants(), "min-h-11")}>
        Salvar
      </button>
    </form>
  );
}
