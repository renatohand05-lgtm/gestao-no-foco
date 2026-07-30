#!/usr/bin/env node
/**
 * Sprint 25.4.2 — History cleanup (archive / soft-delete / draft / UI)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyHistoryLifecycle,
  historySoftDeleteAffectsOperationalData,
  isHistoryVisible,
} from "../lib/import-engine/delete/history-lifecycle.ts";
import {
  clearImportDraftEverywhere,
  clearImportDraftStorage,
  clearWizardSessionsInMemory,
  createEmptyImportDraft,
  IMPORT_DRAFT_STORAGE_PREFIXES,
} from "../lib/import-engine/delete/draft-session.ts";
import {
  extendHistoryStoreWithLifecycle,
} from "../lib/import-engine/delete/history-store-lifecycle.ts";
import { MemoryImportHistoryStore } from "../lib/import-engine/history/import-history-store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nImport History Cleanup — Sprint 25.4.2\n");

const baseEntry = {
  id: "run1",
  tenantId: "t1",
  userId: "u1",
  userLabel: "Owner",
  module: "estoque_catalogo",
  fileName: "produtos.xlsx",
  format: "xlsx",
  status: "completed",
  totalRows: 10,
  importedRows: 10,
  rejectedRows: 0,
  errorCount: 0,
  durationMs: 100,
  createdAt: "2026-07-01T10:00:00.000Z",
  errorsSample: [],
};

// —— Arquivar / restaurar ——
const archived = applyHistoryLifecycle(baseEntry, "archive", {
  userId: "u1",
  reason: "Limpeza visual",
});
assert(Boolean(archived.archivedAt), "arquivar histórico");
assert(archived.deleteReason === "Limpeza visual", "motivo arquivamento");
assert(isHistoryVisible(archived, "active") === false, "oculto na visão ativa");
assert(isHistoryVisible(archived, "archived") === true, "visível em arquivados");

const restored = applyHistoryLifecycle(archived, "restore_archive", {
  userId: "u1",
  reason: "restore",
});
assert(!restored.archivedAt, "restaurar histórico arquivado");

// —— Soft-delete histórico ——
const soft = applyHistoryLifecycle(baseEntry, "soft_delete_history", {
  userId: "u1",
  reason: "Remover da lista",
});
assert(Boolean(soft.deletedAt), "excluir apenas histórico (soft)");
assert(historySoftDeleteAffectsOperationalData() === false, "não apaga dados operacionais");
assert(isHistoryVisible(soft, "active") === false, "soft-deleted oculto");
assert(isHistoryVisible(soft, "deleted") === true, "filtro deleted");

const restoredSoft = applyHistoryLifecycle(soft, "restore_soft_delete", {
  userId: "u1",
  reason: "restore",
});
assert(!restoredSoft.deletedAt, "restaurar soft-delete");

try {
  applyHistoryLifecycle(soft, "archive", { userId: "u1", reason: "x" });
  assert(false, "não arquivar já deleted");
} catch {
  assert(true, "bloqueio arquivar deleted");
}

// —— Memory store lifecycle ——
const mem = new MemoryImportHistoryStore();
const stored = await mem.append({ ...baseEntry, id: undefined });
const life = extendHistoryStoreWithLifecycle(mem);
const arch = await life.archive(stored.tenantId, stored.id, "u1", "motivo ok");
assert(arch?.archivedAt, "store archive");
const listActive = await life.listPageVisible(stored.tenantId, {
  visibility: "active",
});
assert(
  !listActive.items.some((i) => i.id === stored.id),
  "arquivado fora da lista ativa",
);
const listArch = await life.listPageVisible(stored.tenantId, {
  visibility: "archived",
});
assert(
  listArch.items.some((i) => i.id === stored.id),
  "arquivado na lista arquivados",
);

// —— Limpar rascunho / sessão ——
const draft = createEmptyImportDraft();
assert(draft.fileName === null && draft.preview === null, "apagar rascunho atual (estado vazio)");

class FakeStorage {
  constructor() {
    this.map = new Map();
  }
  get length() {
    return this.map.size;
  }
  key(i) {
    return [...this.map.keys()][i] ?? null;
  }
  setItem(k, v) {
    this.map.set(k, v);
  }
  getItem(k) {
    return this.map.get(k) ?? null;
  }
  removeItem(k) {
    this.map.delete(k);
  }
}

const session = new FakeStorage();
session.setItem("import-draft:abc", "{}");
session.setItem("catalog-import-draft:x", "1");
session.setItem("pref-theme", "dark");
const cleared = clearImportDraftStorage(session);
assert(cleared === 2, "limpar memória de sessão (draft)");
assert(session.getItem("pref-theme") === "dark", "não limpa preferências");

const local = new FakeStorage();
local.setItem("import-wizard:1", "x");
const both = clearImportDraftEverywhere({
  sessionStorage: session,
  localStorage: local,
});
assert(both.localCleared === 1, "localStorage draft limpo");

const wiz = new Map([
  ["t1:mod:a", {}],
  ["t2:mod:b", {}],
]);
assert(
  clearWizardSessionsInMemory(wiz, (k) => k.startsWith("t1:")) === 1,
  "store wizard memória",
);

assert(IMPORT_DRAFT_STORAGE_PREFIXES.length >= 4, "prefixos draft");

// —— Migration / UI / permissões ——
assert(
  existsSync(
    join(root, "supabase/migrations/20260814_import_history_lifecycle_fase2542.sql"),
  ),
  "migration lifecycle",
);
const sql = readFileSync(
  join(root, "supabase/migrations/20260814_import_history_lifecycle_fase2542.sql"),
  "utf8",
);
assert(sql.includes("archived_at"), "SQL archived_at");
assert(sql.includes("deleted_at"), "SQL deleted_at");
assert(sql.includes("delete_reason"), "SQL delete_reason");
assert(sql.includes("add column if not exists"), "SQL idempotente");

assert(
  existsSync(
    join(root, "components/import-engine/import-history-row-actions.tsx"),
  ),
  "UI ações histórico",
);
const ui = readFileSync(
  join(root, "components/import-engine/import-history-row-actions.tsx"),
  "utf8",
);
assert(ui.includes("Desfazer importação"), "botão desfazer");
assert(ui.includes("Excluir do histórico"), "botão excluir histórico");
assert(ui.includes("Arquivar histórico"), "botão arquivar");
assert(ui.includes("Baixar relatório"), "botão relatório");
assert(ui.includes("Digite EXCLUIR"), "confirmação tipada");

assert(
  readFileSync(
    join(root, "components/catalog-import/catalog-import-panel.tsx"),
    "utf8",
  ).includes("Limpar importação atual"),
  "limpar rascunho produtos",
);
assert(
  readFileSync(
    join(root, "components/catalog-import/stock-invoice-import-panel.tsx"),
    "utf8",
  ).includes("Limpar importação atual"),
  "limpar rascunho estoque",
);

assert(
  readFileSync(join(root, "lib/rbac/permissions.ts"), "utf8").includes(
    "importacoes.excluir_historico",
  ),
  "permissão excluir histórico",
);
assert(
  readFileSync(join(root, "package.json"), "utf8").includes(
    "test:import-history-cleanup",
  ),
  "script npm",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
if (fail > 0) process.exit(1);
