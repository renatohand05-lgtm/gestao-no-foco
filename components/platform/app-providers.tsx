"use client";

import { ToastProvider } from "@/components/platform/toast-provider";
import { ThemeProvider } from "@/components/brand/theme-provider";

/**
 * Providers client-side da plataforma (tema + toasts).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
