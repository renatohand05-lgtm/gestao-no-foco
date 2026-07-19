import { OS_CHECKLIST_CLASSIFICACAO } from "@/lib/ordens/validations";

export type ChecklistClassificacao = (typeof OS_CHECKLIST_CLASSIFICACAO)[number];

const CLASSIFICACAO_SET = new Set<string>(OS_CHECKLIST_CLASSIFICACAO);

export function mapStatusToClassificacao(status: string): ChecklistClassificacao {
  if (CLASSIFICACAO_SET.has(status)) {
    return status as ChecklistClassificacao;
  }
  switch (status) {
    case "ok":
      return "bom";
    case "atencao":
      return "atencao";
    case "danificado":
    case "ausente":
      return "critico";
    case "na":
      return "nao_aplicavel";
    default:
      return "nao_verificado";
  }
}

export const CHECKLIST_CLASSIFICACAO_CONFIG: Record<
  ChecklistClassificacao,
  { label: string; colorClass: string; dotClass: string }
> = {
  bom: {
    label: "Bom",
    colorClass:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  atencao: {
    label: "Atenção",
    colorClass:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  critico: {
    label: "Crítico",
    colorClass:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    dotClass: "bg-red-500",
  },
  nao_verificado: {
    label: "Não verificado",
    colorClass:
      "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
    dotClass: "bg-gray-400",
  },
  nao_aplicavel: {
    label: "N/A",
    colorClass:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
    dotClass: "bg-slate-400",
  },
};
