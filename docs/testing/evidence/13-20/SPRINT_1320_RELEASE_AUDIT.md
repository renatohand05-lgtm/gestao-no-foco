# Sprint 13.20 — Auditoria final, estabilidade e Release Candidate

**Data:** 2026-07-18  
**Tenant:** `teste-renato-01`  
**Branch atual:** `main` (trabalho **não commitado**; sem push/PR/tag nesta sprint)  
**Escopo:** auditoria + correção só de falhas comprovadas nos harnesses de teste. Sem novos módulos. Sem Sprint 13.21.

## Comandos técnicos

| Comando | Resultado |
|---------|-----------|
| `npm run audit:schema -- --live` | PASS |
| `npm run lint` | PASS (4 warnings em script de teste) |
| `npm run build` (`GNF_DIST_DIR=.next-build`) | PASS |
| `npm run test:inspecao-gate2` | READY |
| `npm run test:walkthrough` | PASS |
| `node scripts/os-status-smoke.mjs` | PASS |
| `node scripts/sprint-1320-integrity-audit.mjs` | APROVADO=16 BLOQUEADOR=0 |
| `node scripts/sprint-1320-verify-os.mjs <osId>` | VERIFY_OK (venda #5, 1 CR, 1 baixa estoque) |
| Bundle prod (`.next-build` sem `/dev`) | NO_SECRET_IN_PROD_BUNDLE |

Evidências: `docs/testing/evidence/13-20/`

---

## Correções aplicadas (harness / auditoria)

| Antes | Depois |
|-------|--------|
| Walkthrough checklist usava `selectOption("ok")` | Botões Bom/Atenção (UI 13.19.3) |
| Walkthrough tentava 2ª aprovação parcial com botão disabled | Alinhado ao produto: parcial marca demais como reprovados |
| `dialog.accept` duplicado | Handler global de dialog |
| Integridade estoque agrupava só por `origem=venda` | Correlaciona por `observacoes`/`motivo` (ref. da venda) |
| OS smoke checklist não avançava status | Classifica + botão “Aguardando diagnóstico” |
| Verify CR usava coluna `valor` inexistente | `valor_original` → VERIFY_OK |

Nenhuma regra financeira de produção foi alterada.

---

## Tabela por módulo

### APROVADO

| Módulo | Cenário | Resultado | Evidência | Erro | Correção | Reteste |
|--------|---------|-----------|-----------|------|----------|---------|
| Login e sessão | Sessão Playwright reutilizada | APROVADO | walkthrough auth OK | — | — | walkthrough PASS |
| Multiempresa | Tenant `teste-renato-01` | APROVADO | integrity + walkthrough | — | — | OK |
| Clientes | Criar cliente | APROVADO | Cliente WT 1320 317911 | — | — | walkthrough |
| Ordens de Serviço | Criar veículo + OS | APROVADO | OS `13bb9131-…` / #15 | — | — | walkthrough |
| Inspeção / Checklist | Classificar checklist | APROVADO | 06-checklist | harness antigo | botões Bom | PASS |
| Diagnóstico | Salvar diagnóstico | APROVADO | walkthrough | — | — | PASS |
| Orçamento | Peça + serviço | APROVADO | walkthrough | — | — | PASS |
| Aprovação | Parcial + item não aprovado bloqueado | APROVADO | 1 item em execução | harness | alinhamento produto | PASS |
| Execução | Concluir itens aprovados | APROVADO | 1 item | — | — | PASS |
| Entrega | Previsão + entrega | APROVADO | walkthrough | — | — | PASS |
| Vendas / Faturamento | Faturar + link venda | APROVADO | `/vendas/c4713981-…` | — | — | VERIFY_OK |
| Contas a Receber | 1 CR por venda faturada | APROVADO | CR aberto; integrity 3 vendas | verify coluna | fix script | VERIFY_OK |
| Estoque | Baixa única no faturamento | APROVADO | 1 saída; dups=0 | falso positivo audit | chave venda+produto | PASS |
| Segundo faturamento | UI bloqueada | APROVADO | bloqueio-segundo-fatura-ui | — | — | PASS |
| Histórico / Retorno | Garantia registrada | APROVADO | status OS→garantia | — | — | PASS |
| DRE | Página + competência (código) | APROVADO | 15-dre + dre-service | — | — | PASS |
| Fluxo de Caixa | Página + caixa (código) | APROVADO | 16-fluxo + estornos linkados | — | — | PASS |
| Dashboard | Carrega | APROVADO | 17-dashboard | — | — | PASS |
| Responsividade | Ordens mobile 390px | APROVADO | 18-ordens-mobile | — | — | PASS |
| Segurança | Service role só server; sem NEXT_PUBLIC secreto | APROVADO | admin.ts server-only; bundle limpo | — | — | PASS |
| RLS | Anon sem sessão não lê outro tenant | APROVADO | 0 rows | — | — | PASS |
| Contas a Pagar | Conta paga exige estorno (código) | APROVADO | conta-pagar-service guard | — | — | code |
| Máquina OS | Transições smoke | APROVADO | os-status-machine-smoke.json | checklist smoke | harness | PASS |
| Inspeção Digital Gate 2 | Preflight | APROVADO | READY | — | — | PASS |
| Schema | audit:schema --live | APROVADO | exit 0 | — | — | PASS |
| Build / Lint | build + lint | APROVADO | exit 0 | — | — | PASS |
| Orçamento/aprovação ≠ receita | Sem CR de orçamento | APROVADO | integrity | — | — | PASS |

### CORRIGIDO

| Módulo | Cenário | Resultado | Evidência | Erro | Correção | Reteste |
|--------|---------|-----------|-----------|------|----------|---------|
| Testes / Walkthrough | Checklist + dialog + aprovação | CORRIGIDO | scripts/oficina-walkthrough-ui.mjs | timeout / dialog | harness | EXIT_WT=0 |
| Testes / Smoke OS | Checklist status | CORRIGIDO | os-status-smoke.mjs | 1-checklist fail | harness | EXIT_SMOKE=0 |
| Auditoria estoque | Dup falsa | CORRIGIDO | integrity audit | agrupamento origem | chave obs+produto | BLOQUEADOR=0 |

### BLOQUEADOR

| Módulo | Cenário | Resultado | Evidência | Erro | Correção | Reteste |
|--------|---------|-----------|-----------|------|----------|---------|
| Release / Git | Branch pronta para merge limpo | BLOQUEADOR | `git status` em `main` com dezenas de M/?? | Trabalho RC ainda não commitado em branch de release | Aguardando CTO: branch + commit + PR | — |

Nenhum bloqueador funcional de motor financeiro/OS/RLS encontrado nos testes live.

### MELHORIA FUTURA

| Módulo | Cenário | Resultado | Evidência | Erro | Correção | Reteste |
|--------|---------|-----------|-----------|------|----------|---------|
| UI | Hydration mismatch no search input | MELHORIA FUTURA | console walkthrough | SSR id/style caret | não corrigido (fora de escopo crítico) | — |
| Walkthrough | Validação DB via cookie auth | MELHORIA FUTURA | db-validacao SKIP | parse cookie base64 | verify via service role | VERIFY_OK |
| Financeiro | Estorno live na UI do walkthrough | MELHORIA FUTURA | só código + integrity estornos=3 | não exercitado no fluxo 18 passos | opcional pós-RC | — |
| OS | Aprovação parcial → reaprovar restantes na mesma janela | MELHORIA FUTURA | produto marca não selecionados como reprovados | expectativa antiga do walkthrough | documentar UX / fluxo via aguardando_orcamento | — |

---

## Decisão de release

| Pergunta | Resposta |
|----------|----------|
| Branch pronta para merge? | **Não.** O trabalho está em `main` local **sem commit**. Não há merge limpo até o CTO organizar branch de release e histórico. |
| Pode abrir Pull Request? | **Não agora.** Aguardar aprovação formal do CTO + commit em branch dedicada (ex. `release/v1.0.0-rc1`). |
| Pode criar tag `v1.0.0-rc1`? | **Não agora.** Tag só após commit estável aprovado pelo CTO. |
| Pendências que impedem produção | 1) Higiene Git (commit/PR/review); 2) Aprovação formal CTO; 3) Hydration warning (não bloqueia motor, mas polui console); 4) Estorno UI não re-exercitado no walkthrough 13.20 (cobertura por código + integrity). |

### Confirmações de integridade (live)

- ✓ OS faturada com venda vinculada (OS #15 → venda #5)  
- ✓ Venda faturada → 1 Conta a Receber  
- ✓ Baixa de estoque única  
- ✓ Segundo faturamento bloqueado na UI  
- ✓ Orçamento/aprovação não geram receita  
- ✓ DRE por competência / Fluxo por caixa (código + páginas)  
- ✓ Estornos bancários com vínculo à movimentação original  
- ✓ RLS anon sem vazamento cross-tenant  
- ✓ Service role ausente do bundle de produção  

**Sprint 13.21 não iniciada.** Aguardando aprovação formal do CTO.
