/**
 * Sprint 26.7 — Registry de providers + motor tributário desacoplado.
 */

import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import {
  assertRuleActive,
  resolveActiveRuleVersion,
} from "./tax-rule-registry.ts";
import type {
  TaxBaseLine,
  TaxComputationResult,
  TaxEntity,
  TaxRegimeCode,
  TaxRuleVersion,
} from "./types.ts";
import {
  cbsProvider,
  customRegimeProvider,
  ibsProvider,
  lucroPresumidoProvider,
  lucroRealProvider,
  simplesNacionalProvider,
} from "./providers/builtin-providers.ts";
import type { TaxRegimeProvider } from "./providers/types.ts";

const DEFAULT_PROVIDERS: TaxRegimeProvider[] = [
  simplesNacionalProvider,
  lucroPresumidoProvider,
  lucroRealProvider,
  cbsProvider,
  ibsProvider,
  customRegimeProvider,
];

export function createTaxProviderRegistry(
  extra: TaxRegimeProvider[] = [],
): Map<TaxRegimeCode, TaxRegimeProvider> {
  const map = new Map<TaxRegimeCode, TaxRegimeProvider>();
  for (const p of [...DEFAULT_PROVIDERS, ...extra]) {
    map.set(p.code, p);
  }
  return map;
}

export type TaxEngine = {
  computeForEntity: (args: {
    tenantId: string;
    asOf: string;
    entity: TaxEntity;
    bases: TaxBaseLine[];
    ruleVersions: TaxRuleVersion[];
    regimeOverride?: TaxRegimeCode | null;
    ruleOverride?: TaxRuleVersion | null;
  }) => TaxComputationResult;
  listProviders: () => Array<{ code: TaxRegimeCode; label: string }>;
};

export function createTaxEngine(
  providers = createTaxProviderRegistry(),
): TaxEngine {
  return {
    listProviders() {
      return [...providers.values()].map((p) => ({
        code: p.code,
        label: p.label,
      }));
    },
    computeForEntity({
      tenantId,
      asOf,
      entity,
      bases,
      ruleVersions,
      regimeOverride,
      ruleOverride,
    }) {
      const regime = regimeOverride ?? entity.regimeCode;
      const provider = providers.get(regime);
      if (!provider) {
        throw new FinanceError(
          `Provider ausente para regime ${regime}. Registre um provider ou use custom.`,
          FINANCE_ERROR_CODES.VALIDATION,
        );
      }

      const rule =
        ruleOverride ??
        resolveActiveRuleVersion(ruleVersions, regime, asOf, tenantId);
      assertRuleActive(rule, asOf);

      const entityBases = bases.filter(
        (b) => b.tenantId === tenantId && b.entityId === entity.id,
      );
      const period =
        entityBases[0]?.period ?? asOf.slice(0, 7);

      return provider.compute({
        tenantId,
        asOf,
        regimeCode: regime,
        entityId: entity.id,
        period,
        bases: entityBases,
        ruleVersion: rule,
      });
    },
  };
}

/** Instância default — extensível via createTaxEngine(registry). */
export const defaultTaxEngine = createTaxEngine();
