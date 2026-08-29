"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type BillingSelectionContextValue = {
  selectedPlanSlug: string | null;
  selectPlan: (slug: string) => void;
};

const BillingSelectionContext =
  createContext<BillingSelectionContextValue | null>(null);

export function BillingSelectionProvider({
  children,
  initialPlanSlug,
}: {
  children: ReactNode;
  initialPlanSlug: string | null;
}) {
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string | null>(
    initialPlanSlug,
  );

  const value = useMemo(
    () => ({ selectedPlanSlug, selectPlan: setSelectedPlanSlug }),
    [selectedPlanSlug],
  );

  return (
    <BillingSelectionContext.Provider value={value}>
      {children}
    </BillingSelectionContext.Provider>
  );
}

/** Fora do provider, o checkout fica "sem plano selecionado" em vez de quebrar a página. */
export function useBillingSelection(): BillingSelectionContextValue {
  const ctx = useContext(BillingSelectionContext);
  if (!ctx) {
    return { selectedPlanSlug: null, selectPlan: () => {} };
  }
  return ctx;
}
