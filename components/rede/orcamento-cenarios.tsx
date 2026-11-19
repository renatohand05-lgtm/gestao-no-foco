"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { KpiCard } from "@/components/rede/kpi-card";
import { ComparativoCenariosGrafico, CurvaGrafico } from "@/components/rede/orcamento-graficos";
import { TabelaDre } from "@/components/rede/dre-tabelas";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { definirCenarioPadraoAction, excluirCenarioAction, restaurarCenarioBaseAction, salvarCenarioAction } from "@/lib/rede/actions-financeiro";
import { brl, pct1 } from "@/lib/rede/calculo";
import { lerNumero } from "@/lib/rede/csv";
import { CURVA_PADRAO, ORCAMENTO_PADRAO, orcDre, projetarCurva, resumirCenario, type ResumoCenario } from "@/lib/rede/financeiro";
import type { BaseDelivery, Cenario } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
const paraTexto = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const NOVO = "novo";

type CampoNum = "faturamento" | "mixDelivery" | "cmv" | "folha" | "impostos" | "custoDelivery" | "manutencao" | "marketing" | "cto" | "agua" | "energia";
const CAMPOS: { k: CampoNum; rotulo: string; un: "%" | "R$" }[] = [
  { k: "faturamento", rotulo: "Faturamento-alvo mensal (loja madura)", un: "R$" },
  { k: "mixDelivery", rotulo: "Participação do delivery", un: "%" },
  { k: "cmv", rotulo: "CMV", un: "%" },
  { k: "folha", rotulo: "Folha de pagamento", un: "%" },
  { k: "impostos", rotulo: "Impostos", un: "%" },
  { k: "custoDelivery", rotulo: "Custos de delivery", un: "%" },
  { k: "manutencao", rotulo: "Manutenção", un: "%" },
  { k: "marketing", rotulo: "Marketing, royalties, escritório e fundo", un: "%" },
  { k: "cto", rotulo: "CTO por mês", un: "R$" },
  { k: "agua", rotulo: "Água por mês", un: "R$" },
  { k: "energia", rotulo: "Energia por mês", un: "R$" },
];

type Props = { slug: string; cenarios: Cenario[]; editavel: boolean; onSelecionar?: (id: string) => void };

export function OrcamentoCenarios({ slug, cenarios, editavel }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const padrao = cenarios.find((c) => c.padrao) ?? cenarios[0] ?? null;
  const [id, setId] = useState<string>(padrao?.id ?? NOVO);
  const [msg, setMsg] = useState<Msg>(null);
  const [confirmar, setConfirmar] = useState<"excluir" | "restaurar" | null>(null);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);
  const [copiarDe, setCopiarDe] = useState<Cenario | null>(null);

  const atual = cenarios.find((c) => c.id === id) ?? null;

  const executarAcao = (acao: () => Promise<{ success: boolean; error?: string }>, ok: string) => {
    setErroConfirmar(null);
    iniciar(async () => {
      const r = await acao();
      if (r.success) {
        setConfirmar(null);
        setMsg({ tipo: "success", texto: ok });
        router.refresh();
      } else if (confirmar) setErroConfirmar(r.error ?? "Não foi possível concluir.");
      else setMsg({ tipo: "error", texto: r.error ?? "Não foi possível concluir." });
    });
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Orçamento de uma loja nova" description="Escolha um cenário para ver o DRE da loja madura, a curva de maturação e o resultado do 1º ano. Edite as premissas e veja o efeito antes de salvar.">
        <div className="space-y-4">
          {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 space-y-1">
              <Label htmlFor="oc-cenario">Cenário</Label>
              <NativeSelect id="oc-cenario" value={id} onChange={(e) => { setId(e.target.value); setCopiarDe(null); setMsg(null); }}>
                {cenarios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.padrao ? " ★ padrão" : ""}
                    {c.origem === "exemplo" ? " (exemplo)" : ""}
                  </option>
                ))}
                {editavel ? <option value={NOVO}>+ Novo cenário…</option> : null}
              </NativeSelect>
            </div>
            {editavel && atual ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => { setCopiarDe(atual); setId(NOVO); setMsg(null); }}>
                  Duplicar
                </Button>
                {!atual.padrao ? (
                  <Button type="button" variant="outline" size="sm" disabled={pendente} onClick={() => executarAcao(() => definirCenarioPadraoAction(slug, atual.id), `“${atual.nome}” agora é o cenário padrão (usado nas unidades sem cenário próprio).`)}>
                    Definir como padrão
                  </Button>
                ) : null}
                {!atual.padrao && cenarios.length > 1 ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setErroConfirmar(null); setConfirmar("excluir"); }}>
                    Excluir
                  </Button>
                ) : null}
              </>
            ) : null}
            {editavel ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setErroConfirmar(null); setConfirmar("restaurar"); }}>
                Restaurar “Base (modelo original)”
              </Button>
            ) : null}
          </div>
          {!editavel ? <FeedbackMessage variant="info">Seu perfil pode consultar o orçamento, mas não alterar cenários.</FeedbackMessage> : null}
          <FormularioCenario
            key={`${id}|${copiarDe?.id ?? ""}|${atual ? JSON.stringify(atual) : ""}`}
            slug={slug}
            cenario={id === NOVO ? null : atual}
            modelo={copiarDe ?? atual ?? padrao}
            editavel={editavel}
            pendente={pendente}
            iniciar={iniciar}
            aoSalvar={(m, novoId) => {
              setMsg(m);
              if (m.tipo === "success") {
                if (novoId) setId(novoId);
                setCopiarDe(null);
                router.refresh();
              }
            }}
          />
        </div>
      </SectionCard>

      <ComparativoCenarios cenarios={cenarios} />

      <ConfirmDialog
        open={confirmar === "excluir"}
        onOpenChange={(o) => !o && setConfirmar(null)}
        title="Excluir este cenário?"
        description={atual ? `“${atual.nome}” será excluído. Unidades que usavam este cenário passam a usar o cenário padrão. A exclusão fica registrada no histórico.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroConfirmar}
        onConfirm={() => atual && executarAcao(async () => { const r = await excluirCenarioAction(slug, atual.id); if (r.success) setId(padrao && padrao.id !== atual.id ? padrao.id : (cenarios.find((c) => c.id !== atual.id)?.id ?? NOVO)); return r; }, "Cenário excluído.")}
      />
      <ConfirmDialog
        open={confirmar === "restaurar"}
        onOpenChange={(o) => !o && setConfirmar(null)}
        title="Restaurar o cenário Base?"
        description="O cenário “Base (modelo original)” volta a faturamento R$ 500.000, CMV 21%, folha 19%, impostos 10%, delivery 28% sobre a venda do delivery, manutenção 1,5%, marketing 7%, CTO R$ 12.000, água R$ 1.500, energia R$ 4.500 e curva 70/80/90/95/100/100. Se foi excluído, é recriado. Outros cenários não mudam."
        confirmLabel="Restaurar"
        loading={pendente}
        error={erroConfirmar}
        onConfirm={() => executarAcao(() => restaurarCenarioBaseAction(slug), "Cenário Base restaurado ao modelo original.")}
      />
    </div>
  );
}

/* ============================================================ formulário com prévia ao vivo */

type FormProps = {
  slug: string;
  cenario: Cenario | null;
  modelo: Cenario | null;
  editavel: boolean;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoSalvar: (m: NonNullable<Msg>, novoId?: string) => void;
};

function FormularioCenario({ slug, cenario, modelo, editavel, pendente, iniciar, aoSalvar }: FormProps) {
  const origem = cenario ?? modelo;
  const ehNovo = cenario == null;
  const [nome, setNome] = useState(ehNovo ? (modelo ? `${modelo.nome} (cópia)`.slice(0, 80) : "Novo cenário") : (cenario?.nome ?? ""));
  const [descricao, setDescricao] = useState(origem?.descricao ?? "");
  const [valores, setValores] = useState<Record<CampoNum, string>>(() => {
    const o = origem;
    const base = ORCAMENTO_PADRAO;
    return Object.fromEntries(CAMPOS.map((c) => [c.k, paraTexto(o ? (o[c.k] as number) : (base[c.k] as number))])) as Record<CampoNum, string>;
  });
  const [baseDel, setBaseDel] = useState<BaseDelivery>(origem?.baseDelivery ?? "delivery");
  const [curva, setCurva] = useState<string[]>((origem?.curva ?? [...CURVA_PADRAO]).map((v) => paraTexto(v)));

  const numeros = Object.fromEntries(CAMPOS.map((c) => [c.k, lerNumero(valores[c.k])])) as Record<CampoNum, number | null>;
  const curvaNum = curva.map((v) => lerNumero(v));
  const valido = Object.values(numeros).every((v) => v != null) && curvaNum.every((v) => v != null) && curvaNum.length > 0 && (numeros.faturamento ?? 0) > 0;

  const rascunho: Cenario | null = valido
    ? {
        id: cenario?.id ?? "rascunho",
        nome: nome || "Cenário",
        descricao: null,
        faturamento: numeros.faturamento as number,
        mixDelivery: numeros.mixDelivery as number,
        cmv: numeros.cmv as number,
        folha: numeros.folha as number,
        impostos: numeros.impostos as number,
        custoDelivery: numeros.custoDelivery as number,
        baseDelivery: baseDel,
        manutencao: numeros.manutencao as number,
        marketing: numeros.marketing as number,
        cto: numeros.cto as number,
        agua: numeros.agua as number,
        energia: numeros.energia as number,
        curva: curvaNum as number[],
        padrao: cenario?.padrao ?? false,
        origem: "manual",
      }
    : null;
  const resumo: ResumoCenario | null = rascunho ? resumirCenario(rascunho) : null;
  const maduro = rascunho ? orcDre(rascunho) : null;
  const curvaCalc = rascunho ? projetarCurva(rascunho, rascunho.curva) : null;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rascunho) {
      aoSalvar({ tipo: "error", texto: "Confira os números: use apenas dígitos, vírgula ou ponto (e informe o faturamento e a curva)." });
      return;
    }
    iniciar(async () => {
      const r = await salvarCenarioAction(slug, {
        id: cenario?.id,
        nome,
        descricao: descricao.trim() || null,
        faturamento: rascunho.faturamento,
        mixDelivery: rascunho.mixDelivery,
        cmv: rascunho.cmv,
        folha: rascunho.folha,
        impostos: rascunho.impostos,
        custoDelivery: rascunho.custoDelivery,
        baseDelivery: rascunho.baseDelivery,
        manutencao: rascunho.manutencao,
        marketing: rascunho.marketing,
        cto: rascunho.cto,
        agua: rascunho.agua,
        energia: rascunho.energia,
        curva: rascunho.curva,
      });
      aoSalvar(r.success ? { tipo: "success", texto: `Cenário “${nome}” salvo.` } : { tipo: "error", texto: r.error }, r.success ? r.id : undefined);
    });
  };

  return (
    <form onSubmit={salvar} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="oc-nome">Nome do cenário</Label>
          <Input id="oc-nome" maxLength={80} value={nome} disabled={!editavel} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="oc-desc">Descrição (opcional)</Label>
          <Input id="oc-desc" maxLength={300} value={descricao} disabled={!editavel} onChange={(e) => setDescricao(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAMPOS.map((c) => (
          <div key={c.k} className="space-y-1">
            <Label htmlFor={`oc-${c.k}`}>
              {c.rotulo} ({c.un})
            </Label>
            <Input id={`oc-${c.k}`} inputMode="decimal" value={valores[c.k]} disabled={!editavel} onChange={(e) => setValores((v) => ({ ...v, [c.k]: e.target.value }))} />
          </div>
        ))}
        <div className="space-y-1">
          <Label htmlFor="oc-base">Custo de delivery incide sobre</Label>
          <NativeSelect id="oc-base" value={baseDel} disabled={!editavel} onChange={(e) => setBaseDel(e.target.value as BaseDelivery)}>
            <option value="delivery">Venda do delivery</option>
            <option value="total">Faturamento total</option>
          </NativeSelect>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Curva de maturação (% do faturamento-alvo em cada mês de operação)</legend>
        <p className="text-xs text-muted-foreground">A folha fica fixa em reais (folha % × faturamento-alvo), por isso pesa mais nos primeiros meses. Depois da curva, a loja fica madura (100%).</p>
        <div className="flex flex-wrap items-end gap-2">
          {curva.map((v, i) => (
            <div key={i} className="w-20 space-y-1">
              <Label htmlFor={`oc-c-${i}`} className="text-xs">
                Mês {i + 1}
              </Label>
              <Input id={`oc-c-${i}`} inputMode="decimal" value={v} disabled={!editavel} onChange={(e) => setCurva((l) => l.map((x, idx) => (idx === i ? e.target.value : x)))} />
            </div>
          ))}
          {editavel ? (
            <div className="flex gap-1 pb-0.5">
              <Button type="button" variant="outline" size="icon-sm" aria-label="Adicionar mês à curva" disabled={curva.length >= 12} onClick={() => setCurva((l) => [...l, "100"])}>
                <Plus aria-hidden />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Remover último mês da curva" disabled={curva.length <= 1} onClick={() => setCurva((l) => l.slice(0, -1))}>
                <X aria-hidden />
              </Button>
            </div>
          ) : null}
        </div>
      </fieldset>

      {editavel ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={pendente || !valido}>
            {pendente ? "Salvando…" : ehNovo ? "Criar cenário" : "Salvar alterações"}
          </Button>
        </div>
      ) : null}

      {resumo && maduro && curvaCalc ? (
        <div className="space-y-4 border-t border-border pt-4" aria-live="polite">
          <p className="text-sm font-medium">Prévia com os valores acima</p>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resultado do cenário">
            <KpiCard rotulo="Resultado mensal (loja madura)" valor={brl(resumo.resultadoMensal)} detalhe={`margem ${pct1(resumo.margem)}`} tom={resumo.resultadoMensal >= 0 ? "ok" : "critico"} />
            <KpiCard rotulo="Resultado anual (loja madura)" valor={brl(resumo.resultadoAnual)} detalhe="12 meses na maturidade" />
            <KpiCard rotulo="Resultado do 1º ano" valor={brl(resumo.primeiroAno)} detalhe={`curva de ${rascunhoMeses(curvaNum.length)} + restante maduro`} tom={resumo.primeiroAno >= 0 ? "ok" : "critico"} />
            <KpiCard rotulo="Ponto de equilíbrio" valor={resumo.pe != null ? brl(resumo.pe) : "—"} detalhe={resumo.pePct != null ? `${pct1(resumo.pePct)} do faturamento-alvo` : "custos variáveis acima de 100%"} />
            <KpiCard rotulo="1º mês com resultado positivo" valor={resumo.mesPositivo != null ? `mês ${resumo.mesPositivo}` : "fora da curva"} detalhe="dentro da curva informada" tom={resumo.mesPositivo != null ? "ok" : "atencao"} />
          </section>
          <TabelaDre titulo="DRE da loja madura" descricao="Faturamento-alvo e premissas do cenário (100% da curva)." colunas={[{ nome: "Loja madura", d: maduro, estimadas: null }]} />
          <div className="space-y-3">
            <p className="text-sm font-medium">Curva de maturação mês a mês</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Mês</th>
                    <th className="py-2 pr-3 text-right font-medium">% do alvo</th>
                    <th className="py-2 pr-3 text-right font-medium">Faturamento</th>
                    <th className="py-2 pr-3 text-right font-medium">Resultado</th>
                    <th className="py-2 text-right font-medium">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {curvaCalc.linhas.map((l, i) => (
                    <tr key={l.mes} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">{l.mes}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{pct1(l.pct)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl(l.d.fat)}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums ${l.d.res < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{brl(l.d.res)}</td>
                      <td className={`py-2 text-right tabular-nums ${curvaCalc.acumulado[i] < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{brl(curvaCalc.acumulado[i])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CurvaGrafico rotulos={curvaCalc.linhas.map((l) => `Mês ${l.mes}`)} resultado={curvaCalc.linhas.map((l) => l.d.res)} acumulado={curvaCalc.acumulado} />
            <p className="text-xs text-muted-foreground">Resultado do 1º ano = soma dos meses da curva + os meses restantes do ano com a loja madura ({brl(resumo.primeiroAno)}).</p>
          </div>
        </div>
      ) : (
        <FeedbackMessage variant="info">Preencha os números (apenas dígitos, vírgula ou ponto) para ver a prévia.</FeedbackMessage>
      )}
    </form>
  );
}

const rascunhoMeses = (n: number) => `${n} ${n === 1 ? "mês" : "meses"}`;

/* ============================================================ comparativo de cenários */

function ComparativoCenarios({ cenarios }: { cenarios: Cenario[] }) {
  const resumos = useMemo(() => cenarios.map(resumirCenario), [cenarios]);
  const linhasCsv: (string | number | null)[][] = [
    ["Cenário", "Faturamento-alvo (R$)", "Resultado mensal (R$)", "Margem (%)", "Ponto de equilíbrio (R$)", "Resultado anual (R$)", "Resultado do 1º ano (R$)", "1º mês positivo"],
    ...resumos.map((r) => [r.nome, r.faturamento, Math.round(r.resultadoMensal * 100) / 100, Math.round(r.margem * 10) / 10, r.pe == null ? null : Math.round(r.pe * 100) / 100, Math.round(r.resultadoAnual * 100) / 100, Math.round(r.primeiroAno * 100) / 100, r.mesPositivo]),
  ];
  return (
    <SectionCard title="Comparar cenários" description="Todos os cenários lado a lado: loja madura e primeiro ano.">
      {resumos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cenário cadastrado.</p>
      ) : (
        <div className="space-y-4">
          <AcoesExportar arquivo="orcamento-cenarios.csv" linhas={linhasCsv} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Cenário</th>
                  <th className="py-2 pr-3 text-right font-medium">Faturamento</th>
                  <th className="py-2 pr-3 text-right font-medium">Resultado mensal</th>
                  <th className="py-2 pr-3 text-right font-medium">Margem</th>
                  <th className="py-2 pr-3 text-right font-medium">Equilíbrio</th>
                  <th className="py-2 pr-3 text-right font-medium">Resultado anual</th>
                  <th className="py-2 pr-3 text-right font-medium">1º ano</th>
                  <th className="py-2 text-right font-medium">1º mês +</th>
                </tr>
              </thead>
              <tbody>
                {resumos.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.nome}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl(r.faturamento)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${r.resultadoMensal < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{brl(r.resultadoMensal)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{pct1(r.margem)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.pe != null ? brl(r.pe) : "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl(r.resultadoAnual)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${r.primeiroAno < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{brl(r.primeiroAno)}</td>
                    <td className="py-2 text-right tabular-nums">{r.mesPositivo != null ? `mês ${r.mesPositivo}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ComparativoCenariosGrafico cenarios={resumos.map((r) => ({ nome: r.nome, anual: r.resultadoAnual, primeiroAno: r.primeiroAno }))} />
        </div>
      )}
    </SectionCard>
  );
}
