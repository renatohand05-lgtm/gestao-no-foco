import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeForLog, createRequestId } from "../../../packages/utils/src/index.ts";

test("sanitizeForLog redacts sensitive keys", () => {
  const out = sanitizeForLog({ email: "a@b.com", accessToken: "secret" });
  assert.equal(out.email, "a@b.com");
  assert.equal(out.accessToken, "[REDACTED]");
});

test("createRequestId prefix", () => {
  const id = createRequestId();
  assert.match(id, /^req_/);
});
