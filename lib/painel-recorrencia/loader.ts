import { civilDateInTimezone, DEFAULT_TENANT_TIMEZONE } from "@/lib/dashboard/tenant-timezone";
import { composeDreTotals, type DreLedgerEntry } from "@/lib/dre";
import { createDreService } from "@/lib/financeiro/dre-service";
import { createClient } from "@/lib/supabase/server";

import {
  calcularPainelRecorrencia,
  mesAnterior,
  proximoMes,
  ultimoDia,
  type ClienteRecorrente,
  type FinanceiroMes,
  type PainelRecorrencia,
} from "./compute";

const NOME_CLIENTE_TECNICO = "Receitas consolidadas (planilha)";
const MINIMO_DE_CLIENTES = 3;
const MESES_DE_FINANCEIRO = 18;
const MESES_POR_CONSULTA = 3;
const TAMANHO_PAGINA = 1000;

type LinhaCliente = {
  nome: string;
  ativo: boolean | null;
  segmento: string | null;
  data_referencia: string | null;
  data_fechamento: string | null;
  valor_estimado: number | null;
  motivo_perda: string | null;
  estagio_funil: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any };

/** A empresa tem uma carteira recorrente (clientes com data de entrada e valor mensal)? */
export async function temCarteiraRecorrente(tenantId: string): Promise<boolean> {
  const supabase = (await createClient()) as unknown as Db;
  const { count, error } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .not("data_referencia", "is", null)
    .gt("valor_estimado", 0)
    .in("estagio_funil", ["fechado", "perdido"]);
  return !error && (count ?? 0) >= MINIMO_DE_CLIENTES;
}

async function lerClientes(tenantId: string): Promise<ClienteRecorrente[]> {
  const supabase = (await createClient()) as unknown as Db;
  const out: LinhaCliente[] = [];
  for (let de = 0; ; de += TAMANHO_PAGINA) {
    const { data, error } = await supabase
      .from("clientes")
      .select(
        "nome, ativo, segmento, data_referencia, data_fechamento, valor_estimado, motivo_perda, estagio_funil",
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("estagio_funil", ["fechado", "perdido"])
      .order("id")
      .range(de, de + TAMANHO_PAGINA - 1);
    if (error) throw new Error(error.message);
    const pagina = (data ?? []) as LinhaCliente[];
    out.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) break;
  }
  return out
    .filter((c) => !c.nome.endsWith(NOME_CLIENTE_TECNICO))
    .map((c) => ({
      nome: c.nome,
      ativo: Boolean(c.ativo),
      entrada: c.data_referencia,
      saida: c.ativo ? null : c.data_fechamento,
      mrr: c.valor_estimado == null ? null : Number(c.valor_estimado),
      nicho: c.segmento,
      motivo: c.motivo_perda,
    }));
}

/** Resultado de cada mês pela DRE do portal (consulta em janelas curtas para não estourar o limite de linhas). */
async function lerFinanceiro(tenantId: string, mesHoje: string): Promise<FinanceiroMes[]> {
  const dre = await createDreService(tenantId);

  let primeiro = mesHoje;
  for (let i = 1; i < MESES_DE_FINANCEIRO; i++) primeiro = mesAnterior(primeiro);

  const janelas: Array<{ de: string; ate: string }> = [];
  for (let m = primeiro; m <= mesHoje; ) {
    let fim = m;
    for (let i = 1; i < MESES_POR_CONSULTA && proximoMes(fim) <= mesHoje; i++) fim = proximoMes(fim);
    janelas.push({ de: `${m}-01`, ate: ultimoDia(fim) });
    m = proximoMes(fim);
  }

  const porMes = new Map<string, DreLedgerEntry[]>();
  // Em lotes de 3 consultas ao mesmo tempo.
  for (let i = 0; i < janelas.length; i += 3) {
    const resultados = await Promise.all(
      janelas.slice(i, i + 3).map((j) => dre.getDre({ dataDe: j.de, dataAte: j.ate })),
    );
    for (const r of resultados) {
      for (const item of r.drillItems ?? []) {
        const mes = String(item.competencia).slice(0, 7);
        const lista = porMes.get(mes) ?? [];
        lista.push({ linha: item.linha, valor: item.valor } as DreLedgerEntry);
        porMes.set(mes, lista);
      }
    }
  }

  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, entradas]) => {
      const t = composeDreTotals(entradas);
      const receita = t.receita_bruta + t.receitas_financeiras;
      return {
        mes,
        receita,
        despesa: receita - t.resultado_final,
        resultado: t.resultado_final,
        comerciais: t.despesas_comerciais,
        pessoal: t.despesas_pessoal,
      };
    });
}

export async function carregarPainelRecorrencia(tenantId: string): Promise<PainelRecorrencia> {
  const hoje = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);
  const [clientes, financeiro] = await Promise.all([
    lerClientes(tenantId),
    lerFinanceiro(tenantId, hoje.slice(0, 7)),
  ]);
  return calcularPainelRecorrencia({ clientes, financeiro, hoje });
}
