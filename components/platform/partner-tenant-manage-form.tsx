"use client";

import { useState } from "react";
import { UserPlus, Save } from "lucide-react";

import {
  inviteUserToReferredTenantAction,
  updateReferredTenantCadastroAction,
} from "@/lib/platform/partner-actions";
import { listProductOnboardingSegments } from "@/config/onboarding/segments";
import type { TenantSegment } from "@/types";

const segments = listProductOnboardingSegments().map((s) => ({
  value: s.id as TenantSegment,
  label: s.label,
}));

const INVITE_ROLES: { value: string; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "member", label: "Membro" },
];

export function PartnerTenantManageForm({
  tenantId,
  currentName,
  currentSegment,
}: {
  tenantId: string;
  currentName: string;
  currentSegment: TenantSegment | null;
}) {
  const [name, setName] = useState(currentName);
  const [segment, setSegment] = useState<TenantSegment>(
    currentSegment ?? "oficina",
  );
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroMessage, setCadastroMessage] = useState<string | null>(null);
  const [cadastroError, setCadastroError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleCadastroSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCadastroLoading(true);
    setCadastroMessage(null);
    setCadastroError(null);

    const result = await updateReferredTenantCadastroAction({
      tenantId,
      name,
      segment,
    });

    if (result.ok) {
      setCadastroMessage("Dados atualizados com sucesso.");
    } else {
      setCadastroError(result.error);
    }
    setCadastroLoading(false);
  }

  async function handleInviteSubmit(event: React.FormEvent) {
    event.preventDefault();
    setInviteLoading(true);
    setInviteResult(null);
    setInviteError(null);

    const result = await inviteUserToReferredTenantAction({
      tenantId,
      email: inviteEmail,
      fullName: inviteName || undefined,
      membershipRole: inviteRole,
    });

    if (result.ok) {
      setInviteResult(
        `Convite criado! Link: ${result.data.inviteUrl}`,
      );
      setInviteEmail("");
      setInviteName("");
    } else {
      setInviteError(result.error);
    }
    setInviteLoading(false);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCadastroSubmit}
        className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-5"
      >
        <div className="flex items-center gap-2">
          <Save className="size-4 text-[var(--brand-gold,#C9A84C)]" />
          <p className="text-sm font-semibold text-foreground">
            Dados cadastrais
          </p>
        </div>

        {cadastroMessage ? (
          <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {cadastroMessage}
          </p>
        ) : null}
        {cadastroError ? (
          <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {cadastroError}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="tenant-name" className="text-xs text-muted-foreground">
            Nome da empresa
          </label>
          <input
            id="tenant-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tenant-segment" className="text-xs text-muted-foreground">
            Tipo de negócio
          </label>
          <select
            id="tenant-segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value as TenantSegment)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {segments.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={cadastroLoading}
          className="rounded-md bg-[var(--brand-gold,#C9A84C)] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {cadastroLoading ? "Salvando..." : "Salvar dados"}
        </button>
      </form>

      <form
        onSubmit={handleInviteSubmit}
        className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-5"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-[var(--brand-gold,#C9A84C)]" />
          <p className="text-sm font-semibold text-foreground">
            Convidar novo usuário
          </p>
        </div>

        {inviteResult ? (
          <p className="break-all rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            {inviteResult}
          </p>
        ) : null}
        {inviteError ? (
          <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {inviteError}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="invite-email" className="text-xs text-muted-foreground">
            E-mail
          </label>
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            placeholder="pessoa@empresa.com"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="invite-name" className="text-xs text-muted-foreground">
            Nome (opcional)
          </label>
          <input
            id="invite-name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="invite-role" className="text-xs text-muted-foreground">
            Papel na empresa
          </label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {INVITE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={inviteLoading}
          className="rounded-md bg-[var(--brand-gold,#C9A84C)] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {inviteLoading ? "Enviando..." : "Criar convite"}
        </button>
      </form>
    </div>
  );
}
