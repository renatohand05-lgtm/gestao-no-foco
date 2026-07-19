"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, MessageSquare, Phone, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import {
  CHECKLIST_CLASSIFICACAO_CONFIG,
  mapStatusToClassificacao,
  type ChecklistClassificacao,
} from "@/lib/ordens/checklist-classificacao";
import type { InspecaoPublicaPayload } from "@/lib/ordens/aprovacao-publica-service";
import { DEFAULT_ORCAMENTO_AVISO } from "@/lib/ordens/inspecao-aviso";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  data: InspecaoPublicaPayload | null;
  errorCode?: string | null;
};

type OrcamentoItem = {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  recomendacao?: string | null;
};

type ChecklistItem = {
  id: string;
  item_label: string;
  classificacao?: string | null;
  categoria?: string | null;
  observacao?: string | null;
};

type Diagnostico = {
  sintoma_relatado?: string | null;
  diagnostico_tecnico?: string | null;
  causa_provavel?: string | null;
  recomendacao?: string | null;
  observacoes_cliente?: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  token_invalido: "Este link não é válido ou não foi encontrado.",
  token_expirado: "Este link expirou. Solicite um novo link à oficina.",
  token_revogado: "Este link foi revogado pela oficina.",
  rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

function resolveClassificacao(value: string | null | undefined): ChecklistClassificacao {
  if (!value) return "nao_verificado";
  return mapStatusToClassificacao(value);
}

export function InspecaoPublicaClient({ token, data, errorCode }: Props) {
  const [pending, startTransition] = useTransition();
  const [aceiteAviso, setAceiteAviso] = useState(false);
  const [nome, setNome] = useState("");
  const [observacao, setObservacao] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [itemDecisoes, setItemDecisoes] = useState<
    Record<string, "aprovado" | "reprovado">
  >({});

  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "Não foi possível carregar a inspeção.")
    : null;

  const os = data?.os as Record<string, unknown> | undefined;
  const veiculo = data?.veiculo as Record<string, unknown> | undefined;
  const orcamento = data?.orcamento as Record<string, unknown> | null | undefined;
  const diagnosticos = (data?.diagnosticos ?? []) as Diagnostico[];
  const itens = (data?.itens ?? []) as OrcamentoItem[];

  const avisoTexto =
    (orcamento?.aviso_texto as string | undefined) ?? DEFAULT_ORCAMENTO_AVISO;

  const groupedChecklist = useMemo(() => {
    const checklist = (data?.checklist ?? []) as ChecklistItem[];
    const map = new Map<string, ChecklistItem[]>();
    for (const item of checklist) {
      const cat = item.categoria?.trim() || "Inspeção";
      const list = map.get(cat) ?? [];
      list.push(item);
      map.set(cat, list);
    }
    return [...map.entries()];
  }, [data?.checklist]);

  function submit(modo: "total" | "parcial" | "reprovar" | "contato") {
    setFeedback(null);
    startTransition(async () => {
      const body: Record<string, unknown> = {
        modo,
        nome: nome.trim() || null,
        observacao: observacao.trim() || null,
        aceiteAviso: modo === "contato" ? true : aceiteAviso,
      };

      if (modo === "parcial") {
        body.itens = Object.entries(itemDecisoes).map(([id, decisao]) => ({
          id,
          decisao,
        }));
      }

      const res = await fetch(`/api/inspecao/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setFeedback({
          type: "error",
          message: json.error ?? "Não foi possível registrar sua resposta.",
        });
        return;
      }

      const messages: Record<string, string> = {
        total: "Orçamento aprovado! A oficina será notificada.",
        parcial: "Aprovação parcial registrada. A oficina entrará em contato.",
        reprovar: "Resposta registrada. A oficina será notificada.",
        contato: "Solicitação de contato enviada à oficina.",
      };
      setFeedback({ type: "success", message: messages[modo] });
    });
  }

  function toggleItem(id: string, decisao: "aprovado" | "reprovado") {
    setItemDecisoes((prev) => ({ ...prev, [id]: decisao }));
  }

  if (errorMessage) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <XCircle className="mb-3 size-10 text-destructive" />
          <h1 className="text-lg font-semibold">Link indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Carregando inspeção…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gradient-to-b from-muted/30 to-background pb-24">
      <header className="border-b bg-card/80 px-4 py-6 backdrop-blur">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Inspeção digital
        </p>
        <h1 className="mt-1 text-xl font-semibold">{data.oficina?.nome ?? "Oficina"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          OS #{String(os?.numero ?? "—")} ·{" "}
          {String(veiculo?.placa_mascarada ?? "—")}{" "}
          {veiculo?.modelo ? `· ${String(veiculo.modelo)}` : ""}
        </p>
        {data.cliente?.nome ? (
          <p className="text-sm">{data.cliente.nome}</p>
        ) : null}
      </header>

      <main className="space-y-4 px-4 py-6">
        {feedback ? (
          <FeedbackMessage variant={feedback.type === "success" ? "success" : "error"}>
            {feedback.message}
          </FeedbackMessage>
        ) : null}

        {os?.reclamacao ? (
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Reclamação</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {String(os.reclamacao)}
            </p>
          </section>
        ) : null}

        {groupedChecklist.length > 0 ? (
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Checklist de entrada</h2>
            <div className="space-y-4">
              {groupedChecklist.map(([categoria, items]) => (
                <div key={categoria}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {categoria}
                  </p>
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const cls = resolveClassificacao(item.classificacao);
                      const cfg = CHECKLIST_CLASSIFICACAO_CONFIG[cls];
                      return (
                        <li
                          key={item.id}
                          className="rounded-lg border border-border/60 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm">{item.item_label}</span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                cfg.colorClass,
                              )}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          {item.observacao ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.observacao}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {diagnosticos.length > 0 ? (
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Diagnóstico</h2>
            <div className="space-y-3">
              {diagnosticos.map((d, i) => {
                const texto =
                  d.observacoes_cliente?.trim() ||
                  d.diagnostico_tecnico?.trim() ||
                  d.recomendacao?.trim() ||
                  d.causa_provavel?.trim() ||
                  d.sintoma_relatado?.trim();
                if (!texto) return null;
                return (
                  <div key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {texto}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {itens.length > 0 ? (
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Orçamento</h2>
              {orcamento?.valor_total != null ? (
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(Number(orcamento.valor_total))}
                </p>
              ) : null}
            </div>
            <ul className="space-y-2">
              {itens.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantidade} × {formatCurrency(item.valor_unitario)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatCurrency(item.valor_total)}
                    </p>
                  </div>
                  {itens.length > 1 ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleItem(item.id, "aprovado")}
                        className={cn(
                          buttonVariants({
                            variant:
                              itemDecisoes[item.id] === "aprovado"
                                ? "default"
                                : "outline",
                            size: "sm",
                          }),
                          "flex-1 text-xs",
                        )}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleItem(item.id, "reprovado")}
                        className={cn(
                          buttonVariants({
                            variant:
                              itemDecisoes[item.id] === "reprovado"
                                ? "destructive"
                                : "outline",
                            size: "sm",
                          }),
                          "flex-1 text-xs",
                        )}
                      >
                        Reprovar
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold">Aviso importante</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{avisoTexto}</p>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={aceiteAviso}
              disabled={pending}
              onChange={(e) => setAceiteAviso(e.target.checked)}
            />
            <span>Li e concordo com o aviso acima.</span>
          </label>
        </section>

        <section className="space-y-2 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Sua resposta</h2>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome (opcional)"
            disabled={pending}
            className="h-10"
          />
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações (opcional)"
            rows={2}
            disabled={pending}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending || !aceiteAviso || itens.length === 0}
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            onClick={() => submit("total")}
          >
            <CheckCircle2 className="size-3.5" />
            Aprovar total
          </button>
          <button
            type="button"
            disabled={pending || !aceiteAviso || itens.length < 2}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            onClick={() => submit("parcial")}
          >
            Aprovação parcial
          </button>
          <button
            type="button"
            disabled={pending || !aceiteAviso}
            className={cn(
              buttonVariants({ variant: "destructive", size: "sm" }),
              "gap-1.5",
            )}
            onClick={() => submit("reprovar")}
          >
            <XCircle className="size-3.5" />
            Reprovar
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            onClick={() => submit("contato")}
          >
            <Phone className="size-3.5" />
            Quero contato
          </button>
        </div>
        <p className="mx-auto mt-2 flex max-w-lg items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <MessageSquare className="size-3" />
          Resposta registrada de forma segura
        </p>
      </footer>
    </div>
  );
}
