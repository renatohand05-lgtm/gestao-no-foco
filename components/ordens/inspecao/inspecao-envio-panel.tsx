"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Copy,
  Download,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/format";
import type { ShareListItem } from "@/lib/ordens/compartilhamento-service";
import {
  criarCompartilhamentoAction,
  getInspecaoPdfAction,
  publicarOrcamentoVersaoAction,
  revogarCompartilhamentoAction,
} from "@/lib/ordens/inspecao-actions";
import { DEFAULT_ORCAMENTO_AVISO } from "@/lib/ordens/inspecao-aviso";
import type { OrcamentoVersaoRecord } from "@/lib/ordens/orcamento-versao-service";
import { buildWhatsAppDeepLink } from "@/lib/ordens/whatsapp-link";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  osId: string;
  osNumero: number;
  emailConfigured: boolean;
  versoes: OrcamentoVersaoRecord[];
  shares: ShareListItem[];
  onRefresh: () => void;
  disabled?: boolean;
  whatsappPhone?: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export function InspecaoEnvioPanel({
  tenantSlug,
  osId,
  osNumero,
  emailConfigured,
  versoes,
  shares,
  onRefresh,
  disabled = false,
  whatsappPhone,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [validadeHoras, setValidadeHoras] = useState("72");
  const [versaoSelecionada, setVersaoSelecionada] = useState("");

  const versaoPublicada = useMemo(
    () => versoes.find((v) => v.status === "publicado") ?? versoes[0] ?? null,
    [versoes],
  );

  const avisoTexto = versaoPublicada?.aviso_texto ?? DEFAULT_ORCAMENTO_AVISO;

  function run<T extends { success: boolean; error?: string }>(
    action: () => Promise<T>,
    okMessage?: string,
    onOk?: (result: T) => void,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Falha na operação.");
        return;
      }
      if (okMessage) setSuccess(okMessage);
      onOk?.(result);
      onRefresh();
    });
  }

  function publicUrlFromPath(urlPath: string) {
    if (typeof window === "undefined") return urlPath;
    return `${window.location.origin}${urlPath}`;
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setSuccess("Link copiado.");
  }

  return (
    <SectionCard
      title="Envio ao cliente"
      description="Publique o orçamento, gere link de inspeção e compartilhe com o cliente."
      contentClassName="pt-0 space-y-4"
    >
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {success ? (
        <FeedbackMessage variant="success">{success}</FeedbackMessage>
      ) : null}

      <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Aviso ao cliente</p>
        <p>{avisoTexto}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || pending}
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          onClick={() =>
            run(
              () =>
                publicarOrcamentoVersaoAction(tenantSlug, osId, {
                  validadeDias: 15,
                }),
              "Orçamento publicado.",
            )
          }
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          Publicar orçamento
        </button>

        <button
          type="button"
          disabled={disabled || pending}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          onClick={() =>
            run(
              () =>
                criarCompartilhamentoAction(tenantSlug, osId, {
                  canal: "link",
                  validadeHoras: Number(validadeHoras) || 72,
                  versaoOrcamentoId: versaoSelecionada || versaoPublicada?.id || undefined,
                }),
              "Link gerado.",
              (result) => {
                if ("urlPath" in result && result.urlPath) {
                  setLastLink(publicUrlFromPath(result.urlPath));
                }
              },
            )
          }
        >
          <Link2 className="size-3.5" />
          Gerar link
        </button>

        {lastLink ? (
          <>
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              onClick={() => copyText(lastLink)}
            >
              <Copy className="size-3.5" />
              Copiar link
            </button>
            {whatsappPhone ? (
              <a
                href={buildWhatsAppDeepLink(
                  whatsappPhone,
                  `Olá! Segue o link da inspeção da OS #${osNumero}: ${lastLink}`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
            ) : null}
          </>
        ) : null}

        <button
          type="button"
          disabled={disabled || pending}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          onClick={() =>
            run(async () => {
              const result = await getInspecaoPdfAction(
                tenantSlug,
                osId,
                versaoSelecionada || versaoPublicada?.id || null,
              );
              if (!result.success) return result;
              const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
              const blob = new Blob([bytes], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = result.filename;
              a.click();
              URL.revokeObjectURL(url);
              return { success: true as const };
            }, "PDF baixado.")
          }
        >
          <Download className="size-3.5" />
          Baixar PDF
        </button>

        <button
          type="button"
          disabled
          title={emailConfigured ? undefined : "E-mail não configurado"}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5 opacity-50",
          )}
        >
          <Mail className="size-3.5" />
          {emailConfigured ? "E-mail" : "E-mail (não configurado)"}
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Validade do link (horas)</span>
          <Input
            type="number"
            min={1}
            max={720}
            value={validadeHoras}
            onChange={(e) => setValidadeHoras(e.target.value)}
            disabled={disabled || pending}
            className="h-9"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Versão do orçamento</span>
          <select
            value={versaoSelecionada || versaoPublicada?.id || ""}
            onChange={(e) => setVersaoSelecionada(e.target.value)}
            disabled={disabled || pending || versoes.length === 0}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {versoes.length === 0 ? (
              <option value="">Nenhuma versão</option>
            ) : (
              versoes.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versao} · {v.status} · {formatCurrency(v.valor_total)}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {lastLink ? (
        <p className="break-all rounded-lg border bg-muted/30 px-3 py-2 text-xs">
          {lastLink}
        </p>
      ) : null}

      {versoes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Versões publicadas</p>
          <ul className="space-y-1 text-xs">
            {versoes.map((v) => (
              <li key={v.id} className="flex flex-wrap justify-between gap-2 rounded border px-2 py-1">
                <span>
                  v{v.versao} · {v.status}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(v.publicado_em)} · {formatCurrency(v.valor_total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {shares.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Compartilhamentos</p>
          <ul className="space-y-1 text-xs">
            {shares.map((share) => (
              <li
                key={share.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1"
              >
                <span>
                  {share.token_prefix}… · {share.canal} · {share.status}
                </span>
                <span className="text-muted-foreground">
                  expira {formatDate(share.expira_em)} · {share.visualizacoes} views
                </span>
                {share.status === "ativo" ? (
                  <button
                    type="button"
                    disabled={disabled || pending}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    onClick={() =>
                      run(
                        () =>
                          revogarCompartilhamentoAction(tenantSlug, osId, share.id),
                        "Link revogado.",
                      )
                    }
                  >
                    Revogar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}
