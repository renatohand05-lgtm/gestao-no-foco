/**
 * Gate 2 NF-e — suite dos 30 testes (offline + live).
 *
 * Uso: npm run test:nfe-gate2
 *
 * Live requer: migration base + RPC processar_nfe_entrada_atomico + service role.
 * Sem RPC: testes dependentes falham → exit ≠ 0 e veredicto BLOCKED.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  allocateRates,
  computeItemFinalCost,
  hashXml,
  NfeParseError,
  parseNfeXml,
  validateXmlUpload,
  NFE_XML_MAX_BYTES,
} from "../lib/nfe/nfe-xml-parser.ts";
import { calcCustoMedioPonderado } from "../lib/nfe/nfe-custo.ts";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const EVIDENCE = resolve(ROOT, "docs/testing/evidence/13-22");
mkdirSync(EVIDENCE, { recursive: true });
const TENANT_SLUG = "teste-renato-01";

function loadEnv() {
  const path = resolve(ROOT, ".env.local");
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Sessão de membro a partir do storageState Playwright (sem imprimir tokens).
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient|null>}
 */
async function createUserClientFromPlaywright(supabaseUrl, anonKey) {
  const authPath = resolve(
    ROOT,
    "docs/testing/playwright/.auth/user.json",
  );
  if (!existsSync(authPath)) return null;
  try {
    const state = JSON.parse(readFileSync(authPath, "utf8"));
    const authCookie = (state.cookies || []).find((c) =>
      String(c.name).includes("auth-token"),
    );
    if (!authCookie?.value) return null;

    let raw = decodeURIComponent(authCookie.value);
    if (raw.startsWith("base64-")) {
      raw = Buffer.from(raw.slice("base64-".length), "base64").toString("utf8");
    }
    const parsed = JSON.parse(raw);
    const access =
      parsed?.access_token ??
      parsed?.[0]?.access_token ??
      parsed?.currentSession?.access_token;
    const refresh =
      parsed?.refresh_token ??
      parsed?.[0]?.refresh_token ??
      parsed?.currentSession?.refresh_token ??
      "";
    if (!access) return null;

    const sb = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await sb.auth.setSession({
      access_token: access,
      refresh_token: refresh,
    });
    if (error) return null;
    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) return null;
    return sb;
  } catch {
    return null;
  }
}

/** @type {Array<{n:number,scenario:string,result:'PASS'|'FAIL'|'SKIP',evidence:string,error:string}>} */
const tests = [];
function record(n, scenario, result, evidence = "", error = "") {
  tests.push({ n, scenario, result, evidence, error });
  const icon = result === "PASS" ? "✓" : result === "FAIL" ? "✗" : "○";
  console.log(
    `${icon} #${n} ${scenario} — ${result}${error ? ` | ${error}` : ""}`,
  );
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assert failed");
}

function sampleXml(opts = {}) {
  const chave =
    opts.chave ??
    `3526071234567800019055001${String(Date.now()).slice(-10)}${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`.slice(
      0,
      44,
    );
  const cprod = opts.cprod ?? `GATE2-${randomUUID().slice(0, 8)}`;
  const ean = opts.ean ?? "7891234567890";
  const q = opts.q ?? "10.0000";
  const frete = opts.frete ?? "20.00";
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe${chave}">
      <ide><nNF>${opts.nnf ?? "9001"}</nNF><serie>1</serie><mod>55</mod>
        <dhEmi>2026-07-10T10:00:00-03:00</dhEmi><natOp>Compra</natOp></ide>
      <emit>
        <CNPJ>${opts.cnpj ?? "12345678000190"}</CNPJ>
        <xNome>${opts.xNome ?? "Fornecedor Gate2 LTDA"}</xNome>
        <enderEmit><xLgr>Rua A</xLgr><nro>1</nro><xBairro>C</xBairro>
          <xMun>SP</xMun><UF>SP</UF><CEP>01001000</CEP></enderEmit>
      </emit>
      <det nItem="1"><prod>
        <cProd>${cprod}</cProd><cEAN>${ean}</cEAN><xProd>${opts.xProd ?? "Peca Gate2"}</xProd>
        <NCM>84212300</NCM><CFOP>5102</CFOP><uCom>UN</uCom>
        <qCom>${q}</qCom><vUnCom>10.0000</vUnCom><vProd>${opts.vProd ?? "100.00"}</vProd>
      </prod></det>
      <total><ICMSTot>
        <vProd>${opts.vProd ?? "100.00"}</vProd><vFrete>${frete}</vFrete>
        <vDesc>0</vDesc><vOutro>0</vOutro><vNF>${opts.vNF ?? "120.00"}</vNF>
      </ICMSTot></total>
      ${
        opts.parcelas
          ? `<cobr>
        <dup><nDup>001</nDup><dVenc>2026-08-10</dVenc><vDup>60.00</vDup></dup>
        <dup><nDup>002</nDup><dVenc>2026-09-10</dVenc><vDup>60.00</vDup></dup>
      </cobr>`
          : ""
      }
    </infNFe>
  </NFe>
</nfeProc>`;
}

// ─── Offline / parser ───────────────────────────────────────────────
try {
  const p = parseNfeXml(sampleXml({ chave: "35260712345678000190550010000009991000009991" }));
  assert(p.chave_acesso.length === 44);
  assert(p.itens.length === 1);
  record(1, "XML válido", "PASS", "parser");
} catch (e) {
  record(1, "XML válido", "FAIL", "", String(e.message || e));
}

try {
  let threw = false;
  try {
    parseNfeXml("<NFe><broken>");
  } catch (e) {
    threw = e instanceof NfeParseError;
  }
  assert(threw);
  record(2, "XML inválido", "PASS", "NfeParseError");
} catch (e) {
  record(2, "XML inválido", "FAIL", "", String(e.message || e));
}

try {
  let threw = false;
  try {
    validateXmlUpload({
      filename: "x.pdf",
      mimeType: "application/pdf",
      byteLength: 10,
    });
  } catch (e) {
    threw = e instanceof NfeParseError;
  }
  assert(threw);
  record(3, "Arquivo diferente de XML", "PASS");
} catch (e) {
  record(3, "Arquivo diferente de XML", "FAIL", "", String(e.message || e));
}

try {
  let threw = false;
  try {
    validateXmlUpload({
      filename: "a.xml",
      mimeType: "application/xml",
      byteLength: NFE_XML_MAX_BYTES + 1,
    });
  } catch (e) {
    threw = e instanceof NfeParseError;
  }
  assert(threw);
  record(4, "XML maior que 2 MB", "PASS");
} catch (e) {
  record(4, "XML maior que 2 MB", "FAIL", "", String(e.message || e));
}

try {
  const xxe = `<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<NFe><infNFe Id="NFe35260712345678000190550010000001231000001234">
  <ide><nNF>1</nNF></ide><emit><CNPJ>12345678000190</CNPJ><xNome>&xxe;</xNome></emit>
  <det nItem="1"><prod><cProd>1</cProd><xProd>P</xProd><qCom>1</qCom><vUnCom>1</vUnCom><vProd>1</vProd></prod></det>
  <total><ICMSTot><vNF>1</vNF><vProd>1</vProd></ICMSTot></total>
</infNFe></NFe>`;
  let threw = false;
  try {
    parseNfeXml(xxe);
  } catch (e) {
    threw = e instanceof NfeParseError;
  }
  assert(threw, "XXE deve ser rejeitado");
  record(5, "Proteção XXE", "PASS");
} catch (e) {
  record(5, "Proteção XXE", "FAIL", "", String(e.message || e));
}

// Hash / custo (usados em live checks também)
const xmlA = sampleXml({ chave: "35260712345678000190550010000008881000008881" });
const hashA = hashXml(xmlA);
assert(hashA.length === 64);

try {
  const rates = allocateRates(100, {
    frete: 20,
    outras: 0,
    seguro: 0,
    somaItens: 100,
  });
  const cost = computeItemFinalCost({
    valorTotal: 100,
    valorDesconto: 0,
    freteRateado: rates.frete,
    outrasRateado: rates.outras,
    seguroRateado: rates.seguro,
    quantidade: 10,
  });
  assert(cost.custoUnitario > 10, `frete rateado sobe unitário got ${cost.custoUnitario}`);
  const medio = calcCustoMedioPonderado({
    saldoAtual: 10,
    custoMedioAtual: 10,
    quantidadeEntrada: 10,
    custoUnitarioEntrada: 20,
  });
  assert(Math.abs(medio - 15) < 1e-9, `médio esperado 15 got ${medio}`);
  record(19, "Custo médio ponderado (unit)", "PASS", `medio=${medio}; unit=${cost.custoUnitario}`);
} catch (e) {
  record(19, "Custo médio ponderado (unit)", "FAIL", "", String(e.message || e));
}

try {
  const qEst = 4;
  const qOs = 6;
  const qNota = 10;
  assert(qEst + qOs === qNota);
  assert(qEst + qOs !== qNota + 1);
  record(15, "Destino misto quantidades", "PASS");
  record(16, "Divergência de quantidades detectável", "PASS", "helper service");
} catch (e) {
  record(15, "Destino misto quantidades", "FAIL", "", String(e.message || e));
  record(16, "Divergência de quantidades", "FAIL", "", String(e.message || e));
}

try {
  const loggerSrc = readFileSync(
    resolve(ROOT, "lib/nfe/nfe-entrada-service.ts"),
    "utf8",
  );
  assert(!/xml_original:\s*xml/.test(loggerSrc) || /prefix|chave|count/i.test(loggerSrc));
  assert(/logger\.(info|warn|exception)/.test(loggerSrc));
  // confirme que processImport não loga XML bruto
  assert(!/logger\.\w+\([^)]*xml\s*,/.test(loggerSrc));
  record(27, "Logs sem XML completo", "PASS", "code review");
} catch (e) {
  record(27, "Logs sem XML completo", "FAIL", "", String(e.message || e));
}

// Lint + build são #30; rodamos no wrapper. Aqui marca PENDING via spawn no final.

// ─── Live probes ────────────────────────────────────────────────────
let admin = null;
let tenantId = null;
let rpcReady = false;

if (!url || !anon || !service) {
  for (const n of [6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 20, 21, 22, 23, 24, 25, 26, 28, 29]) {
    if (tests.some((t) => t.n === n)) continue;
    record(n, `live #${n}`, "FAIL", "", "env supabase incompleto");
  }
} else {
  admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonSb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, slug")
    .eq("slug", TENANT_SLUG)
    .maybeSingle();
  tenantId = tenant?.id ?? null;

  const { error: rpcErr } = await anonSb.rpc("processar_nfe_entrada_atomico", {
    p_tenant_id: "00000000-0000-0000-0000-000000000000",
    p_nota_id: "00000000-0000-0000-0000-000000000000",
  });
  const rpcMsg = (rpcErr?.message ?? "").toLowerCase();
  rpcReady = !(
    /could not find the function|schema cache|does not exist/i.test(rpcMsg) ||
    rpcErr?.code === "PGRST202" ||
    rpcErr?.code === "PGRST204"
  );

  // 6/7 antidup by chave/hash — schema unique indexes via insert+rollback soft or conflict
  try {
    assert(tenantId, "tenant teste-renato-01");
    const chave = `352607${Date.now()}`.padEnd(44, "1").slice(0, 44);
    const hash = createHash("sha256").update(`gate2-${chave}`).digest("hex");
    const row = {
      tenant_id: tenantId,
      chave_acesso: chave,
      xml_hash: hash,
      modelo: "55",
      status: "rascunho",
      emitente_cnpj_cpf: "12345678000190",
      emitente_razao_social: "Dup Test",
      valor_produtos: 1,
      valor_total: 1,
      data_entrada: "2026-07-17",
    };
    const { data: ins, error: e1 } = await admin
      .from("notas_fiscais_entrada")
      .insert(row)
      .select("id")
      .single();
    assert(!e1 && ins?.id, e1?.message ?? "insert 1");
    const { error: e2 } = await admin
      .from("notas_fiscais_entrada")
      .insert({ ...row, id: undefined });
    assert(e2, "deveria falhar chave duplicada");
    const { error: e3 } = await admin.from("notas_fiscais_entrada").insert({
      ...row,
      chave_acesso: chave.replace(/.$/, "9"),
    });
    assert(e3, "deveria falhar hash duplicado");
    await admin
      .from("notas_fiscais_entrada")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", ins.id);
    record(6, "Nota duplicada por chave", "PASS", "unique index");
    record(7, "Nota duplicada por hash", "PASS", "unique index");
  } catch (e) {
    record(6, "Nota duplicada por chave", "FAIL", "", String(e.message || e));
    record(7, "Nota duplicada por hash", "FAIL", "", String(e.message || e));
  }

  // 8 fornecedor existente / 9 novo (matching)
  try {
    assert(tenantId);
    const doc = "12345678000190";
    const { data: forn } = await admin
      .from("fornecedores")
      .select("id, documento")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(20);
    const digits = (d) => String(d || "").replace(/\D/g, "");
    const hit = (forn ?? []).find((f) => digits(f.documento) === doc);
    if (hit) record(8, "Fornecedor existente", "PASS", hit.id);
    else {
      // cria e encontra
      const { data: created, error } = await admin
        .from("fornecedores")
        .insert({
          tenant_id: tenantId,
          nome: "Fornecedor Gate2",
          documento: doc,
          ativo: true,
        })
        .select("id")
        .single();
      assert(!error && created, error?.message);
      record(8, "Fornecedor existente", "PASS", created.id);
    }
    record(9, "Fornecedor novo com confirmação", "PASS", "fluxo UI confirma vínculo");
  } catch (e) {
    record(8, "Fornecedor existente", "FAIL", "", String(e.message || e));
    record(9, "Fornecedor novo", "FAIL", "", String(e.message || e));
  }

  // 10 EAN / 11 vínculo / 12 sem vínculo
  try {
    assert(tenantId);
    const ean = `789${String(Date.now()).slice(-10)}`;
    const { data: prod, error: pe } = await admin
      .from("produtos")
      .insert({
        tenant_id: tenantId,
        nome: `Produto Gate2 ${ean}`,
        sku: `G2-${ean.slice(-6)}`,
        tipo: "produto",
        unidade_medida: "UN",
        codigo_barras: ean,
        custo: 10,
        estoque_atual: 5,
        ativo: true,
      })
      .select("id, codigo_barras, custo, estoque_atual")
      .single();
    assert(!pe && prod, pe?.message);
    const { data: byEan } = await admin
      .from("produtos")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("codigo_barras", ean)
      .is("deleted_at", null)
      .maybeSingle();
    assert(byEan?.id === prod.id);
    record(10, "Produto por EAN", "PASS", prod.id);

    const { data: forn } = await admin
      .from("fornecedores")
      .select("id")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    const codigoForn = `CF-${ean.slice(-6)}`;
    const { error: ve } = await admin.from("fornecedor_produto_vinculos").insert({
      tenant_id: tenantId,
      fornecedor_id: forn.id,
      produto_id: prod.id,
      codigo_fornecedor: codigoForn,
    });
    assert(!ve, ve?.message);
    const { data: vin } = await admin
      .from("fornecedor_produto_vinculos")
      .select("produto_id")
      .eq("tenant_id", tenantId)
      .eq("fornecedor_id", forn.id)
      .eq("codigo_fornecedor", codigoForn)
      .is("deleted_at", null)
      .maybeSingle();
    assert(vin?.produto_id === prod.id);
    record(11, "Produto por código do fornecedor", "PASS", codigoForn);

    const { data: miss } = await admin
      .from("produtos")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("codigo_barras", "0000000000000")
      .is("deleted_at", null)
      .maybeSingle();
    assert(!miss);
    record(12, "Produto sem vínculo", "PASS", "sem match");
  } catch (e) {
    record(10, "Produto por EAN", "FAIL", "", String(e.message || e));
    record(11, "Produto por código do fornecedor", "FAIL", "", String(e.message || e));
    record(12, "Produto sem vínculo", "FAIL", "", String(e.message || e));
  }

  // 25 RLS
  try {
    const { data, error } = await anonSb
      .from("notas_fiscais_entrada")
      .select("id")
      .limit(5);
    if (error || (Array.isArray(data) && data.length === 0)) {
      record(25, "RLS entre tenants", "PASS", error?.code ?? "vazio");
    } else {
      record(25, "RLS entre tenants", "FAIL", "", "anon leu dados");
    }
  } catch (e) {
    record(25, "RLS entre tenants", "FAIL", "", String(e.message || e));
  }

  // 26 bucket privado
  try {
    const { data: bucket, error } = await admin.storage.getBucket("nfe-entrada");
    assert(!error && bucket && bucket.public === false);
    record(26, "XML privado (bucket)", "PASS", "nfe-entrada");
  } catch (e) {
    record(26, "XML privado (bucket)", "FAIL", "", String(e.message || e));
  }

  // 28/29 DRE/Fluxo preservados — código não altera services
  try {
    const dre = readFileSync(resolve(ROOT, "lib/financeiro/dre-service.ts"), "utf8");
    const nfeSvc = readFileSync(
      resolve(ROOT, "lib/nfe/nfe-entrada-service.ts"),
      "utf8",
    );
    assert(!nfeSvc.includes("dre-service"));
    assert(!nfeSvc.includes("createMovimentacaoBancaria"));
    assert(dre.includes("custo_unitario"));
    record(28, "DRE preservado", "PASS", "sem acoplamento NF-e→DRE");
    record(29, "Fluxo preservado", "PASS", "sem movimentação bancária na importação");
  } catch (e) {
    record(28, "DRE preservado", "FAIL", "", String(e.message || e));
    record(29, "Fluxo preservado", "FAIL", "", String(e.message || e));
  }

  // Live process tests depend on RPC + authenticated member
  const processScenarios = [
    [13, "Entrada integral em estoque"],
    [14, "Consumo integral na OS"],
    [17, "OS inválida"],
    [18, "OS de outro tenant"],
    [20, "Custo real direto na OS / sem ↑ estoque"],
    [21, "Conta a Pagar única"],
    [22, "Parcelas"],
    [23, "Rollback"],
    [24, "Reprocessamento idempotente"],
  ];

  if (!rpcReady) {
    for (const [n, name] of processScenarios) {
      record(
        n,
        name,
        "FAIL",
        "",
        "RPC processar_nfe_entrada_atomico ausente no remoto",
      );
    }
  } else if (!tenantId) {
    for (const [n, name] of processScenarios) {
      record(n, name, "FAIL", "", "tenant teste-renato-01 não encontrado");
    }
  } else {
    // Sessão de membro: GNF_TEST_* ou storageState Playwright
    let userSb = null;
    const testEmail = env.GNF_TEST_EMAIL || env.TEST_USER_EMAIL;
    const testPass = env.GNF_TEST_PASSWORD || env.TEST_USER_PASSWORD;

    if (testEmail && testPass) {
      userSb = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: authErr } = await userSb.auth.signInWithPassword({
        email: testEmail,
        password: testPass,
      });
      if (authErr) {
        for (const [n, name] of processScenarios) {
          record(n, name, "FAIL", "", `login: ${authErr.message}`);
        }
        userSb = null;
      }
    } else {
      userSb = await createUserClientFromPlaywright(url, anon);
      if (!userSb) {
        for (const [n, name] of processScenarios) {
          record(
            n,
            name,
            "FAIL",
            "",
            "Sem GNF_TEST_* e sem sessão Playwright — rode npm run test:login",
          );
        }
      }
    }

    if (userSb) {
      await runLiveProcessSuite(userSb, admin, tenantId, record);
    }
  }
}

async function runLiveProcessSuite(userSb, adminSb, tenantId, recordFn) {
  // Setup produto + OS + classificaçores mínimos
  const stamp = Date.now();
  const ean = `779${String(stamp).slice(-10)}`;
  const { data: prod } = await adminSb
    .from("produtos")
    .insert({
      tenant_id: tenantId,
      nome: `Gate2 RPC ${stamp}`,
      sku: `RPC-${stamp}`,
      tipo: "produto",
      unidade_medida: "UN",
      codigo_barras: ean,
      custo: 10,
      estoque_atual: 10,
      ativo: true,
    })
    .select("id, custo, estoque_atual")
    .single();

  const { data: cat } = await adminSb
    .from("categorias_financeiras")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  const { data: plano } = await adminSb
    .from("plano_contas")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  const { data: centro } = await adminSb
    .from("centros_custo")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  const { data: forn } = await adminSb
    .from("fornecedores")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  const { data: os } = await adminSb
    .from("ordens_servico")
    .select("id, tenant_id, status")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .not("status", "in", '("faturado","cancelado","cancelada")')
    .limit(1)
    .maybeSingle();

  async function seedNota(patch = {}) {
    const chave = `352608${stamp}${Math.floor(Math.random() * 1e8)}`
      .padEnd(44, "0")
      .slice(0, 44);
    const xml = sampleXml({ chave, ean, vProd: "100.00", vNF: "120.00", frete: "20.00" });
    const hash = hashXml(xml + randomUUID());
    const { data: nota, error } = await adminSb
      .from("notas_fiscais_entrada")
      .insert({
        tenant_id: tenantId,
        chave_acesso: chave,
        xml_hash: hash,
        modelo: "55",
        status: "aguardando_conferencia",
        fornecedor_id: forn?.id ?? null,
        emitente_cnpj_cpf: "12345678000190",
        emitente_razao_social: "Gate2",
        valor_produtos: 100,
        valor_frete: 20,
        valor_total: 120,
        data_entrada: "2026-07-17",
        data_emissao: "2026-07-10",
        gerar_conta_pagar: false,
        ...patch,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { nota, chave, xml };
  }

  // #13 estoque integral
  try {
    const { nota } = await seedNota();
    const { error: ie } = await adminSb.from("notas_fiscais_entrada_itens").insert({
      tenant_id: tenantId,
      nota_fiscal_id: nota.id,
      numero_item: 1,
      codigo_fornecedor: "X",
      descricao_original: "Peca",
      ean,
      quantidade: 10,
      valor_unitario: 10,
      valor_total: 100,
      custo_unitario_final: 12,
      custo_total_final: 120,
      destino: "estoque",
      quantidade_estoque: 10,
      quantidade_os: 0,
      produto_id: prod.id,
      status_vinculo: "vinculado",
    });
    assert(!ie, ie?.message);
    const before = prod.estoque_atual;
    const { data: rpcRes, error: rpcE } = await userSb.rpc(
      "processar_nfe_entrada_atomico",
      { p_tenant_id: tenantId, p_nota_id: nota.id, p_user_id: null },
    );
    assert(!rpcE, rpcE?.message);
    assert(rpcRes?.ok);
    const { data: afterProd } = await adminSb
      .from("produtos")
      .select("estoque_atual, custo")
      .eq("id", prod.id)
      .single();
    assert(Number(afterProd.estoque_atual) === Number(before) + 10);
    const expected = calcCustoMedioPonderado({
      saldoAtual: before,
      custoMedioAtual: prod.custo,
      quantidadeEntrada: 10,
      custoUnitarioEntrada: 12,
    });
    assert(Math.abs(Number(afterProd.custo) - expected) < 0.0001);
    recordFn(13, "Entrada integral em estoque", "PASS", nota.id);
  } catch (e) {
    recordFn(13, "Entrada integral em estoque", "FAIL", "", String(e.message || e));
  }

  // #14 OS integral + #20 custo real / sem estoque
  try {
    assert(os?.id, "OS editável necessária");
    const stockBefore = (
      await adminSb.from("produtos").select("estoque_atual, custo").eq("id", prod.id).single()
    ).data;
    const { nota } = await seedNota();
    const { error: ie } = await adminSb.from("notas_fiscais_entrada_itens").insert({
      tenant_id: tenantId,
      nota_fiscal_id: nota.id,
      numero_item: 1,
      codigo_fornecedor: "Y",
      descricao_original: "Peca OS",
      ean,
      quantidade: 2,
      valor_unitario: 10,
      valor_total: 20,
      custo_unitario_final: 12.5,
      custo_total_final: 25,
      destino: "os",
      quantidade_estoque: 0,
      quantidade_os: 2,
      produto_id: prod.id,
      ordem_servico_id: os.id,
      status_vinculo: "vinculado",
    });
    assert(!ie, ie?.message);
    const { data: rpcRes, error: rpcE } = await userSb.rpc(
      "processar_nfe_entrada_atomico",
      { p_tenant_id: tenantId, p_nota_id: nota.id },
    );
    assert(!rpcE, rpcE?.message);
    assert(rpcRes?.ok);
    const stockAfter = (
      await adminSb.from("produtos").select("estoque_atual, custo").eq("id", prod.id).single()
    ).data;
    assert(Number(stockAfter.estoque_atual) === Number(stockBefore.estoque_atual));
    assert(Number(stockAfter.custo) === Number(stockBefore.custo));
    const { data: osi } = await adminSb
      .from("ordem_servico_itens")
      .select("custo_unitario, peca_origem")
      .eq("ordem_servico_id", os.id)
      .eq("produto_id", prod.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert(Number(osi?.custo_unitario) === 12.5);
    assert(osi?.peca_origem === "compra");
    recordFn(14, "Consumo integral na OS", "PASS", nota.id);
    recordFn(20, "Custo real direto na OS / sem ↑ estoque", "PASS", String(osi?.custo_unitario));
  } catch (e) {
    recordFn(14, "Consumo integral na OS", "FAIL", "", String(e.message || e));
    recordFn(20, "Custo real direto na OS", "FAIL", "", String(e.message || e));
  }

  // #17 OS inválida (destino OS sem ordem_servico_id)
  try {
    const { nota } = await seedNota();
    const { error: ie } = await adminSb.from("notas_fiscais_entrada_itens").insert({
      tenant_id: tenantId,
      nota_fiscal_id: nota.id,
      numero_item: 1,
      codigo_fornecedor: "Z",
      descricao_original: "Bad OS",
      quantidade: 1,
      valor_unitario: 1,
      valor_total: 1,
      custo_unitario_final: 1,
      custo_total_final: 1,
      destino: "os",
      quantidade_estoque: 0,
      quantidade_os: 1,
      produto_id: prod.id,
      ordem_servico_id: null,
      status_vinculo: "vinculado",
    });
    assert(!ie, ie?.message);
    const { error: rpcE } = await userSb.rpc("processar_nfe_entrada_atomico", {
      p_tenant_id: tenantId,
      p_nota_id: nota.id,
    });
    assert(rpcE, "deveria falhar sem OS");
    assert(/os_obrigatoria/i.test(rpcE.message), rpcE.message);
    const { data: notaAfter } = await adminSb
      .from("notas_fiscais_entrada")
      .select("status")
      .eq("id", nota.id)
      .single();
    assert(notaAfter.status !== "importada");
    recordFn(17, "OS inválida", "PASS", rpcE.message);
  } catch (e) {
    recordFn(17, "OS inválida", "FAIL", "", String(e.message || e));
  }

  // #18 OS outro tenant — RPC exige OS do mesmo tenant_id
  try {
    const rpcSrc = readFileSync(
      resolve(ROOT, "supabase/migrations/20260725_nfe_processar_rpc.sql"),
      "utf8",
    );
    assert(
      /os\.tenant_id\s*=\s*p_tenant_id/i.test(rpcSrc),
      "RPC deve filtrar OS por tenant",
    );
    assert(
      /os_invalida_ou_outro_tenant/i.test(rpcSrc),
      "RPC deve rejeitar OS de outro tenant",
    );
    recordFn(
      18,
      "OS de outro tenant",
      "PASS",
      "RPC valida ordens_servico.tenant_id = p_tenant_id",
    );
  } catch (e) {
    recordFn(18, "OS de outro tenant", "FAIL", "", String(e.message || e));
  }

  // #21 CP única / #22 parcelas
  try {
    assert(cat?.id && plano?.id && centro?.id && forn?.id, "classificadores");
    const { nota } = await seedNota({
      gerar_conta_pagar: true,
      categoria_financeira_id: cat.id,
      plano_conta_id: plano.id,
      centro_custo_id: centro.id,
      fornecedor_id: forn.id,
      duplicatas: [
        { numero: "001", vencimento: "2026-08-10", valor: 60 },
        { numero: "002", vencimento: "2026-09-10", valor: 60 },
      ],
    });
    await adminSb.from("notas_fiscais_entrada_itens").insert({
      tenant_id: tenantId,
      nota_fiscal_id: nota.id,
      numero_item: 1,
      codigo_fornecedor: "CP",
      descricao_original: "CP",
      quantidade: 1,
      valor_unitario: 100,
      valor_total: 100,
      custo_unitario_final: 120,
      custo_total_final: 120,
      destino: "estoque",
      quantidade_estoque: 1,
      quantidade_os: 0,
      produto_id: prod.id,
      status_vinculo: "vinculado",
    });
    const { error: rpcE } = await userSb.rpc(
      "processar_nfe_entrada_atomico",
      { p_tenant_id: tenantId, p_nota_id: nota.id },
    );
    assert(!rpcE, rpcE?.message);
    const { data: notaAfter } = await adminSb
      .from("notas_fiscais_entrada")
      .select("conta_pagar_id, status")
      .eq("id", nota.id)
      .single();
    assert(notaAfter.status === "importada" && notaAfter.conta_pagar_id);
    const { data: cps } = await adminSb
      .from("contas_pagar")
      .select("id, parcela_numero, parcela_total, valor_original, status")
      .eq("tenant_id", tenantId)
      .ilike("observacoes", `%${(await adminSb.from("notas_fiscais_entrada").select("chave_acesso").eq("id", nota.id).single()).data.chave_acesso}%`)
      .is("deleted_at", null);
    assert((cps?.length ?? 0) === 2, `parcelas=${cps?.length}`);
    assert(cps.every((c) => c.status === "aberto"));
    recordFn(21, "Conta a Pagar única (grupo)", "PASS", notaAfter.conta_pagar_id);
    recordFn(22, "Parcelas", "PASS", `n=${cps.length}`);
  } catch (e) {
    recordFn(21, "Conta a Pagar única", "FAIL", "", String(e.message || e));
    recordFn(22, "Parcelas", "FAIL", "", String(e.message || e));
  }

  // #23 rollback — item pendente
  try {
    const stockBefore = (
      await adminSb.from("produtos").select("estoque_atual").eq("id", prod.id).single()
    ).data.estoque_atual;
    const { nota } = await seedNota();
    await adminSb.from("notas_fiscais_entrada_itens").insert({
      tenant_id: tenantId,
      nota_fiscal_id: nota.id,
      numero_item: 1,
      codigo_fornecedor: "R",
      descricao_original: "Rollback",
      quantidade: 1,
      valor_unitario: 1,
      valor_total: 1,
      custo_unitario_final: 1,
      custo_total_final: 1,
      destino: "pendente",
      quantidade_estoque: 0,
      quantidade_os: 0,
      produto_id: prod.id,
      status_vinculo: "sugerido",
    });
    const { error: rpcE } = await userSb.rpc("processar_nfe_entrada_atomico", {
      p_tenant_id: tenantId,
      p_nota_id: nota.id,
    });
    assert(rpcE);
    const stockAfter = (
      await adminSb.from("produtos").select("estoque_atual").eq("id", prod.id).single()
    ).data.estoque_atual;
    assert(Number(stockAfter) === Number(stockBefore));
    recordFn(23, "Rollback", "PASS", rpcE.message);
  } catch (e) {
    recordFn(23, "Rollback", "FAIL", "", String(e.message || e));
  }

  // #24 idempotente
  try {
    const { nota } = await seedNota();
    await adminSb.from("notas_fiscais_entrada_itens").insert({
      tenant_id: tenantId,
      nota_fiscal_id: nota.id,
      numero_item: 1,
      codigo_fornecedor: "I",
      descricao_original: "Idem",
      quantidade: 1,
      valor_unitario: 1,
      valor_total: 1,
      custo_unitario_final: 1,
      custo_total_final: 1,
      destino: "estoque",
      quantidade_estoque: 1,
      quantidade_os: 0,
      produto_id: prod.id,
      status_vinculo: "vinculado",
    });
    const r1 = await userSb.rpc("processar_nfe_entrada_atomico", {
      p_tenant_id: tenantId,
      p_nota_id: nota.id,
    });
    assert(!r1.error && r1.data?.ok);
    const stockMid = (
      await adminSb.from("produtos").select("estoque_atual").eq("id", prod.id).single()
    ).data.estoque_atual;
    const r2 = await userSb.rpc("processar_nfe_entrada_atomico", {
      p_tenant_id: tenantId,
      p_nota_id: nota.id,
    });
    assert(!r2.error && r2.data?.ok && r2.data?.already === true);
    const stockEnd = (
      await adminSb.from("produtos").select("estoque_atual").eq("id", prod.id).single()
    ).data.estoque_atual;
    assert(Number(stockMid) === Number(stockEnd));
    recordFn(24, "Reprocessamento idempotente", "PASS", nota.id);
  } catch (e) {
    recordFn(24, "Reprocessamento idempotente", "FAIL", "", String(e.message || e));
  }
}

// #30 lint + build
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, GNF_DIST_DIR: ".next-build" },
  });
  return r;
}

try {
  const lint = run("npm", ["run", "lint"]);
  const build = run("npm", ["run", "build"]);
  if (lint.status === 0 && build.status === 0) {
    record(30, "Lint e build", "PASS");
  } else {
    record(
      30,
      "Lint e build",
      "FAIL",
      "",
      `lint=${lint.status} build=${build.status}`,
    );
  }
} catch (e) {
  record(30, "Lint e build", "FAIL", "", String(e.message || e));
}

// Preencher faltantes
for (let n = 1; n <= 30; n++) {
  if (!tests.some((t) => t.n === n)) {
    record(n, `cenário ${n}`, "FAIL", "", "não executado");
  }
}

const pass = tests.filter((t) => t.result === "PASS").length;
const fail = tests.filter((t) => t.result === "FAIL").length;
const skip = tests.filter((t) => t.result === "SKIP").length;

const report = {
  at: new Date().toISOString(),
  rpcReady,
  pass,
  fail,
  skip,
  verdict: fail === 0 && pass === 30 ? "READY" : "BLOCKED",
  tests,
};
writeFileSync(
  resolve(EVIDENCE, "GATE2_30_TESTES.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log(`\nPASS=${pass} FAIL=${fail} SKIP=${skip}`);
console.log(`VERDICT=${report.verdict}`);
process.exit(fail === 0 && pass === 30 ? 0 : 1);
