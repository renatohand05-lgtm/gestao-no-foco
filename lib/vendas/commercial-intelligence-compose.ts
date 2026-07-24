/**
 * Inteligência Comercial — composição pura (Gate 18.3).
 * Sem SQL, sem margem inventada, sem status/origens inventados.
 */

export const CI_RESPONSAVEL_FALLBACK = "Não atribuído";

export const CI_CONVERSAO_FORMULA =
  "Taxa de conversão comercial = vendas faturadas no período ÷ vendas elegíveis criadas no período (orçamento, em andamento, faturado, cancelado).";

export const CI_PIPELINE_STAGES = [
  "orcamento",
  "em_andamento",
  "faturado",
  "cancelado",
] as const;

export type CiPipelineStage = (typeof CI_PIPELINE_STAGES)[number];

export const CI_PIPELINE_LABELS: Record<CiPipelineStage, string> = {
  orcamento: "Orçamento",
  em_andamento: "Em andamento",
  faturado: "Faturado",
  cancelado: "Cancelado",
};

export const CI_CANAL_LABELS: Record<string, string> = {
  balcao: "Venda rápida",
  os: "OS",
  ecommerce: "E-commerce",
  outro: "Outro",
};

/** Canais com sinal confiável (não padrao/vazio). */
export const CI_CANAL_CONFIAVEIS = new Set([
  "balcao",
  "os",
  "ecommerce",
  "outro",
]);

export const CI_HISTORICO_ETAPA_MSG = "Histórico de etapa indisponível.";

export const CI_ORIGEM_COBERTURA_BAIXA_MSG =
  "Parte das vendas não possui origem registrada.";

export const CI_CLIENTE_SEARCH_MIN_CHARS = 2;
export const CI_CLIENTE_SEARCH_DEBOUNCE_MS = 280;

export type CiResponsavelOrigem =
  | "vendedor_id"
  | "responsavel_comercial"
  | "criador_registro"
  | "fallback";

export type CiResponsavel = {
  id: string | null;
  nome: string;
  origem: CiResponsavelOrigem;
  confiavel: boolean;
};

export type CiVendaRow = {
  id: string;
  tenant_id?: string;
  numero: number | null;
  cliente_id: string | null;
  cliente_nome?: string | null;
  status: string;
  total: number;
  subtotal: number;
  desconto_total: number;
  data_venda: string | null;
  created_at: string;
  updated_at: string;
  vendedor_id: string | null;
  created_by: string | null;
  /** Responsável comercial explícito (quando distinto de vendedor_id). */
  responsavel_comercial_id?: string | null;
  canal_venda: string | null;
  deleted_at?: string | null;
  tipo_item_agg?: Array<{ tipo: string; descricao: string; total: number; qtd: number }>;
};

export type CiOsOficinaRow = {
  id: string;
  status: string;
  valor_total: number;
  numero?: number | null;
};

export type CiFilters = {
  de: string;
  ate: string;
  responsavelId?: string | null;
  origem?: string | null;
  status?: string | null;
  clienteId?: string | null;
};

export type CiMetricNumber = {
  value: number | null;
  available: boolean;
  zeroReal?: boolean;
};

export type CiKpis = {
  faturamentoPeriodo: CiMetricNumber;
  quantidadeFaturadas: CiMetricNumber;
  ticketMedio: CiMetricNumber;
  valorEmNegociacao: CiMetricNumber;
  orcamentosAguardando: CiMetricNumber;
  taxaConversaoComercial: CiMetricNumber;
  vendasCanceladas: CiMetricNumber;
  valorPerdido: CiMetricNumber;
  descontoConcedido: CiMetricNumber;
  clientesCompradores: CiMetricNumber;
  conversaoNumerador: number;
  conversaoDenominador: number;
  conversaoFormula: string;
};

export type CiPipelineStageRow = {
  stage: CiPipelineStage;
  label: string;
  quantidade: number;
  valor: number;
  participacaoPct: number | null;
};

export type CiOficinaStrip = {
  quantidade: number;
  valor: number;
  porStatus: Array<{ status: string; label: string; quantidade: number; valor: number }>;
};

export type CiActionItem = {
  id: string;
  clienteNome: string;
  valor: number;
  status: string;
  statusLabel: string;
  responsavel: CiResponsavel;
  acao: string;
  motivo: string;
  hrefKind: "venda";
  hrefId: string;
};

export type CiRankingRow = {
  key: string;
  label: string;
  valor: number;
  quantidade: number;
  ticketMedio: number | null;
  participacaoPct: number | null;
};

export type CiMetaSnapshot = {
  available: boolean;
  valorMeta: number | null;
  realizado: number;
  diferenca: number | null;
  percentual: number | null;
  projecao: number | null;
  necessarioPorDiaUtil: number | null;
  ritmoAtual: number | null;
  ritmoEsperado: number | null;
  status: string | null;
};

export type CiDataCoverage = {
  totalAvaliadas: number;
  comOrigem: number;
  semOrigem: number;
  coberturaOrigemPct: number | null;
  coberturaOrigemBaixa: boolean;
  comResponsavelConfirmado: number;
  semResponsavelConfirmado: number;
  coberturaResponsavelPct: number | null;
  semCliente: number;
  avisoOrigem: string | null;
};

export type CiComposeInput = {
  vendas: CiVendaRow[];
  osOficina?: CiOsOficinaRow[];
  filters: CiFilters;
  profileNames?: Record<string, string>;
  vipClienteIds?: Set<string> | string[];
  meta?: CiMetaSnapshot | null;
  now?: Date;
  altoValorLimiar?: number;
  descontoAltoPct?: number;
  staleHours?: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = String(iso).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function inPeriod(day: string | null, de: string, ate: string): boolean {
  if (!day) return false;
  return day >= de && day <= ate;
}

function metric(
  value: number | null,
  available: boolean,
  zeroReal = false,
): CiMetricNumber {
  return { value: available ? value : null, available, zeroReal };
}

export function resolveCiResponsavel(input: {
  vendedor_id?: string | null;
  responsavel_comercial_id?: string | null;
  created_by?: string | null;
  profileNames?: Record<string, string> | Map<string, string>;
}): CiResponsavel {
  const names =
    input.profileNames instanceof Map
      ? Object.fromEntries(input.profileNames)
      : (input.profileNames ?? {});

  const nameOf = (id: string) => names[id]?.trim() || id.slice(0, 8);

  if (input.vendedor_id) {
    return {
      id: input.vendedor_id,
      nome: nameOf(input.vendedor_id),
      origem: "vendedor_id",
      confiavel: true,
    };
  }
  if (input.responsavel_comercial_id) {
    return {
      id: input.responsavel_comercial_id,
      nome: nameOf(input.responsavel_comercial_id),
      origem: "responsavel_comercial",
      confiavel: true,
    };
  }
  if (input.created_by) {
    return {
      id: input.created_by,
      nome: nameOf(input.created_by),
      origem: "criador_registro",
      confiavel: false,
    };
  }
  return {
    id: null,
    nome: CI_RESPONSAVEL_FALLBACK,
    origem: "fallback",
    confiavel: false,
  };
}

export function ciResponsavelUiLabel(origem: CiResponsavelOrigem): string {
  switch (origem) {
    case "vendedor_id":
    case "responsavel_comercial":
      return "Responsável comercial";
    case "criador_registro":
      return "Criador do registro";
    default:
      return CI_RESPONSAVEL_FALLBACK;
  }
}

/** Normaliza canal_venda → rótulo de exibição sem inventar campanha/indicação. */
export function resolveCiOrigemLabel(canal: string | null | undefined): string {
  const raw = (canal ?? "").trim().toLowerCase();
  if (!raw || raw === "padrao") return "Sem origem";
  if (raw === "balcao" || raw === "pdv" || raw === "venda_rapida") {
    return "Venda rápida";
  }
  if (raw === "os" || raw === "oficina" || raw.includes("ordem")) {
    return "OS";
  }
  return CI_CANAL_LABELS[raw] ?? canal!.trim();
}

export function isCiOrigemConfiavel(canal: string | null | undefined): boolean {
  const raw = (canal ?? "").trim().toLowerCase();
  if (!raw || raw === "padrao") return false;
  if (raw === "balcao" || raw === "pdv" || raw === "venda_rapida") return true;
  if (raw === "os" || raw === "oficina" || raw.includes("ordem")) return true;
  return CI_CANAL_CONFIAVEIS.has(raw);
}

export function shouldRunCiClienteSearch(
  q: string,
  minChars = CI_CLIENTE_SEARCH_MIN_CHARS,
): boolean {
  return q.trim().length >= minChars;
}

/** Match puro para testes de typeahead (nome, documento, telefone). */
export function matchCiClienteTypeahead(
  hit: {
    nome: string;
    documento?: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    tenant_id?: string;
  },
  term: string,
  tenantId?: string,
): boolean {
  if (tenantId && hit.tenant_id && hit.tenant_id !== tenantId) return false;
  if (!shouldRunCiClienteSearch(term)) return false;
  const q = term.trim().toLowerCase();
  const digits = term.replace(/\D/g, "");
  if (hit.nome.toLowerCase().includes(q)) return true;
  if (digits && hit.documento?.replace(/\D/g, "").includes(digits)) return true;
  if (digits && hit.telefone?.replace(/\D/g, "").includes(digits)) return true;
  if (digits && hit.whatsapp?.replace(/\D/g, "").includes(digits)) return true;
  if (hit.telefone?.toLowerCase().includes(q)) return true;
  if (hit.whatsapp?.toLowerCase().includes(q)) return true;
  if (hit.documento?.toLowerCase().includes(q)) return true;
  return false;
}

export function isCiStatusElegivel(status: string): boolean {
  return (CI_PIPELINE_STAGES as readonly string[]).includes(status);
}

export function isCiVendaValida(row: Pick<CiVendaRow, "deleted_at" | "status">): boolean {
  if (row.deleted_at) return false;
  return isCiStatusElegivel(row.status);
}

function matchesFilters(
  row: CiVendaRow,
  filters: CiFilters,
  responsavel: CiResponsavel,
): boolean {
  if (filters.status && filters.status !== "all" && row.status !== filters.status) {
    return false;
  }
  if (filters.clienteId && row.cliente_id !== filters.clienteId) {
    return false;
  }
  if (filters.origem) {
    const canal = (row.canal_venda ?? "").trim().toLowerCase() || "padrao";
    if (filters.origem === "sem_origem") {
      if (canal !== "padrao" && canal !== "") return false;
    } else if (canal !== filters.origem.toLowerCase()) {
      return false;
    }
  }
  if (filters.responsavelId) {
    if (responsavel.id !== filters.responsavelId) return false;
  }
  return true;
}

export function calcTaxaConversaoComercial(input: {
  faturadas: number;
  elegiveis: number;
}): CiMetricNumber {
  if (input.elegiveis <= 0) {
    return metric(null, false);
  }
  const pct = round2((input.faturadas / input.elegiveis) * 100);
  return metric(pct, true, pct === 0);
}

export function composeCiPipeline(
  rows: CiVendaRow[],
  filters: CiFilters,
): CiPipelineStageRow[] {
  const buckets = new Map<CiPipelineStage, { quantidade: number; valor: number }>();
  for (const s of CI_PIPELINE_STAGES) {
    buckets.set(s, { quantidade: 0, valor: 0 });
  }

  for (const row of rows) {
    if (!isCiVendaValida(row)) continue;
    const stage = row.status as CiPipelineStage;
    if (stage === "orcamento" || stage === "em_andamento") {
      const b = buckets.get(stage)!;
      b.quantidade += 1;
      b.valor += Number(row.total) || 0;
      continue;
    }
    // Fechados: somente no período (data_venda; fallback created_at)
    const day = dayKey(row.data_venda) ?? dayKey(row.created_at);
    if (!inPeriod(day, filters.de, filters.ate)) continue;
    const b = buckets.get(stage);
    if (!b) continue;
    b.quantidade += 1;
    b.valor += Number(row.total) || 0;
  }

  const totalValor = [...buckets.values()].reduce((a, b) => a + b.valor, 0);

  return CI_PIPELINE_STAGES.map((stage) => {
    const b = buckets.get(stage)!;
    return {
      stage,
      label: CI_PIPELINE_LABELS[stage],
      quantidade: b.quantidade,
      valor: round2(b.valor),
      participacaoPct:
        totalValor > 0 ? round2((b.valor / totalValor) * 100) : null,
    };
  });
}

export function composeCiOficinaStrip(
  osRows: CiOsOficinaRow[] = [],
): CiOficinaStrip {
  const labels: Record<string, string> = {
    aguardando_orcamento: "Aguardando orçamento",
    aguardando_aprovacao: "Aguardando aprovação",
    aprovado: "Aprovado",
    parcialmente_aprovado: "Parcialmente aprovado",
  };
  const allowed = new Set(Object.keys(labels));
  const map = new Map<string, { quantidade: number; valor: number }>();

  for (const o of osRows) {
    if (!allowed.has(o.status)) continue;
    const cur = map.get(o.status) ?? { quantidade: 0, valor: 0 };
    cur.quantidade += 1;
    cur.valor += Number(o.valor_total) || 0;
    map.set(o.status, cur);
  }

  const porStatus = [...map.entries()].map(([status, v]) => ({
    status,
    label: labels[status] ?? status,
    quantidade: v.quantidade,
    valor: round2(v.valor),
  }));

  return {
    quantidade: porStatus.reduce((a, r) => a + r.quantidade, 0),
    valor: round2(porStatus.reduce((a, r) => a + r.valor, 0)),
    porStatus,
  };
}

function rankingFromMap(
  map: Map<string, { valor: number; quantidade: number; label: string }>,
  limit = 10,
): CiRankingRow[] {
  const total = [...map.values()].reduce((a, v) => a + v.valor, 0);
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      valor: round2(v.valor),
      quantidade: v.quantidade,
      ticketMedio:
        v.quantidade > 0 ? round2(v.valor / v.quantidade) : null,
      participacaoPct: total > 0 ? round2((v.valor / total) * 100) : null,
    }))
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, limit);
}

export function suggestCiAction(input: {
  status: string;
  altoValor: boolean;
  vip: boolean;
  descontoAlto: boolean;
  stale: boolean;
}): { acao: string; motivo: string } {
  if (input.status === "orcamento" && input.descontoAlto) {
    return { acao: "Revisar desconto e enviar proposta.", motivo: "Desconto alto" };
  }
  if (input.status === "orcamento") {
    return { acao: "Enviar orçamento ao cliente.", motivo: "Orçamento aberto" };
  }
  if (input.status === "em_andamento" && input.stale) {
    return { acao: "Retomar negociação com o cliente.", motivo: "Sem atualização recente" };
  }
  if (input.status === "em_andamento") {
    return { acao: "Avançar para faturamento.", motivo: "Venda em andamento" };
  }
  if (input.vip) {
    return { acao: "Priorizar contato com cliente VIP.", motivo: "Cliente VIP" };
  }
  if (input.altoValor) {
    return { acao: "Priorizar follow-up de alto valor.", motivo: "Alto valor" };
  }
  return { acao: "Acompanhar negociação.", motivo: "Em aberto" };
}

export function composeCommercialIntelligence(input: CiComposeInput) {
  const now = input.now ?? new Date();
  const filters = input.filters;
  const altoValorLimiar = input.altoValorLimiar ?? 1_500;
  const descontoAltoPct = input.descontoAltoPct ?? 0.15;
  const staleHours = input.staleHours ?? 48;
  const vipSet =
    input.vipClienteIds instanceof Set
      ? input.vipClienteIds
      : new Set(input.vipClienteIds ?? []);
  const profileNames = input.profileNames ?? {};

  const enriched = input.vendas
    .filter(isCiVendaValida)
    .map((row) => {
      const responsavel = resolveCiResponsavel({
        vendedor_id: row.vendedor_id,
        responsavel_comercial_id: row.responsavel_comercial_id,
        created_by: row.created_by,
        profileNames,
      });
      return { row, responsavel };
    })
    .filter(({ row, responsavel }) => matchesFilters(row, filters, responsavel));

  const createdInPeriod = enriched.filter(({ row }) =>
    inPeriod(dayKey(row.created_at), filters.de, filters.ate),
  );

  const faturadasPeriodo = enriched.filter(({ row }) => {
    if (row.status !== "faturado") return false;
    const day = dayKey(row.data_venda) ?? dayKey(row.created_at);
    return inPeriod(day, filters.de, filters.ate);
  });

  const canceladasPeriodo = enriched.filter(({ row }) => {
    if (row.status !== "cancelado") return false;
    const day = dayKey(row.data_venda) ?? dayKey(row.created_at);
    return inPeriod(day, filters.de, filters.ate);
  });

  const emNegociacao = enriched.filter(
    ({ row }) => row.status === "orcamento" || row.status === "em_andamento",
  );

  const orcamentosAguardando = enriched.filter(
    ({ row }) => row.status === "orcamento",
  );

  const faturamento = round2(
    faturadasPeriodo.reduce((a, { row }) => a + (Number(row.total) || 0), 0),
  );
  const qtdFat = faturadasPeriodo.length;
  const ticket = qtdFat > 0 ? round2(faturamento / qtdFat) : 0;
  const valorNeg = round2(
    emNegociacao.reduce((a, { row }) => a + (Number(row.total) || 0), 0),
  );
  const valorPerdido = round2(
    canceladasPeriodo.reduce((a, { row }) => a + (Number(row.total) || 0), 0),
  );
  const descontoConcedido = round2(
    faturadasPeriodo.reduce(
      (a, { row }) => a + (Number(row.desconto_total) || 0),
      0,
    ),
  );
  const clientes = new Set(
    faturadasPeriodo
      .map(({ row }) => row.cliente_id)
      .filter((id): id is string => Boolean(id)),
  );

  const convNum = createdInPeriod.filter(({ row }) => row.status === "faturado")
    .length;
  const convDen = createdInPeriod.length;
  const taxa = calcTaxaConversaoComercial({
    faturadas: convNum,
    elegiveis: convDen,
  });

  const kpis: CiKpis = {
    faturamentoPeriodo: metric(faturamento, true, faturamento === 0),
    quantidadeFaturadas: metric(qtdFat, true, qtdFat === 0),
    ticketMedio: metric(
      qtdFat > 0 ? ticket : null,
      qtdFat > 0,
      qtdFat > 0 && ticket === 0,
    ),
    valorEmNegociacao: metric(valorNeg, true, valorNeg === 0),
    orcamentosAguardando: metric(
      orcamentosAguardando.length,
      true,
      orcamentosAguardando.length === 0,
    ),
    taxaConversaoComercial: taxa,
    vendasCanceladas: metric(
      canceladasPeriodo.length,
      true,
      canceladasPeriodo.length === 0,
    ),
    valorPerdido: metric(valorPerdido, true, valorPerdido === 0),
    descontoConcedido: metric(descontoConcedido, true, descontoConcedido === 0),
    clientesCompradores: metric(clientes.size, true, clientes.size === 0),
    conversaoNumerador: convNum,
    conversaoDenominador: convDen,
    conversaoFormula: CI_CONVERSAO_FORMULA,
  };

  const pipeline = composeCiPipeline(
    enriched.map((e) => e.row),
    filters,
  );
  const oficina = composeCiOficinaStrip(input.osOficina);

  // Action queue
  const staleMs = staleHours * 3_600_000;
  const actionItems: CiActionItem[] = [];
  for (const { row, responsavel } of emNegociacao) {
    const sub = Number(row.subtotal) || 0;
    const desc = Number(row.desconto_total) || 0;
    const altoValor = (Number(row.total) || 0) >= altoValorLimiar;
    const descontoAlto =
      desc > 0 && sub > 0 ? desc / sub >= descontoAltoPct : desc >= 200;
    const updated = new Date(row.updated_at || row.created_at).getTime();
    const stale = Number.isFinite(updated) && now.getTime() - updated >= staleMs;
    const vip = row.cliente_id ? vipSet.has(row.cliente_id) : false;

    if (
      !(
        row.status === "orcamento" ||
        row.status === "em_andamento" ||
        altoValor ||
        vip ||
        descontoAlto ||
        stale
      )
    ) {
      continue;
    }

    const sug = suggestCiAction({
      status: row.status,
      altoValor,
      vip,
      descontoAlto,
      stale,
    });

    actionItems.push({
      id: row.id,
      clienteNome: row.cliente_nome?.trim() || "Cliente",
      valor: round2(Number(row.total) || 0),
      status: row.status,
      statusLabel: CI_PIPELINE_LABELS[row.status as CiPipelineStage] ?? row.status,
      responsavel,
      acao: sug.acao,
      motivo: [
        sug.motivo,
        vip ? "VIP" : null,
        altoValor ? "Alto valor" : null,
        descontoAlto ? "Desconto alto" : null,
        stale ? `Sem atualização (>${staleHours}h)` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      hrefKind: "venda",
      hrefId: row.id,
    });
  }
  actionItems.sort((a, b) => b.valor - a.valor);

  // Rankings (responsáveis confirmados ≠ criadores)
  const respConfirmadosMap = new Map<
    string,
    { valor: number; quantidade: number; label: string }
  >();
  const criadorMap = new Map<
    string,
    { valor: number; quantidade: number; label: string }
  >();
  const origemMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const clienteMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const produtoMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const servicoMap = new Map<string, { valor: number; quantidade: number; label: string }>();

  let comOrigem = 0;
  let semOrigem = 0;
  let comRespConfirmado = 0;
  let semRespConfirmado = 0;
  let semCliente = 0;

  for (const { row, responsavel } of faturadasPeriodo) {
    if (isCiOrigemConfiavel(row.canal_venda)) comOrigem += 1;
    else semOrigem += 1;

    if (responsavel.confiavel) {
      comRespConfirmado += 1;
      const rKey = responsavel.id ?? "sem_id";
      const rCur = respConfirmadosMap.get(rKey) ?? {
        valor: 0,
        quantidade: 0,
        label: responsavel.nome,
      };
      rCur.valor += Number(row.total) || 0;
      rCur.quantidade += 1;
      respConfirmadosMap.set(rKey, rCur);
    } else {
      semRespConfirmado += 1;
      if (responsavel.origem === "criador_registro" && responsavel.id) {
        const cKey = responsavel.id;
        const cCur = criadorMap.get(cKey) ?? {
          valor: 0,
          quantidade: 0,
          label: responsavel.nome,
        };
        cCur.valor += Number(row.total) || 0;
        cCur.quantidade += 1;
        criadorMap.set(cKey, cCur);
      }
    }

    const oLabel = resolveCiOrigemLabel(row.canal_venda);
    const oCur = origemMap.get(oLabel) ?? {
      valor: 0,
      quantidade: 0,
      label: oLabel,
    };
    oCur.valor += Number(row.total) || 0;
    oCur.quantidade += 1;
    origemMap.set(oLabel, oCur);

    if (row.cliente_id) {
      const cKey = row.cliente_id;
      const cCur = clienteMap.get(cKey) ?? {
        valor: 0,
        quantidade: 0,
        label: row.cliente_nome?.trim() || cKey.slice(0, 8),
      };
      cCur.valor += Number(row.total) || 0;
      cCur.quantidade += 1;
      clienteMap.set(cKey, cCur);
    } else {
      semCliente += 1;
    }

    for (const it of row.tipo_item_agg ?? []) {
      const tipo = (it.tipo || "").toLowerCase();
      const target =
        tipo === "servico" || tipo === "serviço" ? servicoMap : produtoMap;
      const cur = target.get(it.descricao) ?? {
        valor: 0,
        quantidade: 0,
        label: it.descricao,
      };
      cur.valor += it.total;
      cur.quantidade += it.qtd;
      target.set(it.descricao, cur);
    }
  }

  const totalAvaliadas = faturadasPeriodo.length;
  const coberturaOrigemPct =
    totalAvaliadas > 0
      ? round2((comOrigem / totalAvaliadas) * 100)
      : null;
  const coberturaResponsavelPct =
    totalAvaliadas > 0
      ? round2((comRespConfirmado / totalAvaliadas) * 100)
      : null;
  const coberturaOrigemBaixa =
    coberturaOrigemPct != null && coberturaOrigemPct < 70;

  const cobertura: CiDataCoverage = {
    totalAvaliadas,
    comOrigem,
    semOrigem,
    coberturaOrigemPct,
    coberturaOrigemBaixa,
    comResponsavelConfirmado: comRespConfirmado,
    semResponsavelConfirmado: semRespConfirmado,
    coberturaResponsavelPct,
    semCliente,
    avisoOrigem: coberturaOrigemBaixa ? CI_ORIGEM_COBERTURA_BAIXA_MSG : null,
  };

  const maioresTickets = [...faturadasPeriodo]
    .map(({ row }) => ({
      key: row.id,
      label: `${row.cliente_nome?.trim() || "Cliente"} · #${row.numero ?? row.id.slice(0, 6)}`,
      valor: round2(Number(row.total) || 0),
      quantidade: 1,
      ticketMedio: round2(Number(row.total) || 0),
      participacaoPct: null as number | null,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
  const ticketTot = maioresTickets.reduce((a, r) => a + r.valor, 0);
  for (const r of maioresTickets) {
    r.participacaoPct =
      ticketTot > 0 ? round2((r.valor / ticketTot) * 100) : null;
  }

  const maioresDescontos = [...faturadasPeriodo]
    .filter(({ row }) => (Number(row.desconto_total) || 0) > 0)
    .map(({ row }) => ({
      key: row.id,
      label: `${row.cliente_nome?.trim() || "Cliente"} · #${row.numero ?? row.id.slice(0, 6)}`,
      valor: round2(Number(row.desconto_total) || 0),
      quantidade: 1,
      ticketMedio: null as number | null,
      participacaoPct: null as number | null,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const descTot = maioresDescontos.reduce((a, r) => a + r.valor, 0);
  for (const r of maioresDescontos) {
    r.participacaoPct = descTot > 0 ? round2((r.valor / descTot) * 100) : null;
  }

  const maioresPerdas = [...canceladasPeriodo]
    .map(({ row }) => ({
      key: row.id,
      label: `${row.cliente_nome?.trim() || "Cliente"} · #${row.numero ?? row.id.slice(0, 6)}`,
      valor: round2(Number(row.total) || 0),
      quantidade: 1,
      ticketMedio: null as number | null,
      participacaoPct: null as number | null,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
  const perdaTot = maioresPerdas.reduce((a, r) => a + r.valor, 0);
  for (const r of maioresPerdas) {
    r.participacaoPct = perdaTot > 0 ? round2((r.valor / perdaTot) * 100) : null;
  }

  const descontoPctSobreVendas =
    faturamento > 0 ? round2((descontoConcedido / faturamento) * 100) : null;
  const vendasComDesconto = faturadasPeriodo.filter(
    ({ row }) => (Number(row.desconto_total) || 0) > 0,
  ).length;
  const descontoMedio =
    vendasComDesconto > 0
      ? round2(descontoConcedido / vendasComDesconto)
      : null;

  const meta: CiMetaSnapshot = input.meta ?? {
    available: false,
    valorMeta: null,
    realizado: 0,
    diferenca: null,
    percentual: null,
    projecao: null,
    necessarioPorDiaUtil: null,
    ritmoAtual: null,
    ritmoEsperado: null,
    status: null,
  };

  return {
    kpis,
    pipeline,
    oficina,
    historicoEtapaMensagem: CI_HISTORICO_ETAPA_MSG,
    actionItems: actionItems.slice(0, 30),
    rankings: {
      responsaveisConfirmados: rankingFromMap(respConfirmadosMap),
      registrosPorCriador: rankingFromMap(criadorMap),
      /** @deprecated use responsaveisConfirmados — mantido para compat UI antiga */
      responsaveis: rankingFromMap(respConfirmadosMap),
      origens: rankingFromMap(origemMap),
      clientes: rankingFromMap(clienteMap),
      produtos: rankingFromMap(produtoMap),
      servicos: rankingFromMap(servicoMap),
      maioresTickets,
      maioresDescontos,
      maioresPerdas,
    },
    descontos: {
      totalConcedido: descontoConcedido,
      percentualSobreVendas: descontoPctSobreVendas,
      quantidadeComDesconto: vendasComDesconto,
      descontoMedio,
      maiores: maioresDescontos,
    },
    cobertura,
    meta,
    filters,
    period: { de: filters.de, ate: filters.ate },
  };
}

export type CommercialIntelligenceData = ReturnType<
  typeof composeCommercialIntelligence
>;

export function resolveCiPeriod(input: {
  de?: string;
  ate?: string;
  preset?: string;
  hoje: string;
}): { de: string; ate: string } {
  const hoje = input.hoje;
  if (input.de || input.ate) {
    return { de: input.de ?? hoje, ate: input.ate ?? hoje };
  }
  switch (input.preset) {
    case "hoje":
      return { de: hoje, ate: hoje };
    case "ontem": {
      const d = new Date(`${hoje}T12:00:00`);
      d.setDate(d.getDate() - 1);
      const y = d.toISOString().slice(0, 10);
      return { de: y, ate: y };
    }
    case "semana": {
      const d = new Date(`${hoje}T12:00:00`);
      d.setDate(d.getDate() - 6);
      return { de: d.toISOString().slice(0, 10), ate: hoje };
    }
    default: {
      return { de: `${hoje.slice(0, 7)}-01`, ate: hoje };
    }
  }
}

export function ciHref(
  tenantSlug: string,
  filters: Partial<CiFilters> & { preset?: string } = {},
): string {
  const params = new URLSearchParams();
  if (filters.de) params.set("de", filters.de);
  if (filters.ate) params.set("ate", filters.ate);
  if (filters.preset) params.set("preset", filters.preset);
  if (filters.responsavelId) params.set("responsavel", filters.responsavelId);
  if (filters.origem) params.set("origem", filters.origem);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.clienteId) params.set("cliente", filters.clienteId);
  const qs = params.toString();
  return `/${tenantSlug}/vendas/dashboard${qs ? `?${qs}` : ""}`;
}

export function ciClearHref(tenantSlug: string): string {
  return `/${tenantSlug}/vendas/dashboard`;
}

/** Isolamento: linhas de outro tenant nunca entram na composição. */
export function assertTenantIsolation(
  rows: Array<{ tenant_id?: string }>,
  tenantId: string,
): CiVendaRow[] {
  return rows.filter(
    (r) => !r.tenant_id || r.tenant_id === tenantId,
  ) as CiVendaRow[];
}
