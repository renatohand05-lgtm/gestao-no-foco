"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  generateFreeAccessInvite,
  listFreeAccessInvites,
  type FreeAccessInvite,
} from "@/lib/platform/free-access";

type Props = {
  initialInvites: FreeAccessInvite[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FreeAccessInvitesClient({ initialInvites }: Props) {
  const [invites, setInvites] = useState(initialInvites);
  const [note, setNote] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateFreeAccessInvite(note);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNote("");
      const refreshed = await listFreeAccessInvites();
      if (refreshed.success) setInvites(refreshed.data);
    });
  }

  function handleCopy(link: string, id: string) {
    void navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="size-4 text-[var(--brand-gold,#C9A84C)]" />
            Gerar novo convite
          </CardTitle>
          <CardDescription>
            Cada link só funciona uma vez — assim que alguém se cadastrar
            com ele, o convite fica marcado como usado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Pra quem é esse convite? (opcional, só pra você lembrar)"
            className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="button" onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Gerando…" : "Gerar link"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Convites gerados ({invites.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum convite gerado ainda.
            </p>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {invite.link}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {invite.note ? (
                      <span className="text-foreground">{invite.note}</span>
                    ) : null}
                    {invite.usedAt ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                        Usado por {invite.usedByTenantName ?? "empresa"} em{" "}
                        {formatDate(invite.usedAt)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                        Ainda não usado
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(invite.link, invite.id)}
                  disabled={Boolean(invite.usedAt)}
                >
                  {copiedId === invite.id ? (
                    <>
                      <Check className="size-3.5" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
