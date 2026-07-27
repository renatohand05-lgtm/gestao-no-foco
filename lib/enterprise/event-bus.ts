/**
 * Sprint 21.6 — Event bus / registro de handlers (sem import circular).
 */

import type { IntegrationHandler, OutboxEventType } from "./types.ts";

export class EnterpriseEventBus {
  private readonly handlers = new Map<string, IntegrationHandler[]>();

  register(eventType: OutboxEventType | string, handler: IntegrationHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  unregisterAll(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
      return;
    }
    this.handlers.clear();
  }

  getHandlers(eventType: string): IntegrationHandler[] {
    return [...(this.handlers.get(eventType) ?? [])];
  }

  listEventTypes(): string[] {
    return [...this.handlers.keys()].sort();
  }
}

export const enterpriseEventBus = new EnterpriseEventBus();
