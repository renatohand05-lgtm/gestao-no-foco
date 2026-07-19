"use client";

import { ToastProvider } from "@/components/platform/toast-provider";

/**
 * Providers client-side da plataforma (toasts / notificações).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
