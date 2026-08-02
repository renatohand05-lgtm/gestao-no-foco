"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Mail, Send, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelInvitationAction,
  createInvitationAction,
  resendInvitationAction,
} from "@/lib/equipe/actions";
import {
  MEMBERSHIP_ROLE_OPTIONS,
  invitationStatusLabel,
  type CreateInvitationResult,
  type Invitation,
  type JobTitle,
  type MembershipRole,
  type Team,
} from "@/lib/equipe";

type InviteFormProps = {
  tenantSlug: string;
  invitations: Invitation[];
  teams: Team[];
  jobTitles: JobTitle[];
  emailConfigured: boolean;
  schemaReady: boolean;
};

const STATUS_VARIANT: Record<string, "success" | "outline" | "destructive" | "secondary"> = {
  pending: "secondary",
  accepted: "success",
  expired: "outline",
  cancelled: "destructive",
};

export function InviteForm({
  tenantSlug,
  invitations,
  teams,
  jobTitles,
  emailConfigured,
  schemaReady,
}: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<MembershipRole>("member");
  const [teamId, setTeamId] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CreateInvitationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInvitationAction(tenantSlug, {
        email,
        fullName: fullName || null,
        membershipRole: role,
        teamId: teamId || null,
        jobTitleId: jobTitleId || null,
        message: message || null,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setLastResult(result.data);
      setEmail("");
      setFullName("");
      setMessage("");
    });
  }

  function handleCopy() {
    if (!lastResult) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}${lastResult.inviteUrl}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCancel(invitationId: string) {
    startTransition(async () => {
      await cancelInvitationAction(tenantSlug, invitationId);
    });
  }

  function handleResend(invitationId: string) {
    startTransition(async () => {
      const result = await resendInvitationAction(tenantSlug, invitationId);
      if (result.ok) setLastResult(result.data);
    });
  }

  if (!schemaReady) {
    return (
      <EmptyState
        icon={Mail}
        title="Convites indisponíveis"
        description="A migration de Equipe (tenant_invitations) ainda não foi aplicada neste ambiente."
      />
    );
  }

  return (
    <div className="space-y-4">
      {!emailConfigured ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Nenhum provedor de e-mail configurado (RESEND_API_KEY / SMTP_HOST). O convite não é
            enviado automaticamente — copie o link gerado e envie manualmente ao convidado.
          </CardContent>
        </Card>
      ) : null}

      {lastResult ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium text-foreground">
              Convite criado para {lastResult.invitation.email}
            </p>
            <p className="text-xs text-muted-foreground">
              Este link só é exibido uma vez. Copie e envie ao convidado agora.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={lastResult.inviteUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Convidar membro</CardTitle>
          <CardDescription>
            O convidado recebe um link único para aceitar e criar acesso ao tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <FormField label="E-mail" htmlFor="invite-email" required>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@empresa.com"
              />
            </FormField>
            <FormField label="Nome (opcional)" htmlFor="invite-name">
              <Input
                id="invite-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </FormField>
            <FormField label="Papel" htmlFor="invite-role" required>
              <NativeSelect
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as MembershipRole)}
              >
                {MEMBERSHIP_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Equipe (opcional)" htmlFor="invite-team">
              <NativeSelect
                id="invite-team"
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
              >
                <option value="">Sem equipe</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Cargo (opcional)" htmlFor="invite-job-title">
              <NativeSelect
                id="invite-job-title"
                value={jobTitleId}
                onChange={(event) => setJobTitleId(event.target.value)}
              >
                <option value="">Sem cargo</option>
                {jobTitles.map((jobTitle) => (
                  <option key={jobTitle.id} value={jobTitle.id}>
                    {jobTitle.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Mensagem (opcional)" htmlFor="invite-message" className="sm:col-span-2">
              <Textarea
                id="invite-message"
                rows={2}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </FormField>

            {error ? (
              <p className="sm:col-span-2 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                <Send className="mr-2 size-4" />
                {isPending ? "Enviando..." : "Enviar convite"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Convites enviados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convite enviado ainda.</p>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {invitation.membershipRole} · expira em{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[invitation.status] ?? "secondary"}>
                    {invitationStatusLabel(invitation.status)}
                  </Badge>
                  {invitation.status === "pending" ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Reenviar (gera novo link)"
                        disabled={isPending}
                        onClick={() => handleResend(invitation.id)}
                      >
                        <Send className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Cancelar convite"
                        disabled={isPending}
                        onClick={() => handleCancel(invitation.id)}
                      >
                        <X className="size-3.5 text-destructive" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
