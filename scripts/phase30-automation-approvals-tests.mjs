#!/usr/bin/env node
/**
 * Sprint 30.7 — Aprovações: autoaprovação bloqueada; allowSelfApproval opcional.
 */
import { canDecideApproval } from "../lib/automacoes/approvals.ts";

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 30.7 — automation approvals\n");

const pendingApproval = {
  id: "ap1",
  tenantId: "tenant-a",
  ruleId: "r1",
  executionId: null,
  status: "pending",
  requestedBy: "user-requester",
  decidedBy: null,
  justification: null,
  createdAt: "2026-08-02T10:00:00Z",
  decidedAt: null,
  expiresAt: "2026-12-31T10:00:00Z",
  history: [],
};

const selfBlocked = canDecideApproval({
  approval: pendingApproval,
  actorUserId: "user-requester",
  decision: "approved",
  nowIso: "2026-08-02T12:00:00Z",
});
check("self-approval bloqueada", !selfBlocked.ok && selfBlocked.code === "SELF_APPROVAL");

const otherApproved = canDecideApproval({
  approval: pendingApproval,
  actorUserId: "user-approver",
  decision: "approved",
  justification: "OK",
  nowIso: "2026-08-02T12:00:00Z",
});
check("aprovação por terceiro ok", otherApproved.ok && otherApproved.approval.status === "approved");
check(
  "histórico registrado",
  otherApproved.ok && otherApproved.approval.history.length === 1,
);

const selfAllowed = canDecideApproval({
  approval: pendingApproval,
  actorUserId: "user-requester",
  decision: "approved",
  allowSelfApproval: true,
  nowIso: "2026-08-02T12:00:00Z",
});
check("allowSelfApproval libera", selfAllowed.ok && selfAllowed.approval.status === "approved");

const expired = canDecideApproval({
  approval: {
    ...pendingApproval,
    expiresAt: "2026-08-03T10:00:00Z",
  },
  actorUserId: "user-approver",
  decision: "approved",
  nowIso: "2026-08-04T12:00:00Z",
});
check("expirada bloqueada", !expired.ok && expired.code === "EXPIRED");

const already = canDecideApproval({
  approval: {
    ...pendingApproval,
    status: "approved",
    decidedBy: "user-approver",
    decidedAt: "2026-08-02T11:00:00Z",
  },
  actorUserId: "user-approver",
  decision: "rejected",
  nowIso: "2026-08-02T12:00:00Z",
});
check("dupla decisão bloqueada", !already.ok && already.code === "ALREADY_DECIDED");

const delegateMissing = canDecideApproval({
  approval: pendingApproval,
  actorUserId: "user-approver",
  decision: "delegated",
  nowIso: "2026-08-02T12:00:00Z",
});
check("delegação sem destino", !delegateMissing.ok && delegateMissing.code === "DELEGATE_TARGET");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
