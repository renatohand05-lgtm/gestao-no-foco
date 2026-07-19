"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { ExecutiveCard } from "@/components/executive";
import { exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Isola falhas de renderização por seção do Painel Comercial.
 * Uma seção com erro não derruba as demais.
 */
export class ComercialSectionBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[ComercialSectionBoundary:${this.props.label}]`,
        error,
        info.componentStack,
      );
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" aria-label={`Erro em ${this.props.label}`}>
          <ExecutiveCard padding={20}>
            <h4 className={exTypography.label}>
              {this.props.label} indisponível
            </h4>
            <p className={cn("mt-1", exTypography.caption)}>
              Não foi possível exibir esta seção. As demais continuam
              disponíveis.
            </p>
          </ExecutiveCard>
        </div>
      );
    }

    return this.props.children;
  }
}
