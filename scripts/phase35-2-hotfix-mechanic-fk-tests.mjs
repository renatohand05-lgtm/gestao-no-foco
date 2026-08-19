#!/usr/bin/env node
/**
 * Hotfix: FK mecanico_id (profiles vs mecanicos) + canais do cliente.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

describe("mechanic FK audit / adapter", () => {
  it("1 picker oficina carrega mecanicos; OS/itens FK = profiles; RPC = mecanicos", () => {
    const nova = read("app/(app)/[tenant]/ordens/nova/page.tsx");
    assert.match(nova, /createMecanicoService/);
    assert.match(nova, /m\.id/);
    const agenda = read("app/(app)/[tenant]/agenda/page.tsx");
    assert.match(agenda, /createMecanicoService/);
    const fix = read("supabase/migrations/20260723_fix_oficina_os_enterprise.sql");
    assert.match(fix, /ordens_servico_mecanico_id_fkey[\s\S]*profiles/);
    assert.match(fix, /ordem_servico_itens_mecanico_id_fkey[\s\S]*profiles/);
    const rpc = read("supabase/migrations/20260803_mecanicos_custo_os_dre.sql");
    assert.match(rpc, /where id = p_mecanico_id and tenant_id = p_tenant_id/);
    const adapter = read("lib/mecanicos/resolve-operational-assignee.ts");
    assert.match(adapter, /mechanicId/);
    assert.match(adapter, /profileId/);
    assert.match(adapter, /osColumnMechanicId/);
  });

  it("2-9 create/agenda/itens usam adapter; profissional.id não vai cru para FK", () => {
    const osSvc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(osSvc, /resolveOperationalAssignee/);
    assert.match(osSvc, /osColumnMechanicId/);
    assert.doesNotMatch(
      osSvc.split("async create(")[1].split("async attachScheduledCatalogItem")[0],
      /mecanico_id: emptyUuid\(input\.mecanico_id\)/,
    );
    const conv = read("lib/crm/phase28/conversion-service.ts");
    assert.match(conv, /resolveOperationalAssignee/);
    assert.match(conv, /assignee\?\.mechanicId/);
    assert.doesNotMatch(conv, /mecanico_id: ev\.responsavel_id/);
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /resolveOperationalAssignee/);
    assert.doesNotMatch(actions, /mecânico não vinculado na abertura/);
  });

  it("10-12 inativo/ausente e FK raw viram mensagem amigável", async () => {
    const { ASSIGNEE_UNAVAILABLE_MESSAGE } = await load(
      "lib/mecanicos/resolve-operational-assignee.ts",
    );
    assert.match(ASSIGNEE_UNAVAILABLE_MESSAGE, /não está disponível nesta empresa/);
    const { mapDatabaseErrorToUserMessage } = await load(
      "lib/supabase/friendly-error.ts",
    );
    const mapped = mapDatabaseErrorToUserMessage(
      new Error(
        'insert violates foreign key constraint "ordens_servico_mecanico_id_fkey"',
      ),
    );
    assert.doesNotMatch(mapped, /violates foreign key/i);
    assert.match(mapped, /vincular o mecânico/);
    const conv = read("lib/crm/phase28/conversion-actions.ts");
    assert.match(conv, /toActionError/);
  });
});

describe("customer channels", () => {
  it("13-17 telefone BR e quick client persistem whatsapp/email", async () => {
    const { toStoredWhatsapp, customerWhatsappAvailable } = await load(
      "lib/clientes/phone.ts",
    );
    assert.equal(toStoredWhatsapp("(11) 91475-0099"), "+5511914750099");
    assert.equal(customerWhatsappAvailable("+5511914750099", null), true);
    const mappers = read("lib/clientes/mappers.ts");
    assert.match(mappers, /toStoredWhatsapp/);
    const quick = read("components/clientes/quick-client-create.tsx");
    assert.match(quick, /whatsapp: fields.whatsapp/);
    assert.match(quick, /email: fields.email/);
  });

  it("18-20 agenda: sem canal ≠ provider ausente", async () => {
    const { formatCustomerChannelAvailability } = await load(
      "lib/retention/comm-note.ts",
    );
    const prepared = formatCustomerChannelAvailability({
      whatsappAvailable: true,
      emailAvailable: true,
      whatsappProviderConfigured: false,
      emailProviderConfigured: false,
    });
    assert.match(prepared, /Confirmação preparada/);
    assert.match(prepared, /provider não configurado/);
    assert.doesNotMatch(prepared, /Cliente sem canal/);
    const empty = formatCustomerChannelAvailability({
      whatsappAvailable: false,
      emailAvailable: false,
    });
    assert.equal(empty, "Cliente sem canal disponível");
    const agenda = read("lib/agenda/actions.ts");
    assert.match(agenda, /formatCustomerChannelAvailability/);
    assert.match(agenda, /resolveCustomerChannels/);
  });
});

describe("guards", () => {
  it("não toca billing, live, cron, 35.3", () => {
    for (const f of [
      "lib/mecanicos/resolve-operational-assignee.ts",
      "lib/agenda/actions.ts",
      "lib/ordens/actions.ts",
    ]) {
      const src = read(f);
      assert.doesNotMatch(src, /COMMUNICATION_MODE\s*=\s*['\"]live['\"]/);
      assert.doesNotMatch(src, /asaas/i);
    }
  });
});
