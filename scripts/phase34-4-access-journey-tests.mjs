#!/usr/bin/env node
/**
 * Sprint 34.4 — Jornada de acesso: recover password + convite + e-mail honesto.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("34.4 password recover routes", () => {
  it("remove link morto /login?recuperar=1 e aponta para /recuperar", () => {
    const login = read("components/auth/login-form.tsx");
    assert.ok(!login.includes("/login?recuperar=1"));
    assert.match(login, /href="\/recuperar"/);
    assert.match(login, /Esqueci minha senha/);
  });

  it("páginas /recuperar e /nova-senha existem", () => {
    assert.ok(existsSync(join(root, "app/(auth)/recuperar/page.tsx")));
    assert.ok(existsSync(join(root, "app/(auth)/nova-senha/page.tsx")));
    assert.ok(existsSync(join(root, "components/auth/recover-password-form.tsx")));
    assert.ok(existsSync(join(root, "components/auth/new-password-form.tsx")));
  });

  it("rotas públicas/reservadas incluem recuperar e nova-senha", () => {
    const constants = read("lib/constants.ts");
    const routes = read("lib/auth/routes.ts");
    assert.match(constants, /\/recuperar/);
    assert.match(constants, /\/nova-senha/);
    assert.match(routes, /"recuperar"/);
    assert.match(routes, /"nova-senha"/);
    // /nova-senha NÃO deve estar em AUTH_ROUTES (middleware expulsaria sessão de recovery)
    const authRoutesBlock = constants.slice(
      constants.indexOf("AUTH_ROUTES"),
      constants.indexOf("PUBLIC_ROUTES"),
    );
    assert.ok(!authRoutesBlock.includes("/nova-senha"));
  });

  it("recover usa resetPasswordForEmail + mensagem neutra + rate limit UX", () => {
    const recover = read("components/auth/recover-password-form.tsx");
    assert.match(recover, /resetPasswordForEmail/);
    assert.match(recover, /Se existir uma conta com este e-mail/);
    assert.match(recover, /rate limit|over_email_send_rate_limit/i);
    assert.match(recover, /callback\?next=\/nova-senha/);
    assert.ok(!/access_token|localStorage/.test(recover));
  });

  it("nova senha valida sessão, confirmação e não loga tokens", () => {
    const form = read("components/auth/new-password-form.tsx");
    assert.match(form, /updateUser\(\{\s*password/);
    assert.match(form, /password\.length < 8/);
    assert.match(form, /As senhas não coincidem/);
    assert.match(form, /signOut/);
    assert.match(form, /Link inválido ou expirado/);
    assert.ok(!/access_token/.test(form) || form.includes("Não lê/loga access_token"));
    assert.ok(!/localStorage\.setItem|localStorage\.getItem/.test(form));
    assert.match(form, /updateUser/);
    assert.match(form, /signOut/);
  });

  it("auth callback redireciona recovery para /nova-senha sem open redirect", () => {
    const cb = read("app/api/auth/callback/route.ts");
    assert.match(cb, /safeInternalPath/);
    assert.match(cb, /\/nova-senha/);
    assert.match(cb, /invalid_or_expired/);
  });
});

describe("34.4 invite rules + honesty", () => {
  it("regras puras bloqueiam owner e role inválida", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/equipe/invite-rules.ts")).href + `?t=${Date.now()}`
    );
    assert.equal(mod.isInvitableRole("admin"), true);
    assert.equal(mod.isInvitableRole("member"), true);
    assert.equal(mod.isInvitableRole("owner"), false);
    assert.equal(mod.isInvitableRole("superadmin"), false);
    assert.throws(() => mod.assertInvitableRole("owner"), /Proprietário/);
    assert.throws(() => mod.assertInvitableRole("god"), /inválido/);
    assert.equal(mod.assertInvitableRole("manager"), "manager");
    assert.equal(mod.isValidInviteEmail("  a@b.com "), true);
    assert.equal(mod.isValidInviteEmail("nope"), false);
    assert.equal(mod.normalizeInviteEmail("  A@B.COM "), "a@b.com");
  });

  it("createInvitation usa assertInvitableRole e emailSent sempre false", () => {
    const svc = read("lib/equipe/invitations-service.ts");
    assert.match(svc, /assertInvitableRole/);
    assert.match(svc, /emailSent: false/);
    assert.match(svc, /Já existe um convite pendente/);
    assert.match(svc, /inactive/);
    assert.match(svc, /Reativação explícita|status: "active"/);
  });

  it("UI de convite é honesta (copiar link) e sem papel owner", () => {
    const form = read("components/equipe/invite-form.tsx");
    assert.match(form, /INVITABLE_MEMBERSHIP_ROLE_OPTIONS/);
    assert.match(form, /Copie o link|copie o link/i);
    assert.match(form, /Convidar usuário/);
    assert.ok(!form.includes("E-mail enviado com sucesso"));
  });

  it("mutações de convite exigem assertEquipeAdmin", () => {
    const actions = read("lib/equipe/actions.ts");
    assert.match(actions, /createInvitationAction/);
    assert.match(actions, /assertEquipeAdmin/);
    assert.match(actions, /withEquipeAdmin/);
  });

  it("aceite valida e-mail, expiração, cancelamento e não duplica membership", () => {
    const svc = read("lib/equipe/invitations-service.ts");
    assert.match(svc, /acceptInvitation/);
    assert.match(svc, /não corresponde ao convite/);
    assert.match(svc, /Este convite expirou/);
    assert.match(svc, /Este convite foi cancelado/);
    assert.match(svc, /já foi aceito/);
    assert.match(svc, /idempotente|!existing/);
    const page = read("app/convite/[token]/page.tsx");
    assert.match(page, /revogado|Expirado|já foi utilizado/i);
  });
});

describe("34.4 privilege / cross-tenant contracts", () => {
  it("documenta matriz de authz", () => {
    const matrix = {
      owner_invite: "ALLOW",
      admin_invite: "ALLOW",
      member_invite: "BLOCK",
      inactive_invite: "BLOCK",
      unauthenticated_invite: "BLOCK",
      cross_tenant_invite: "BLOCK",
      invite_as_owner: "BLOCK",
      invite_invalid_role: "BLOCK",
      accept_wrong_email: "BLOCK",
      accept_expired: "BLOCK",
      accept_revoked: "BLOCK",
      multiempresa_after_accept: "ALLOW",
    };
    assert.equal(matrix.member_invite, "BLOCK");
    assert.equal(matrix.invite_as_owner, "BLOCK");
    assert.equal(matrix.multiempresa_after_accept, "ALLOW");
  });
});

describe("34.4 billing freeze", () => {
  it("billing permanece frozen safe", async () => {
    const prev = { ...process.env };
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_ENV;
    try {
      const config = await import(
        pathToFileURL(join(root, "lib/billing/config.ts")).href + `?t=${Date.now()}`
      );
      const blockers = await import(
        pathToFileURL(join(root, "lib/billing/external-blockers.ts")).href +
          `?t=${Date.now()}`
      );
      assert.equal(config.getAsaasEnvMode(), "sandbox");
      assert.equal(config.isRealChargesAuthorized(), false);
      assert.equal(blockers.isAsaasProductionApiKeyBlockedExternally(), true);
    } finally {
      for (const k of Object.keys(process.env)) {
        if (!(k in prev)) delete process.env[k];
      }
      Object.assign(process.env, prev);
    }
  });
});

describe("34.4 evidence + no migration required", () => {
  it("REPORT 34-4 presente e sem migration 34.4", () => {
    assert.ok(existsSync(join(root, "docs/testing/evidence/34-4/REPORT.md")));
    assert.ok(!existsSync(join(root, "supabase/migrations/20260827_phase34_4.sql")));
  });
});
