"use client";

import { useDemoMode } from "@/components/demo/demo-mode-provider";
import type { DemoHideFlags } from "@/lib/demo";

type Props = {
  flag: keyof DemoHideFlags;
  children: React.ReactNode;
  /** Quando true, renderiza children apenas se o flag NÃO ocultar */
  fallback?: React.ReactNode;
};

/** Oculta filhos quando o Demo Mode exige limpeza visual. */
export function DemoHide({ flag, children, fallback = null }: Props) {
  const { hide } = useDemoMode();
  if (hide[flag]) return <>{fallback}</>;
  return <>{children}</>;
}
