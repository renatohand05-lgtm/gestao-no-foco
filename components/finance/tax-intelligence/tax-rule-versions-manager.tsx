"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Save,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  activateTaxRuleVersion,
  archiveTaxRuleVersion,
  listTaxRuleVersionsForManagement,
  updateTaxRuleVersionParameters,
  type TaxRuleVersionForManagement,
} from "@/lib/finance/tax-intelligence/tax-intelligence-actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativa",
  superseded: "Substituída",
  archived: "Arquivada",
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    superseded: "bg-muted text-muted-foreground",
    archived: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status === "active" ? <CheckCircle2 className="size-3" /> : null}
      {status === "draft" ? <AlertTriangle className="size-3" /> : null}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function parseParamValue(raw: string): string | number | boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const asNumber = Number(raw);
  if (raw.trim() !== "" && Number.isFinite(asNumber)) return asNumber;
  return raw;
}

function RuleEditor({
  tenantSlug,
  rule,
  onChanged,
}: {
  tenantSlug: string;
  rule: TaxRuleVersionForManagement;
  onChanged: () => void;
}) {
  const allKeys = Array.from(
    new Set([...rule.requiredKeys, ...Object.keys(rule.parameters)]),
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      allKeys.map((key) => [
        key,
        rule.parameters[key] !== undefined ? String(rule.parameters[key]) : "",
      ]),
    ),
  );
  const [isSaving, startSaving] = useTransition();
  const [isActivating, startActivating] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    const parameters = Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => v.trim() !== "")
        .map(([k, v]) => [k, parseParamValue(v)]),
    );
    startSaving(async () => {
      const res = await updateTaxRuleVersionParameters(
        tenantSlug,
        rule.id,
        parameters,
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      onChanged();
    });
  }

  function handleActivate() {
    setError(null);
    startActivating(async () => {
      const res = await activateTaxRuleVersion(tenantSlug, rule.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onChanged();
    });
  }

  return (
    <div className="space-y-3 border-t border-border/60 pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {allKeys.map((key) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {key}
              {rule.requiredKeys.includes(key) ? (
                <span className="text-amber-600 dark:text-amber-400"> *</span>
              ) : null}
            </label>
            <input
              type="text"
              value={values[key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [key]: e.target.value }))
              }
              placeholder={
                rule.requiredKeys.includes(key) ? "obrigatório" : "opcional"
              }
              className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
            />
          </div>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save className="size-3.5" />
          {isSaving ? "Salvando…" : "Salvar parâmetros"}
        </Button>
        {rule.status !== "active" ? (
          <Button
            type="button"
            size="sm"
            onClick={handleActivate}
            disabled={isActivating || rule.missingParameters.length > 0}
            title={
              rule.missingParameters.length > 0
                ? `Faltam: ${rule.missingParameters.join(", ")}`
                : undefined
            }
          >
            <ShieldCheck className="size-3.5" />
            {isActivating ? "Ativando…" : "Ativar regra"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function TaxRuleVersionsManager({ tenantSlug }: Props) {
  const [rules, setRules] = useState<TaxRuleVersionForManagement[] | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isArchiving, startArchiving] = useTransition();

  async function refresh() {
    const res = await listTaxRuleVersionsForManagement(tenantSlug);
    if (res.success) {
      setRules(res.rules);
      setLoadError(null);
    } else {
      setLoadError(res.error);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await listTaxRuleVersionsForManagement(tenantSlug);
      if (ignore) return;
      if (res.success) {
        setRules(res.rules);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [tenantSlug]);

  function handleArchive(ruleId: string) {
    startArchiving(async () => {
      await archiveTaxRuleVersion(tenantSlug, ruleId);
      void refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Gerenciar regras tributárias
        </CardTitle>
        <CardDescription>
          Revise os parâmetros e ative as versões de regra quando estiverem
          completas. Regras sem os parâmetros obrigatórios não podem ser
          ativadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadError ? (
          <p className="text-sm text-red-600" role="alert">
            {loadError}
          </p>
        ) : rules === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma regra tributária cadastrada ainda.
          </p>
        ) : (
          rules.map((rule) => {
            const expanded = expandedId === rule.id;
            return (
              <div
                key={rule.id}
                className="rounded-lg border border-border/60 p-3"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : rule.id)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {rule.versionLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rule.regimeCode.toUpperCase()} · vigência{" "}
                      {rule.effectiveFrom}
                      {rule.effectiveTo ? ` até ${rule.effectiveTo}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={rule.status} />
                    {expanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {rule.notes ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {rule.notes}
                  </p>
                ) : null}

                {expanded ? (
                  <div className="mt-3 space-y-3">
                    <RuleEditor
                      tenantSlug={tenantSlug}
                      rule={rule}
                      onChanged={refresh}
                    />
                    {rule.status !== "archived" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(rule.id)}
                        disabled={isArchiving}
                        className="text-muted-foreground"
                      >
                        <Archive className="size-3.5" />
                        Arquivar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
