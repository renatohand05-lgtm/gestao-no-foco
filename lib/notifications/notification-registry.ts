/**
 * Sprint 21.5 — Registry de definições de notificação.
 */

import type { NotificationDefinition } from "./types.ts";
import { NotificationError, NOTIFICATION_ERROR_CODES } from "./notification-errors.ts";

export class NotificationRegistry {
  private readonly byKey = new Map<string, NotificationDefinition>();

  private key(id: string, version: string): string {
    return `${id}@${version}`;
  }

  register(definition: NotificationDefinition): void {
    const key = this.key(definition.id, definition.version);
    if (this.byKey.has(key)) {
      throw new NotificationError(`Definição já registrada: ${key}`, {
        code: NOTIFICATION_ERROR_CODES.INVALID_REQUEST,
      });
    }
    this.byKey.set(key, definition);
  }

  get(id: string, version = "1.0.0"): NotificationDefinition | undefined {
    return this.byKey.get(this.key(id, version));
  }

  list(): NotificationDefinition[] {
    return [...this.byKey.values()].sort((a, b) =>
      this.key(a.id, a.version).localeCompare(this.key(b.id, b.version)),
    );
  }

  clear(): void {
    this.byKey.clear();
  }

  size(): number {
    return this.byKey.size;
  }
}

export const notificationRegistry = new NotificationRegistry();
