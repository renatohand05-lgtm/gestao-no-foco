/**
 * Sprint 22.5.1 — Antivírus: apenas interface + placeholder.
 * Nenhuma implementação real (ClamAV etc.) é feita nesta fase.
 */

export type AntivirusScanResult = {
  clean: boolean;
  engine?: string;
  detail?: string;
};

export interface AntivirusScanner {
  scan(bytes: Buffer | ArrayBuffer | Uint8Array): Promise<AntivirusScanResult>;
}

/** Scanner "no-op" — sempre considera o arquivo limpo. Usado enquanto não há integração real. */
export class NoopAntivirusScanner implements AntivirusScanner {
  async scan(): Promise<AntivirusScanResult> {
    return {
      clean: true,
      engine: "noop",
      detail:
        "Nenhum motor de antivírus configurado — verificação de assinatura/heurística local aplicada apenas.",
    };
  }
}

/**
 * Fábrica para futura substituição (ex.: ClamAV via socket/API).
 * Hoje sempre retorna o scanner no-op.
 */
export function createAntivirusScannerPlaceholder(): AntivirusScanner {
  return new NoopAntivirusScanner();
}
