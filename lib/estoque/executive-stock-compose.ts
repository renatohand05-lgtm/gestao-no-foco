/**
 * Central Executiva de Estoque — composição pura (Gate 18.4).
 * Sem migrations, sem IA, sem indicadores inventados.
 */

export const ESC_PARADO_DIAS = 90;
export const ESC_ALTO_VALOR_PARADO = 500;
export const ESC_COBERTURA_MIN_PRODUTOS = 3;

export type EscMetric = {
  value: number | null;
  available: boolean;
  zeroReal?: boolean;
  partial?: boolean;
  supporting?: string;
};

export type EscProdutoRow = {
  id: string;
  tenant_id?: string;
  nome: string;
  sku: string | null;
  categoria: string | null;
  fornecedor_principal: string | null;
  estoque_atual: number;
  estoque_minimo: number | null;
  custo: number | null;
  preco_venda: number | null;
  tipo: string;
  ativo: boolean;
  deleted_at?: string | null;
};

export type EscMovRow = {
  id: string;
  tenant_id?: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  created_at: string;
  deleted_at?: string | null;
  origem?: string | null;
};

export type EscOsItemRow = {
  produto_id: string | null;
  quantidade: number;
  estoque_status: string;
  peca_origem?: string | null;
  ordem_servico_id?: string;
};

export type EscVendaItemAgg = {
  produto_id: string | null;
  descricao: string;
  quantidade: number;
};

export type EscFilters = {
  categoria?: string | null;
  fornecedor?: string | null;
  criticidade?: string | null; // critico | zerado | parado | abaixo_minimo | all
  saldo?: string | null; // positivo | zero | negativo | all
  movimentacao?: string | null; // com | sem | all (90d)
  q?: string | null;
};

export type EscAlert = {
  id: string;
  severidade: "critica" | "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
  impacto: number;
  acao: string;
  href: string;
  tipo: string;
};

export type EscProductInsight = {
  id: string;
  nome: string;
  categoria: string;
  fornecedor: string;
  saldo: number;
  minimo: number | null;
  valor: number | null;
  valorDisponivel: boolean;
  impactoFinanceiro: number;
  ultimaMovimentacao: string | null;
  diasSemMovimentacao: number | null;
  coberturaDias: number | null;
  saidas90d: number;
};

export type EscRankingRow = {
  key: string;
  label: string;
  valor: number;
  quantidade: number;
  participacaoPct: number | null;
};

export type EscDistribuicaoRow = {
  key: string;
  label: string;
  valor: number;
  quantidade: number;
  participacaoPct: number | null;
};

export type EscCompraRec = {
  produtoId: string;
  nome: string;
  saldo: number;
  minimo: number;
  quantidadeSugerida: number;
  motivo: string;
  href: string;
};

export type EscComposeInput = {
  tenantSlug: string;
  produtos: EscProdutoRow[];
  movimentacoes: EscMovRow[];
  osItensReservados?: EscOsItemRow[];
  /** false = falha ao carregar itens OS → KPI Indisponível */
  osItensDisponiveis?: boolean;
  vendaItens?: EscVendaItemAgg[];
  fornecedoresAtivosCount?: number | null;
  filters?: EscFilters;
  now?: Date;
  paradoDias?: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function metric(
  value: number | null,
  available: boolean,
  extra: Partial<EscMetric> = {},
): EscMetric {
  return {
    value: available ? value : null,
    available,
    zeroReal: available && value === 0,
    ...extra,
  };
}

export function escUnitCost(p: Pick<EscProdutoRow, "custo" | "preco_venda">): number | null {
  const c = Number(p.custo ?? 0);
  if (c > 0) return c;
  const pv = Number(p.preco_venda ?? 0);
  if (pv > 0) return pv;
  return null;
}

export function escStockValue(
  p: Pick<EscProdutoRow, "estoque_atual" | "custo" | "preco_venda">,
): { value: number; available: boolean } {
  const unit = escUnitCost(p);
  if (unit == null) return { value: 0, available: false };
  return { value: round2(Number(p.estoque_atual ?? 0) * unit), available: true };
}

export function isEscStockProduct(p: EscProdutoRow): boolean {
  if (p.deleted_at) return false;
  if (!p.ativo) return false;
  if ((p.tipo || "").toLowerCase() === "servico") return false;
  return true;
}

export function matchesEscFilters(
  p: EscProdutoRow & {
    diasSemMovimentacao: number | null;
    saidas90d: number;
  },
  filters: EscFilters = {},
): boolean {
  if (filters.categoria && filters.categoria !== "all") {
    const cat = (p.categoria || "Sem categoria").trim();
    if (cat !== filters.categoria) return false;
  }
  if (filters.fornecedor && filters.fornecedor !== "all") {
    const f = (p.fornecedor_principal || "Sem fornecedor").trim();
    if (f !== filters.fornecedor) return false;
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    const blob = `${p.nome} ${p.sku ?? ""} ${p.categoria ?? ""}`.toLowerCase();
    if (!blob.includes(q)) return false;
  }
  const est = Number(p.estoque_atual ?? 0);
  const min = Number(p.estoque_minimo ?? 0);
  if (filters.saldo && filters.saldo !== "all") {
    if (filters.saldo === "zero" && est !== 0) return false;
    if (filters.saldo === "positivo" && est <= 0) return false;
    if (filters.saldo === "negativo" && est >= 0) return false;
  }
  if (filters.criticidade && filters.criticidade !== "all") {
    const zerado = est <= 0;
    const abaixo = !zerado && min > 0 && est <= min;
    const parado =
      p.diasSemMovimentacao != null && p.diasSemMovimentacao >= ESC_PARADO_DIAS;
    if (filters.criticidade === "zerado" && !zerado) return false;
    if (filters.criticidade === "abaixo_minimo" && !abaixo) return false;
    if (filters.criticidade === "parado" && !parado) return false;
    if (filters.criticidade === "critico" && !(zerado || abaixo)) return false;
  }
  if (filters.movimentacao && filters.movimentacao !== "all") {
    // "com" = teve qualquer movimento recente: diasSem < 90
    const teveRecente =
      p.diasSemMovimentacao != null && p.diasSemMovimentacao < ESC_PARADO_DIAS;
    if (filters.movimentacao === "com" && !teveRecente) return false;
    if (filters.movimentacao === "sem" && teveRecente) return false;
  }
  return true;
}

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
  );
  return Math.floor((end.getTime() - from.getTime()) / 86_400_000);
}

function rankingFromMap(
  map: Map<string, { valor: number; quantidade: number; label: string }>,
  limit = 10,
): EscRankingRow[] {
  const total = [...map.values()].reduce((a, v) => a + v.valor, 0);
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      valor: round2(v.valor),
      quantidade: v.quantidade,
      participacaoPct: total > 0 ? round2((v.valor / total) * 100) : null,
    }))
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, limit);
}

export function composeExecutiveStock(input: EscComposeInput) {
  const now = input.now ?? new Date();
  const paradoDias = input.paradoDias ?? ESC_PARADO_DIAS;
  const filters = input.filters ?? {};
  const slug = input.tenantSlug;

  const produtos = input.produtos.filter(isEscStockProduct);
  const movs = input.movimentacoes.filter((m) => !m.deleted_at);

  const lastMovByProduto = new Map<string, string>();
  const saidas90ByProduto = new Map<string, number>();
  const limiar90 = new Date(now);
  limiar90.setUTCDate(limiar90.getUTCDate() - paradoDias);
  const limiar90Iso = limiar90.toISOString();

  for (const m of movs) {
    const prev = lastMovByProduto.get(m.produto_id);
    if (!prev || m.created_at > prev) lastMovByProduto.set(m.produto_id, m.created_at);
    if (m.tipo === "saida" && m.created_at >= limiar90Iso) {
      saidas90ByProduto.set(
        m.produto_id,
        (saidas90ByProduto.get(m.produto_id) ?? 0) + Number(m.quantidade ?? 0),
      );
    }
  }

  const enriched = produtos.map((p) => {
    const last = lastMovByProduto.get(p.id) ?? null;
    const dias = last ? daysBetween(last, now) : null;
    const saidas90d = saidas90ByProduto.get(p.id) ?? 0;
    const sv = escStockValue(p);
    const coberturaDias =
      saidas90d > 0
        ? round2(Number(p.estoque_atual ?? 0) / (saidas90d / paradoDias))
        : null;
    return {
      ...p,
      ultimaMovimentacao: last,
      diasSemMovimentacao: dias,
      saidas90d,
      valor: sv.available ? sv.value : null,
      valorDisponivel: sv.available,
      impactoFinanceiro: sv.available ? sv.value : 0,
      coberturaDias,
    };
  });

  const filtered = enriched.filter((p) => matchesEscFilters(p, filters));

  // KPIs (sobre carteira filtrada de produtos ativos)
  let valorTotal = 0;
  let produtosComValor = 0;
  let produtosSemValor = 0;
  let abaixoMinimo = 0;
  let zerados = 0;
  let valorParado = 0;
  const giros: number[] = [];
  const coberturas: number[] = [];

  for (const p of filtered) {
    const est = Number(p.estoque_atual ?? 0);
    const min = Number(p.estoque_minimo ?? 0);
    if (est <= 0) zerados += 1;
    else if (min > 0 && est <= min) abaixoMinimo += 1;

    if (p.valorDisponivel && p.valor != null) {
      valorTotal += p.valor;
      produtosComValor += 1;
    } else {
      produtosSemValor += 1;
    }

    const parado =
      p.diasSemMovimentacao == null || p.diasSemMovimentacao >= paradoDias;
    if (parado && est > 0 && p.valorDisponivel && p.valor != null) {
      valorParado += p.valor;
    }

    if (p.saidas90d > 0) {
      giros.push(p.saidas90d / Math.max(est, 1));
    }
    if (p.coberturaDias != null && Number.isFinite(p.coberturaDias)) {
      coberturas.push(p.coberturaDias);
    }
  }

  const valorTotalMetric =
    produtosComValor === 0 && filtered.length > 0
      ? metric(null, false, {
          supporting: "Sem custo/preço cadastrado para valorar o estoque.",
        })
      : metric(round2(valorTotal), true, {
          partial: produtosSemValor > 0,
          supporting:
            produtosSemValor > 0
              ? `Parcial: ${produtosSemValor} SKU(s) sem custo/preço.`
              : "Σ saldo × (custo ou preço de venda).",
        });

  const giroMedio =
    giros.length > 0
      ? metric(round2(giros.reduce((a, b) => a + b, 0) / giros.length), true, {
          supporting: "Proxy: saídas 90d ÷ saldo (produtos com saída).",
        })
      : metric(null, false, {
          supporting: "Indisponível — sem histórico de saídas suficiente.",
        });

  const cobertura =
    coberturas.length >= ESC_COBERTURA_MIN_PRODUTOS
      ? metric(
          round2(coberturas.reduce((a, b) => a + b, 0) / coberturas.length),
          true,
          {
            supporting: `Média de dias de cobertura (${coberturas.length} SKUs com saída).`,
          },
        )
      : metric(null, false, {
          supporting:
            "Indisponível — histórico de saídas insuficiente para cobertura.",
        });

  // Reservado / comprometido OS — proxy documentado
  let valorReservadoProxy = 0;
  let qtdReservada = 0;
  const custoById = new Map(
    produtos.map((p) => [p.id, escUnitCost(p)] as const),
  );
  for (const it of input.osItensReservados ?? []) {
    if (!it.produto_id) continue;
    const st = (it.estoque_status || "").toLowerCase();
    if (st !== "reservado" && st !== "separado") continue;
    if (it.peca_origem && it.peca_origem !== "estoque") continue;
    const unit = custoById.get(it.produto_id);
    const q = Number(it.quantidade ?? 0);
    qtdReservada += q;
    if (unit != null) valorReservadoProxy += q * unit;
  }
  // Sem ledger de reserva no produto → KPI "Valor reservado" fica Indisponível
  const valorReservado = metric(null, false, {
    supporting: "Indisponível — não há saldo reservado no cadastro do produto.",
  });
  // Comprometido OS: proxy quando a carga de itens OS estiver disponível
  const valorComprometidoOs =
    input.osItensDisponiveis === false
      ? metric(null, false, {
          supporting: "Indisponível — não foi possível carregar itens de OS.",
        })
      : qtdReservada > 0
        ? metric(round2(valorReservadoProxy), true, {
            supporting:
              "Proxy: itens de OS com estoque_status reservado/separado × custo/preço.",
            partial: true,
          })
        : metric(0, true, {
            zeroReal: true,
            supporting: "Nenhum item OS reservado/separado no momento.",
          });

  const skusAtivos = metric(filtered.length, true, { zeroReal: filtered.length === 0 });

  const fornAtivos =
    input.fornecedoresAtivosCount == null
      ? metric(null, false, {
          supporting: "Indisponível — contagem de fornecedores não carregada.",
        })
      : metric(input.fornecedoresAtivosCount, true, {
          zeroReal: input.fornecedoresAtivosCount === 0,
        });

  const kpis = {
    valorTotalEstoque: valorTotalMetric,
    valorFinanceiroParado: metric(round2(valorParado), true, {
      supporting: `Produtos sem movimentação ≥ ${paradoDias} dias (com valor).`,
    }),
    produtosAbaixoMinimo: metric(abaixoMinimo, true, {
      zeroReal: abaixoMinimo === 0,
    }),
    produtosZerados: metric(zerados, true, { zeroReal: zerados === 0 }),
    giroMedio,
    coberturaEstoque: cobertura,
    valorComprometidoOs,
    valorReservado,
    skusAtivos,
    fornecedoresAtivos: fornAtivos,
  };

  // Alertas
  const alerts: EscAlert[] = [];
  for (const p of filtered) {
    const est = Number(p.estoque_atual ?? 0);
    const min = Number(p.estoque_minimo ?? 0);
    const href = `/${slug}/produtos/${p.id}`;
    const impacto = p.impactoFinanceiro;

    if (est <= 0) {
      alerts.push({
        id: `zerado:${p.id}`,
        severidade: "critica",
        titulo: "Produto zerado",
        descricao: `${p.nome} sem saldo.`,
        impacto,
        acao: "Repor estoque / abrir compra.",
        href,
        tipo: "zerado",
      });
    } else if (min > 0 && est <= min) {
      alerts.push({
        id: `abaixo:${p.id}`,
        severidade: "alta",
        titulo: "Abaixo do mínimo",
        descricao: `${p.nome}: saldo ${est}, mínimo ${min}.`,
        impacto,
        acao: "Comprar até o mínimo.",
        href,
        tipo: "abaixo_minimo",
      });
    }

    const parado =
      (p.diasSemMovimentacao == null || p.diasSemMovimentacao >= paradoDias) &&
      est > 0;
    if (parado) {
      alerts.push({
        id: `parado:${p.id}`,
        severidade: impacto >= ESC_ALTO_VALOR_PARADO ? "alta" : "media",
        titulo:
          impacto >= ESC_ALTO_VALOR_PARADO
            ? "Alto valor parado"
            : "Sem movimentação",
        descricao: `${p.nome} sem movimento há ${p.diasSemMovimentacao ?? "—"} dias.`,
        impacto,
        acao: "Revisar demanda ou promover saída.",
        href,
        tipo: impacto >= ESC_ALTO_VALOR_PARADO ? "alto_valor_parado" : "sem_movimentacao",
      });
    }

    const forn = (p.fornecedor_principal || "").trim();
    if (!forn) {
      alerts.push({
        id: `cadastro:${p.id}`,
        severidade: "baixa",
        titulo: "Cadastro inconsistente",
        descricao: `${p.nome} sem fornecedor principal.`,
        impacto: 0,
        acao: "Completar cadastro do produto.",
        href,
        tipo: "cadastro_inconsistente",
      });
    }
  }

  // Fornecedor único: categorias/produtos onde só um fornecedor aparece na carteira
  const byForn = new Map<string, number>();
  for (const p of filtered) {
    const f = (p.fornecedor_principal || "").trim();
    if (!f) continue;
    byForn.set(f, (byForn.get(f) ?? 0) + 1);
  }
  if (byForn.size === 1) {
    const [nome] = [...byForn.keys()];
    alerts.push({
      id: "fornecedor_unico",
      severidade: "media",
      titulo: "Fornecedor único",
      descricao: `Carteira filtrada depende de um único fornecedor: ${nome}.`,
      impacto: valorTotal,
      acao: "Avaliar diversificação de fornecedores.",
      href: `/${slug}/financeiro/fornecedores`,
      tipo: "fornecedor_unico",
    });
  }

  alerts.sort((a, b) => b.impacto - a.impacto || a.titulo.localeCompare(b.titulo));

  // Produtos críticos
  const criticos: EscProductInsight[] = filtered
    .filter((p) => {
      const est = Number(p.estoque_atual ?? 0);
      const min = Number(p.estoque_minimo ?? 0);
      return est <= 0 || (min > 0 && est <= min);
    })
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria || "Sem categoria",
      fornecedor: p.fornecedor_principal || "Sem fornecedor",
      saldo: Number(p.estoque_atual ?? 0),
      minimo: p.estoque_minimo,
      valor: p.valor,
      valorDisponivel: p.valorDisponivel,
      impactoFinanceiro: p.impactoFinanceiro,
      ultimaMovimentacao: p.ultimaMovimentacao,
      diasSemMovimentacao: p.diasSemMovimentacao,
      coberturaDias: p.coberturaDias,
      saidas90d: p.saidas90d,
    }))
    .sort((a, b) => {
      const ca = a.coberturaDias ?? Number.POSITIVE_INFINITY;
      const cb = b.coberturaDias ?? Number.POSITIVE_INFINITY;
      if (ca !== cb) return ca - cb;
      if (b.impactoFinanceiro !== a.impactoFinanceiro) {
        return b.impactoFinanceiro - a.impactoFinanceiro;
      }
      return a.saldo - b.saldo;
    });

  // Parados
  const parados = filtered
    .filter((p) => {
      const est = Number(p.estoque_atual ?? 0);
      return (
        est > 0 &&
        (p.diasSemMovimentacao == null || p.diasSemMovimentacao >= paradoDias)
      );
    })
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      valor: p.valor,
      valorDisponivel: p.valorDisponivel,
      diasSemMovimentacao: p.diasSemMovimentacao,
      fornecedor: p.fornecedor_principal || "Sem fornecedor",
      quantidade: Number(p.estoque_atual ?? 0),
      href: `/${slug}/produtos/${p.id}`,
    }))
    .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));

  // Compras recomendadas (determinístico)
  const compras: EscCompraRec[] = [];
  for (const p of filtered) {
    const est = Number(p.estoque_atual ?? 0);
    const min = Number(p.estoque_minimo ?? 0);
    if (min <= 0) continue;
    if (est >= min) continue;
    const qtd = round2(min - est);
    if (qtd <= 0) continue;
    compras.push({
      produtoId: p.id,
      nome: p.nome,
      saldo: est,
      minimo: min,
      quantidadeSugerida: qtd,
      motivo:
        est <= 0
          ? "Saldo zerado com mínimo cadastrado."
          : "Saldo abaixo do mínimo cadastrado.",
      href: `/${slug}/produtos/${p.id}`,
    });
  }
  compras.sort((a, b) => b.quantidadeSugerida - a.quantidadeSugerida);

  // Rankings
  const vendidosMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  for (const it of input.vendaItens ?? []) {
    const key = it.produto_id || it.descricao;
    const label = it.descricao || it.produto_id || "Item";
    const cur = vendidosMap.get(key) ?? { valor: 0, quantidade: 0, label };
    cur.quantidade += Number(it.quantidade ?? 0);
    cur.valor += Number(it.quantidade ?? 0);
    vendidosMap.set(key, cur);
  }

  const giroMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const valorMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const paradoMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const catMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const fornMap = new Map<string, { valor: number; quantidade: number; label: string }>();

  for (const p of filtered) {
    if (p.saidas90d > 0) {
      giroMap.set(p.id, {
        label: p.nome,
        valor: round2(p.saidas90d / Math.max(Number(p.estoque_atual ?? 0), 1)),
        quantidade: p.saidas90d,
      });
    }
    if (p.valorDisponivel && p.valor != null && p.valor > 0) {
      valorMap.set(p.id, {
        label: p.nome,
        valor: p.valor,
        quantidade: Number(p.estoque_atual ?? 0),
      });
    }
    const parado =
      Number(p.estoque_atual ?? 0) > 0 &&
      (p.diasSemMovimentacao == null || p.diasSemMovimentacao >= paradoDias);
    if (parado && p.valorDisponivel && p.valor != null) {
      paradoMap.set(p.id, {
        label: p.nome,
        valor: p.valor,
        quantidade: Number(p.estoque_atual ?? 0),
      });
    }
    const cat = p.categoria || "Sem categoria";
    const cCur = catMap.get(cat) ?? { label: cat, valor: 0, quantidade: 0 };
    cCur.quantidade += 1;
    cCur.valor += p.valorDisponivel && p.valor != null ? p.valor : 0;
    catMap.set(cat, cCur);

    const forn = p.fornecedor_principal || "Sem fornecedor";
    const fCur = fornMap.get(forn) ?? { label: forn, valor: 0, quantidade: 0 };
    fCur.quantidade += 1;
    fCur.valor += p.valorDisponivel && p.valor != null ? p.valor : 0;
    fornMap.set(forn, fCur);
  }

  // Consumo OS via movimentações origem ordem_servico
  const osConsumoMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const nomeById = new Map(produtos.map((p) => [p.id, p.nome]));
  for (const m of movs) {
    if (m.tipo !== "saida") continue;
    const origem = (m.origem || "").toLowerCase();
    if (origem !== "ordem_servico" && origem !== "os") continue;
    const label = nomeById.get(m.produto_id) || m.produto_id.slice(0, 8);
    const cur = osConsumoMap.get(m.produto_id) ?? {
      label,
      valor: 0,
      quantidade: 0,
    };
    cur.quantidade += Number(m.quantidade ?? 0);
    cur.valor += Number(m.quantidade ?? 0);
    osConsumoMap.set(m.produto_id, cur);
  }

  // Distribuição faixas de valor
  const faixas = [
    { key: "0", label: "Sem valor", test: (v: number | null, ok: boolean) => !ok },
    { key: "1", label: "Até R$ 100", test: (v: number | null, ok: boolean) => ok && (v ?? 0) > 0 && (v ?? 0) <= 100 },
    { key: "2", label: "R$ 100–500", test: (v: number | null, ok: boolean) => ok && (v ?? 0) > 100 && (v ?? 0) <= 500 },
    { key: "3", label: "R$ 500–2.000", test: (v: number | null, ok: boolean) => ok && (v ?? 0) > 500 && (v ?? 0) <= 2000 },
    { key: "4", label: "Acima de R$ 2.000", test: (v: number | null, ok: boolean) => ok && (v ?? 0) > 2000 },
  ];
  const faixaMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  for (const f of faixas) faixaMap.set(f.key, { label: f.label, valor: 0, quantidade: 0 });
  for (const p of filtered) {
    for (const f of faixas) {
      if (f.test(p.valor, p.valorDisponivel)) {
        const cur = faixaMap.get(f.key)!;
        cur.quantidade += 1;
        cur.valor += p.valor ?? 0;
        break;
      }
    }
  }

  const situacaoMap = new Map<string, { valor: number; quantidade: number; label: string }>();
  const sitDefs = [
    { key: "ok", label: "Saudável" },
    { key: "abaixo", label: "Abaixo do mínimo" },
    { key: "zerado", label: "Zerado" },
    { key: "parado", label: "Parado" },
  ];
  for (const s of sitDefs) situacaoMap.set(s.key, { label: s.label, valor: 0, quantidade: 0 });
  for (const p of filtered) {
    const est = Number(p.estoque_atual ?? 0);
    const min = Number(p.estoque_minimo ?? 0);
    let key = "ok";
    if (est <= 0) key = "zerado";
    else if (min > 0 && est <= min) key = "abaixo";
    else if (
      p.diasSemMovimentacao == null ||
      p.diasSemMovimentacao >= paradoDias
    ) {
      key = "parado";
    }
    const cur = situacaoMap.get(key)!;
    cur.quantidade += 1;
    cur.valor += p.valor ?? 0;
  }

  const categoriasFiltro = [...new Set(produtos.map((p) => p.categoria || "Sem categoria"))].sort();
  const fornecedoresFiltro = [
    ...new Set(
      produtos.map((p) => p.fornecedor_principal || "Sem fornecedor"),
    ),
  ].sort();

  return {
    kpis,
    alerts: alerts.slice(0, 40),
    criticos: criticos.slice(0, 50),
    parados: parados.slice(0, 50),
    compras: compras.slice(0, 40),
    rankings: {
      maisVendidos: rankingFromMap(vendidosMap),
      maiorGiro: rankingFromMap(giroMap),
      maiorValor: rankingFromMap(valorMap),
      maisParados: rankingFromMap(paradoMap),
      categorias: rankingFromMap(catMap),
      fornecedores: rankingFromMap(fornMap),
      consumoOs: rankingFromMap(osConsumoMap),
    },
    distribuicao: {
      categoria: rankingFromMap(catMap, 20) as EscDistribuicaoRow[],
      fornecedor: rankingFromMap(fornMap, 20) as EscDistribuicaoRow[],
      faixaValor: rankingFromMap(faixaMap, 10) as EscDistribuicaoRow[],
      situacao: rankingFromMap(situacaoMap, 10) as EscDistribuicaoRow[],
    },
    filterOptions: {
      categorias: categoriasFiltro,
      fornecedores: fornecedoresFiltro,
    },
    meta: {
      totalFiltrado: filtered.length,
      totalCarteira: produtos.length,
      paradoDias,
    },
  };
}

export type ExecutiveStockData = ReturnType<typeof composeExecutiveStock>;

export function escHref(
  tenantSlug: string,
  filters: EscFilters & { de?: string; ate?: string } = {},
): string {
  const params = new URLSearchParams();
  if (filters.de) params.set("de", filters.de);
  if (filters.ate) params.set("ate", filters.ate);
  if (filters.categoria && filters.categoria !== "all") {
    params.set("categoria", filters.categoria);
  }
  if (filters.fornecedor && filters.fornecedor !== "all") {
    params.set("fornecedor", filters.fornecedor);
  }
  if (filters.criticidade && filters.criticidade !== "all") {
    params.set("criticidade", filters.criticidade);
  }
  if (filters.saldo && filters.saldo !== "all") params.set("saldo", filters.saldo);
  if (filters.movimentacao && filters.movimentacao !== "all") {
    params.set("movimentacao", filters.movimentacao);
  }
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  const qs = params.toString();
  return `/${tenantSlug}/estoque/dashboard${qs ? `?${qs}` : ""}`;
}

export function escClearHref(tenantSlug: string): string {
  return `/${tenantSlug}/estoque/dashboard`;
}

export function assertEscTenantIsolation<T extends { tenant_id?: string }>(
  rows: T[],
  tenantId: string,
): T[] {
  return rows.filter((r) => !r.tenant_id || r.tenant_id === tenantId);
}
