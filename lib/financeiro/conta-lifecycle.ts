/**
 * Políticas de ciclo de vida Contas a Pagar / Receber (Sprint 13.16.1).
 * Sem DELETE físico; estorno reutiliza motor bancário existente.
 */

export type ContaLifecycleKind = "pagar" | "receber";

export type ParcelScope = "atual" | "atual_e_proximas" | "grupo";

export type ContaLifecycleSnapshot = {
  id: string;
  numero: number;
  descricao: string;
  status: string;
  valor_original: number;
  valor_liquidado: number;
  data_competencia: string;
  data_vencimento: string;
  counterparty: string;
  grupo_parcelamento_id: string | null;
  parcela_numero: number;
  parcela_total: number;
  despesa_recorrente_id?: string | null;
  venda_id?: string | null;
};

export type ContaLifecycleAction =
  | "visualizar"
  | "editar"
  | "editar_classificacao"
  | "editar_descritivo"
  | "duplicar"
  | "baixar"
  | "cancelar"
  | "excluir"
  | "estornar"
  | "historico";

function hasLiquidacao(valorLiquidado: number) {
  return Number(valorLiquidado) > 0.0001;
}

export function canEstornarConta(snapshot: {
  status: string;
  valor_liquidado: number;
}): boolean {
  if (snapshot.status === "cancelado") return false;
  return (
    hasLiquidacao(snapshot.valor_liquidado) ||
    snapshot.status === "pago" ||
    snapshot.status === "parcial" ||
    snapshot.status === "recebido"
  );
}

export function canSoftDeleteConta(snapshot: {
  status: string;
  valor_liquidado: number;
}): boolean {
  if (hasLiquidacao(snapshot.valor_liquidado)) return false;
  if (snapshot.status === "pago" || snapshot.status === "parcial") return false;
  if (snapshot.status === "recebido") return false;
  return (
    snapshot.status === "aberto" ||
    snapshot.status === "vencido" ||
    snapshot.status === "cancelado"
  );
}

export function canCancelarContaSeguro(snapshot: {
  status: string;
  valor_liquidado: number;
}): boolean {
  if (snapshot.status === "cancelado") return false;
  if (hasLiquidacao(snapshot.valor_liquidado)) return false;
  if (
    snapshot.status === "pago" ||
    snapshot.status === "parcial" ||
    snapshot.status === "recebido"
  ) {
    return false;
  }
  return snapshot.status === "aberto" || snapshot.status === "vencido";
}

export function canDuplicarConta(snapshot: { status: string }): boolean {
  void snapshot;
  return true;
}

export function isParcelada(snapshot: ContaLifecycleSnapshot): boolean {
  return Boolean(
    snapshot.grupo_parcelamento_id && snapshot.parcela_total > 1,
  );
}

export function buildDeleteImpact(snapshot: ContaLifecycleSnapshot): {
  allowed: boolean;
  title: string;
  summary: string;
  impacts: string[];
  requiredAction: "soft_delete" | "estorno_required" | "blocked";
} {
  if (canSoftDeleteConta(snapshot)) {
    const impacts = [
      "Remoção lógica (deleted_at) — o registro sai das listagens e do DRE.",
      "Nenhuma movimentação bancária será criada ou alterada.",
      "O histórico permanece disponível para auditoria.",
    ];
    if (snapshot.despesa_recorrente_id) {
      impacts.push(
        "Esta ocorrência veio de recorrência: a série não será pausada; esta competência não será regenerada.",
      );
    }
    if (isParcelada(snapshot)) {
      impacts.push(
        `Parcela ${snapshot.parcela_numero}/${snapshot.parcela_total} — escolha o escopo no diálogo.`,
      );
    }
    return {
      allowed: true,
      title: "Exclusão lógica segura",
      summary:
        "Esta conta ainda não possui pagamento. Ela será removida das listagens e do DRE por meio de exclusão lógica.",
      impacts,
      requiredAction: "soft_delete",
    };
  }

  return {
    allowed: false,
    title: "Exclusão bloqueada",
    summary:
      "Esta conta possui pagamento registrado. Para preservar o histórico financeiro, será necessário estornar o pagamento antes de cancelar a conta.",
    impacts: [
      "Estorne o(s) pagamento(s) para reabrir o título.",
      "Depois cancele ou exclua logicamente o título em aberto.",
      "O pagamento original permanece auditável via movimentações bancárias.",
    ],
    requiredAction: "estorno_required",
  };
}

export function buildCancelImpact(snapshot: ContaLifecycleSnapshot): {
  allowed: boolean;
  title: string;
  summary: string;
  impacts: string[];
} {
  if (canCancelarContaSeguro(snapshot)) {
    return {
      allowed: true,
      title: "Cancelar obrigação",
      summary:
        "O título permanecerá no histórico com status cancelado e deixará de compor DRE, projeção e vencidos.",
      impacts: [
        "Status → cancelado (sem DELETE físico).",
        "Não compõe DRE nem fluxo projetado.",
        "Parcelas/vínculos permanecem para auditoria.",
      ],
    };
  }

  if (canEstornarConta(snapshot)) {
    return {
      allowed: false,
      title: "Cancelamento bloqueado",
      summary:
        "Há pagamento ou baixa parcial. Estorne integralmente antes de cancelar.",
      impacts: [
        "Use “Estornar pagamento” / “Estornar recebimento”.",
        "Após o estorno, o título volta a aberto e pode ser cancelado.",
      ],
    };
  }

  return {
    allowed: false,
    title: "Cancelamento indisponível",
    summary: "Este título não pode ser cancelado no status atual.",
    impacts: [],
  };
}

export function buildEstornoImpact(
  kind: ContaLifecycleKind,
  snapshot: ContaLifecycleSnapshot,
): {
  allowed: boolean;
  title: string;
  summary: string;
  impacts: string[];
} {
  if (!canEstornarConta(snapshot)) {
    return {
      allowed: false,
      title: "Estorno indisponível",
      summary: "Não há baixa ativa para estornar neste título.",
      impacts: [],
    };
  }

  const noun = kind === "pagar" ? "pagamento" : "recebimento";
  return {
    allowed: true,
    title: `Estornar ${noun}`,
    summary: `Será criada movimentação bancária inversa, o saldo da conta será restaurado e o título voltará para aberto. O ${noun} original permanece auditável.`,
    impacts: [
      "Reutiliza a RPC existente de estorno bancário (sem novo motor).",
      "Não gera nova despesa/receita no DRE.",
      "Não duplica o Fluxo de Caixa (entrada/saída de estorno).",
      "Motivo obrigatório será registrado.",
      "Após o estorno você poderá editar o lançamento e baixar novamente, se necessário.",
    ],
  };
}

export const PARCEL_SCOPE_LABELS: Record<ParcelScope, string> = {
  atual: "Apenas esta parcela",
  atual_e_proximas: "Esta e as próximas não liquidadas",
  grupo: "Grupo inteiro (somente não liquidadas)",
};
