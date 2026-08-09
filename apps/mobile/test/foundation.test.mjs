import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeForLog, createRequestId } from "../../../packages/utils/src/index.ts";

test("sanitizeForLog redacts sensitive keys", () => {
  const out = sanitizeForLog({
    email: "a@b.com",
    accessToken: "secret",
    safe: "ok",
  });
  // Sprint 32.2: PII keys (email) também redigidas
  assert.equal(out.email, "[REDACTED]");
  assert.equal(out.accessToken, "[REDACTED]");
  assert.equal(out.safe, "ok");
});

test("createRequestId prefix", () => {
  const id = createRequestId();
  assert.match(id, /^req_/);
});
