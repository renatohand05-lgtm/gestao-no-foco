#!/usr/bin/env node
/**
 * Adendo hotfix oficina — format(), mecânico, tipos, checklist, state machine.
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

const ENGINE = { segmentVersion: 1 };

describe("format() / mechanic persistence", () => {
  it("1 sem specifier inválido no RPC de atribuição", () => {
    const sql = read(
      "supabase/migrations/20260906_hotfix_os_atribuir_mecanico_format.sql",
    );
    const body = sql.split("as $$")[1] ?? sql;
    assert.doesNotMatch(body, /%\.[0-9]+f/);
    assert.doesNotMatch(body, /format\s*\(/);
    assert.match(sql, /concat\(/);
    assert.match(sql, /atribuído como/);
    const friendly = read("lib/supabase/friendly-error.ts");
    assert.match(friendly, /unrecognized format\(\)/);
    assert.match(friendly, /vincular o mecânico/);
  });

  it("2-4 abrir OS atribui mecânico na tabela de alocação", () => {
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /osMec\.atribuir/);
    assert.match(actions, /createOsMecanicoService/);
    assert.doesNotMatch(actions, /mecanico_id não persistido/);
    const binder = read("components/ordens/os-mecanico-binder.tsx");
    assert.match(binder, /fallbackMecanico/);
    assert.match(binder, /osMecanicoId/);
    const mecSvc = read("lib/mecanicos/os-mecanico-service.ts");
    assert.match(mecSvc, /atribuirSemRpc/);
    assert.match(mecSvc, /type specifier/);
  });
});

describe("quick client / operation types", () => {
  it("5-10 oficina e lava usam o mesmo QuickClient + veículo", () => {
    const quick = read("components/clientes/quick-client-create.tsx");
    assert.match(quick, /Salvar cliente e usar/);
    assert.match(quick, /veiculo_modelo/);
    assert.match(quick, /Mais informações/);
    assert.doesNotMatch(quick, /name="score"/);
    assert.match(quick, /RelationshipTypeSelector/);
    const form = read("components/ordens/os-open-form.tsx");
    assert.match(form, /QuickClientCreate/);
    const agenda = read("components/agenda/agenda-event-create-form.tsx");
    assert.match(agenda, /QuickClientCreate/);
    const novo = read("app/(app)/[tenant]/clientes/novo/page.tsx");
    assert.match(novo, /QuickClientPageEntry/);
  });

  it("11-12 tipos filtrados por segmento, sem if(segment) na UI", async () => {
    const { attendanceOptionsForContext } = await load(
      "lib/segments/attendance-types.ts",
    );
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const oficina = attendanceOptionsForContext(
      resolveSegmentContext({ segment: "oficina", ...ENGINE }),
    );
    const lava = attendanceOptionsForContext(
      resolveSegmentContext({ segment: "lava_rapido", ...ENGINE }),
    );
    assert.equal(oficina.some((o) => o.label === "Consultoria"), false);
    assert.equal(oficina.some((o) => o.label === "Produção leve"), false);
    assert.ok(oficina.some((o) => o.label === "Oficina / Veículo"));
    assert.ok(oficina.some((o) => o.label === "Revisão"));
    assert.equal(lava.some((o) => o.label === "Consultoria"), false);
    assert.ok(lava.some((o) => o.label === "Lavagem"));
    assert.ok(lava.some((o) => o.label === "Detalhamento"));
    assert.equal(lava.some((o) => o.label === "Oficina / Veículo"), false);
    assert.equal(lava.some((o) => o.label === "Consultoria"), false);
    assert.equal(lava.length, 6);
    const form = read("components/ordens/os-open-form.tsx");
    assert.doesNotMatch(form, /if \(segment ===/);
  });
});

describe("checklist / budget / finalize", () => {
  it("13-16 fotos motor e isolamento de anexos", () => {
    const status = read("lib/ordens/os-status.ts");
    assert.match(status, /cofre_superior/);
    assert.match(status, /quando acessível/);
    assert.match(status, /ext_frente/);
    assert.match(status, /codigo: "placa"/);
    assert.match(status, /codigo: "acessorios"/);
    const page = read("app/(app)/[tenant]/ordens/[id]/page.tsx");
    assert.match(page, /ensureChecklistCoverage/);
    const storage = read("lib/ordens/inspecao-storage-service.ts");
    assert.match(storage, /tenant_id/);
  });

  it("17-21 state machine: publicado permite aprovação; sem falso aprovado", async () => {
    const { canApplyAprovacao, effectiveItemAprovacaoStatus } = await load(
      "lib/ordens/os-status.ts",
    );
    assert.equal(canApplyAprovacao("aguardando_diagnostico", true), false);
    assert.equal(
      canApplyAprovacao("aguardando_diagnostico", true, {
        publishedBudget: true,
      }),
      false,
    );
    assert.equal(
      canApplyAprovacao("diagnostico_concluido", true, {
        publishedBudget: true,
      }),
      true,
    );
    assert.equal(
      effectiveItemAprovacaoStatus("aguardando_diagnostico", "aprovado"),
      "pendente",
    );
    assert.equal(
      effectiveItemAprovacaoStatus("aguardando_aprovacao", "aprovado"),
      "aprovado",
    );
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /effectiveItemAprovacaoStatus/);
    const pub = read("lib/ordens/orcamento-versao-service.ts");
    assert.match(pub, /ensureStatus/);
  });

  it("22-25 SERVICE_READY não bloqueia OS; 26-28 entrega", () => {
    const fin = read("lib/retention/actions.ts");
    assert.match(fin, /OS finalizada. Não foi possível enviar a notificação/);
    assert.match(fin, /marcarAguardandoRetirada/);
    const panel = read("components/retention/service-ready-panel.tsx");
    assert.match(panel, /channels/);
    const entrega = read("lib/ordens/ordem-servico-service.ts");
    assert.match(entrega, /concluirEntrega/);
    assert.match(entrega, /quilometragem_saida/);
    assert.match(entrega, /aceite_entrega_em/);
    const ret = read("components/ordens/os-workspace.tsx");
    assert.match(ret, /AUTOMOTIVE_RETURN_PRESETS/);
    const presets = read("lib/ux/fast-input.ts");
    assert.match(presets, /5\.000 km/);
    assert.match(presets, /10\.000 km/);
    const picker = read("components/agenda/agenda-service-field.tsx");
    assert.match(picker, /Escolher das sugestões/);
    assert.match(picker, /\+ Criar serviço/);
    const open = read("components/ordens/os-open-form.tsx");
    assert.match(open, /multiple/);
    assert.match(open, /servico_ids/);
  });
});

describe("guards", () => {
  it("não toca billing, live comm, cron, 35.3", () => {
    const touched = [
      "lib/ordens/actions.ts",
      "lib/retention/actions.ts",
      "lib/segments/attendance-types.ts",
    ];
    for (const f of touched) {
      const src = read(f);
      assert.doesNotMatch(src, /COMMUNICATION_MODE\s*=\s*['\"]live['\"]/);
      assert.doesNotMatch(src, /asaas/i);
    }
  });
});
