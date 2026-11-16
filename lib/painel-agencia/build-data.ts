import { createClient } from "@/lib/supabase/server";

import snapshot from "./dados-planilha.json";

/**
 * Dados do Painel Executivo de agência (X Company), no mesmo formato `D` do painel HTML original.
 * - Base analítica (DRE, fluxo, reservas, funil, metas, churn mensal, planos): histórico importado da
 *   planilha SISTEM_XCOMPANY (também gravado em `planilha_dados`).
 * - Base de clientes: lida ao vivo da tabela `clientes` (status, saída e MRR refletem o sistema).
 */
export type PainelAgenciaCliente = {
  n: string;
  nicho: string;
  st: string;
  ent: string | null;
  sai: string | null;
  mrr: number;
  meses: number;
  fat: number;
  mot: string;
  g: string;
  cat: string;
  faixa: string;
};

export type PainelAgenciaDados = Record<string, unknown> & {
  clientes: PainelAgenciaCliente[];
};

type ClienteRow = {
  nome: string;
  ativo: boolean | null;
  segmento: string | null;
  data_referencia: string | null;
  data_fechamento: string | null;
  valor_estimado: number | null;
  motivo_perda: string | null;
  observacoes: string | null;
};

const key = (n: string, ent: string | null) =>
  `${n.trim().toUpperCase()}|${ent ?? ""}`;

function parseObs(obs: string | null) {
  const meses = /Meses ativos:\s*(\d+(?:[.,]\d+)?)/.exec(obs ?? "");
  const fat = /Faturamento gerado:\s*R\$\s*(\d+(?:[.,]\d+)?)/.exec(obs ?? "");
  const ges = /Gestor\(es\):\s*([^.]+)\./.exec(obs ?? "");
  return {
    meses: meses ? Number(meses[1].replace(",", ".")) : 0,
    fat: fat ? Number(fat[1].replace(",", ".")) : 0,
    g: ges ? ges[1].trim() : "",
  };
}

/** `null` quando o tenant não tem histórico de agência importado. */
export async function loadPainelAgenciaDados(
  tenantId: string,
): Promise<PainelAgenciaDados | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const untyped = supabase as unknown as { from: (t: string) => any };
  const marker = await untyped
    .from("planilha_dados")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("secao", "funil_vendas");
  if (marker.error || !marker.count) return null;

  const base = structuredClone(snapshot) as unknown as PainelAgenciaDados;

  const { data, error } = await supabase
    .from("clientes")
    .select(
      "nome, ativo, segmento, data_referencia, data_fechamento, valor_estimado, motivo_perda, observacoes",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .not("data_referencia", "is", null);

  if (error || !data?.length) return base;

  const rows = data as ClienteRow[];
  const byKey = new Map(rows.map((r) => [key(r.nome, r.data_referencia), r]));
  const seen = new Set<string>();

  const merged: PainelAgenciaCliente[] = base.clientes.map((c) => {
    const k = key(c.n, c.ent);
    const r = byKey.get(k);
    if (!r) return c;
    seen.add(k);
    return {
      ...c,
      st: r.ativo ? "ATIVO" : "CHURN",
      sai: r.ativo ? null : r.data_fechamento,
      mrr: Number(r.valor_estimado ?? c.mrr),
      mot: r.ativo ? "" : (r.motivo_perda ?? c.mot),
    };
  });

  for (const r of rows) {
    const k = key(r.nome, r.data_referencia);
    if (seen.has(k) || r.nome.startsWith("X Company —")) continue;
    if (base.clientes.some((c) => key(c.n, c.ent) === k)) continue;
    const o = parseObs(r.observacoes);
    merged.push({
      n: r.nome,
      nicho: r.segmento ?? "",
      st: r.ativo ? "ATIVO" : "CHURN",
      ent: r.data_referencia,
      sai: r.ativo ? null : r.data_fechamento,
      mrr: Number(r.valor_estimado ?? 0),
      meses: o.meses,
      fat: o.fat,
      mot: r.ativo ? "" : (r.motivo_perda ?? ""),
      g: o.g,
      cat: "",
      faixa: "",
    });
  }

  base.clientes = merged;

  const ativos = merged.filter((c) => c.st === "ATIVO");
  const kpi = base.kpiAcum as Record<string, unknown> | undefined;
  if (kpi) {
    kpi.mrr = ativos.reduce((s, c) => s + c.mrr, 0);
    kpi.ativos = ativos.length;
  }
  return base;
}
