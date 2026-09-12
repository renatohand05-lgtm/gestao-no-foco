"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  generateApiKeyAction,
  listApiKeysAction,
  revokeApiKeyAction,
} from "@/lib/integracoes-vendas/api-key-actions";
import type { ApiKeySummary } from "@/lib/integracoes-vendas/api-key-service";

type Props = {
  tenantSlug: string;
  webhookUrl: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function VendasWebhookPanel({ tenantSlug, webhookUrl }: Props) {
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function reload() {
    const result = await listApiKeysAction(tenantSlug);
    if (result.success) setKeys(result.data);
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      const result = await listApiKeysAction(tenantSlug);
      if (!ignore && result.success) setKeys(result.data);
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCopy(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateApiKeyAction(tenantSlug, label || "Sem nome");
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNewKey(result.rawKey);
      setLabel("");
      void reload();
    });
  }

  function handleRevoke(keyId: string) {
    startTransition(async () => {
      await revokeApiKeyAction(tenantSlug, keyId);
      void reload();
    });
  }

  return (
    <SectionCard
      title="Webhook de vendas externas"
      description="Receba vendas de qualquer sistema externo, com autenticação por chave de API."
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <KeyRound className="size-4" />
          <p>
            Cada venda entra como <strong>em andamento</strong>, pra você
            revisar e faturar quando quiser (nunca fatura sozinha).
          </p>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            URL do webhook (POST)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs">{webhookUrl}</code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy(webhookUrl, "url")}
            >
              {copied === "url" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
        </div>

        {newKey ? (
          <div className="rounded-md border border-amber-400/60 bg-amber-500/10 p-3">
            <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              Copie agora — essa chave não aparece de novo depois de fechar esta tela.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs">{newKey}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(newKey, "key")}
              >
                {copied === "key" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setNewKey(null)}
            >
              Já copiei, fechar
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Nome da chave (ex: &quot;PDV loja 1&quot;)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
              />
            </div>
            <Button type="button" onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Gerando…" : "Gerar chave"}
            </Button>
          </div>
        )}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Chaves existentes
          </p>
          {!keys || keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma chave gerada ainda.</p>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-md border border-border/60 p-2.5"
              >
                <div>
                  <p className="text-sm">{k.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {k.keyPrefix}… · criada em {formatDate(k.createdAt)}
                    {k.revokedAt ? " · revogada" : ""}
                    {k.lastUsedAt ? ` · último uso ${formatDate(k.lastUsedAt)}` : ""}
                  </p>
                </div>
                {!k.revokedAt ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(k.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
}
