/**
 * Sprint 21.2 — Logger de auditoria (API pública simples).
 *
 * Preparado para RBAC e demais módulos:
 *   audit.log(context, { event: "PERMISSION_DENIED", ... })
 *
 * Sink desacoplado — sem I/O nesta sprint (memória / callback).
 */

import { recordAuditEvent } from "./recorder.ts";
import type { AuditSeverityId } from "./severity.ts";
import type {
  AuditContext,
  AuditEvent,
  AuditLogInput,
  AuditRecordResult,
  AuditSink,
} from "./types.ts";

export type AuditLoggerOptions = {
  sink?: AuditSink | null;
  /** Quando true, também acumula em memória (útil em testes / preview). */
  retainInMemory?: boolean;
  maxInMemory?: number;
};

function withSeverity(
  input: AuditLogInput,
  severity: AuditSeverityId,
): AuditLogInput {
  return { ...input, severity };
}

export class AuditLogger {
  private sink: AuditSink | null;
  private retain: boolean;
  private maxInMemory: number;
  private buffer: AuditEvent[] = [];

  constructor(options: AuditLoggerOptions = {}) {
    this.sink = options.sink ?? null;
    this.retain = options.retainInMemory !== false;
    this.maxInMemory = options.maxInMemory ?? 1000;
  }

  setSink(sink: AuditSink | null): void {
    this.sink = sink;
  }

  getEvents(): readonly AuditEvent[] {
    return this.buffer;
  }

  clear(): void {
    this.buffer = [];
  }

  private push(event: AuditEvent): void {
    if (this.retain) {
      this.buffer.push(event);
      if (this.buffer.length > this.maxInMemory) {
        this.buffer = this.buffer.slice(-this.maxInMemory);
      }
    }
    if (this.sink) {
      void this.sink.write(event);
    }
  }

  private write(
    context: AuditContext | null | undefined,
    input: AuditLogInput,
  ): AuditRecordResult {
    const result = recordAuditEvent(context, input);
    if (result.ok) {
      this.push(result.event);
    }
    return result;
  }

  log(
    context: AuditContext | null | undefined,
    input: AuditLogInput,
  ): AuditRecordResult {
    return this.write(context, input);
  }

  success(
    context: AuditContext | null | undefined,
    input: AuditLogInput,
  ): AuditRecordResult {
    return this.write(context, withSeverity(input, "Success"));
  }

  warning(
    context: AuditContext | null | undefined,
    input: AuditLogInput,
  ): AuditRecordResult {
    return this.write(context, withSeverity(input, "Warning"));
  }

  error(
    context: AuditContext | null | undefined,
    input: AuditLogInput,
  ): AuditRecordResult {
    return this.write(context, withSeverity(input, "Error"));
  }

  critical(
    context: AuditContext | null | undefined,
    input: AuditLogInput,
  ): AuditRecordResult {
    return this.write(context, withSeverity(input, "Critical"));
  }

  info(
    context: AuditContext | null | undefined,
    input: AuditLogInput,
  ): AuditRecordResult {
    return this.write(context, withSeverity(input, "Info"));
  }

  trace(
    context: AuditContext | null | undefined,
    input: AuditLogInput,
  ): AuditRecordResult {
    return this.write(context, withSeverity(input, "Trace"));
  }
}

/** Instância padrão — módulos (ex.: RBAC futuro) podem importar `audit`. */
export const audit = new AuditLogger({ retainInMemory: true });

export function createAuditLogger(
  options?: AuditLoggerOptions,
): AuditLogger {
  return new AuditLogger(options);
}
