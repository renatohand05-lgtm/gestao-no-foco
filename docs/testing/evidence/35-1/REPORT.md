# Sprint 35.1 — Presets por segmento + override por tenant

**Data:** 2026-08-16  
**Commit código:** (preenchido após o commit deste closeout)  
**Branch:** `main`  
**Tipo:** Hardening de apresentação — sem billing / Asaas / 35.2 / auto-migration prod

## Status

**SPRINT 35.1 FINAL CLOSEOUT: GO (código)** · homologação visual **PENDING (Renato)** · **P0: 0** · **P1: 0** · **P2 documentado fora da jornada principal** · migration **NENHUMA**

## Auditoria global de copy (closeout)

Executada busca por OS / Ordens de Serviço / Mecânico / diagnóstico / peças / placa / quilometragem / workspace da OS.

Classificação:
- **Interno (mantido):** `osAbertas`, `work_orders`, tabelas `ordens_servico`/`mecanicos`, rotas `/ordens`, permissão `os.criar`, adapter.id `service-orders`.
- **Oficina/legado (mantido):** copy hoje da OS/Mecânicos/diagnóstico/peças quando engine off ou segmento oficina.
- **Capability (gated):** import `/integracoes/importar/ordens` → `notFound()` se `work_orders` OFF; hub de importação esconde o card.
- **Adapter:** `getSegmentUiCopy` / `segmentCopyForClient` / `listSegmentModuleRows` overlay.
- **Vazamentos reais desta passagem (corrigidos):**
  1. Skeleton/lazy-load `"Carregando workspace da OS"` — agora `uiCopy.workspaceLoadingAria` (lava: `"Carregando atendimento"`).
  2. Hub e wizard de importação de OS visíveis em tenants com Integrações (consultoria) — card some com work_orders OFF; copy do wizard via adapter.
  3. Hub de conectores `"Ordens de Serviço"` — filtrado/renomeado.
  4. Matriz Configurações → Personalizar experiência: labels `"Mecânicos"` / descrição `"Reusa Equipe/mecânicos"` — overlay pelo adapter.
  5. Km/combustível/picker de veículo no workspace quando `showVehicles === false`.

Onboarding 30.x: o tour antigo (`OnboardingTour` com “Ordens de Serviço”) **não é renderizado** em `primeiro-acesso`. O wizard enterprise usa `getSegmentSetup` já fatiado por segmento (lava/barbearia/consultoria corretos). Não reescrito.

P2 residual (não jornada principal / não copy de UI operacional):
- Copiloto enterprise `generateInsightsFromSnapshot` ainda gera título interno “Ordens de serviço em aberto”.
- Catálogo analítico `METRIC_CATALOG` / `metric-registry` name `"OS abertas"` (id técnico `os.abertas`).
- Comentários e IDs do import-engine.
- Public inspeção/token se usado fora do tenant (legado oficina).

## Copy hardening final (2026-08-16)

Vazamento confirmado na homologação: lava-rápido em Atendimentos ainda mostrava **"OS abertas"** e **"Valor estimado das OS em andamento."** A auditoria varreu os 6 segmentos do motor 35.x. Correções passaram pelo adapter `lib/segments/copy.ts` (sem forks de página e sem `if (segment === …)` na UI).

Oficina (engine off ou segmento `oficina`) permanece OS / Mecânicos / diagnóstico / peças.

## Decisão

Reuso de `tenants.segment_config` (35.0). Sem migration nova. Override = esconder relevância, não apagar dados. RBAC permanece soberano.

Adapter de apresentação em `lib/segments/copy.ts`:
- oficina (ou engine off) → Mecânicos / OS em `/oficina/mecanicos`
- barbearia e demais com motor ligado → Barbeiros/Profissionais em `/profissionais`
- lava-rápido → mesma tabela `ordens_servico` com copy **Atendimentos** e `work_orders` ON por padrão (checklist acessível)

Backend `mecanicos` / `ordens_servico` **não foi duplicado**.

Gaps grandes (prontuário, odontograma, folha, fidelidade, projetos) **não** foram implementados.

## Gates (código)

| Gate | Resultado |
|---|---|
| `test:phase35-1-segment-presets` | **31/31 PASS** (`ℹ tests 31` · `ℹ pass 31` · `ℹ fail 0`) |
| `test:phase35-0-segment-architecture` | **13 PASS · 0 FAIL** |
| `test:phase34-9-contas-pagar-beneficiarios` | 25 PASS · 0 FAIL |
| `test:phase34-2-p0-tenant-rls` | 12 PASS · 0 FAIL |
| `test:phase34-3-p1-mutation-auth` | 9 PASS · 0 FAIL |
| `test:phase34-4-access-journey` | 14 PASS · 0 FAIL |
| `test:phase34-5-pilot-ux` | 13 PASS · 0 FAIL |
| `test:phase34-6-ops-readiness` | 7 PASS · 0 FAIL |
| `test:phase34-7-reports-integrity` | 12 PASS · 0 FAIL |
| `test:phase34-8-release-candidate` | 8 PASS · 0 FAIL |
| `test:rbac` | 92 PASS · 0 FAIL |
| `test:phase30-multisector-nav` | 14 PASS · 0 FAIL |
| `test:phase30-segment-config` | 36 PASS · 0 FAIL |
| `lint` | PASS (35 warnings pré-existentes) |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (`/[tenant]/profissionais` e `/[tenant]/oficina/mecanicos` registrados) |
| `git diff --check` | PASS |

## Matriz segmento × módulo × capability

| SEGMENTO | MÓDULO | CAPABILITY | DEFAULT | OVERRIDABLE | STATUS REAL |
|---|---|---|---|---|---|
| oficina | Clientes | customers | ON | sim | READY |
| oficina | Veículos | vehicles | ON | sim | READY |
| oficina | Mecânicos | workshop_mechanics | ON | sim | READY |
| oficina | Ordens de Serviço | work_orders | ON | sim | READY |
| oficina | Checklist | service_checklist | ON | sim | READY (vive na OS) |
| oficina | Serviços/Produtos | catalog | ON | sim | READY |
| oficina | Estoque | inventory | ON | sim | READY |
| oficina | Compras | purchases | ON | sim | READY |
| oficina | Vendas | sales | ON | sim | READY |
| oficina | Agenda | appointments | ON | sim | READY |
| oficina | Comissões | commissions | ON | sim | PARTIAL (sem folha) |
| oficina | CRM | crm | ON | sim | READY |
| oficina | Financeiro | financial_management | ON | sim | READY |
| oficina | Tributário | tax | ON | sim | READY |
| consultoria | Clientes | customers | ON | sim | READY |
| consultoria | Serviços | catalog | ON | sim | READY |
| consultoria | CRM | crm | ON | sim | READY |
| consultoria | Vendas | sales | ON | sim | READY |
| consultoria | Agenda | appointments | ON | sim | READY |
| consultoria | Financeiro | financial_management | ON | sim | READY |
| consultoria | Mecânicos / OS / Estoque / Compras | workshop_mechanics / work_orders / inventory / purchases | OFF | sim | READY (ocultos) |
| consultoria | Projetos | projects | OFF | não (future) | MISSING |
| barbearia | Agenda / Clientes / Serviços | appointments / customers / catalog | ON | sim | READY |
| barbearia | Barbeiros | professionals | ON | sim | REUSABLE (`/profissionais`, cadastro `mecanicos`) |
| barbearia | Produtos / Estoque / Vendas | catalog / inventory / sales | ON | sim | READY |
| barbearia | Comissões | commissions | ON | sim | PARTIAL |
| barbearia | Fidelidade | recurring_services | ON (flag) | sim | MISSING (sem produto de fidelidade) |
| barbearia | OS automotiva | work_orders | OFF | sim | READY (oculta) |
| lava_rapido | Veículos | vehicles | ON | sim | READY (reusa oficina) |
| lava_rapido | Agenda / Profissionais | appointments / professionals | ON | sim | READY / REUSABLE (`/profissionais`) |
| lava_rapido | Checklist | service_checklist | ON | sim | READY (vive no Atendimento = OS) |
| lava_rapido | Atendimentos | work_orders | ON | sim | READY (mesma OS, copy Atendimentos) |
| lava_rapido | Pacotes | packages | ON (flag) | sim | PARTIAL |
| clinica_estetica | Agenda / Procedimentos | appointments / catalog | ON | sim | READY |
| clinica_estetica | Pacotes | packages | ON (flag) | sim | PARTIAL |
| clinica_estetica | Prontuário | patient_records | OFF | não (future) | MISSING |
| consultorio_odontologico | Pacientes | customers | ON | sim | READY (label) |
| consultorio_odontologico | Agenda / Procedimentos / CR | appointments / catalog / accounts_receivable | ON | sim | READY |
| consultorio_odontologico | Prontuário / plano / odontograma | patient_records / treatment_plans | OFF | não (future) | MISSING |

## Gaps por segmento

**OFICINA**  
- READY: OS, Mecânicos, Veículos, Estoque, Compras, Vendas, Agenda, CRM, Financeiro, Tributário  
- PARTIAL: Comissões (sem folha)

**CONSULTORIA**  
- READY: Clientes, Serviços, Vendas, Agenda, CRM, Financeiro, Analytics  
- MISSING: Projetos (não inventar) — **P2**

**BARBEARIA**  
- READY: Agenda, Clientes, Serviços, Produtos, Estoque, Vendas, Financeiro, CRM  
- REUSABLE: Barbeiros (cadastro `mecanicos` + UI `/profissionais`; sem vazamento Mecânico/oficina na copy do motor)  
- PARTIAL: Comissões  
- MISSING: Fidelidade completa — **P2**

**LAVA-RÁPIDO**  
- READY: Clientes, Veículos, Agenda, Atendimentos (OS reusada), Checklist, Estoque, Vendas, Financeiro, CRM  
- REUSABLE: Profissionais (`/profissionais`)  
- PARTIAL: Pacotes  
- Dívida: backend ainda é `ordens_servico` / `mecanicos` — só a UI diz Atendimento/Profissional

**ESTÉTICA**  
- READY: Agenda, Clientes, Procedimentos (label), Estoque, Vendas, Financeiro, CRM  
- PARTIAL: Pacotes / recorrência — **P2**  
- MISSING: Prontuário (OFF de propósito)

**ODONTOLOGIA**  
- READY: Pacientes (label), Agenda, Procedimentos, Financeiro, Contas a receber, CRM  
- MISSING: Prontuário, odontograma, plano clínico (OFF de propósito) — **P2**

## Hardening (esta entrega)

1. Barbearia não usa vocabulário de oficina: Barbeiros, Especialidade = Geral, rota `/profissionais`.
2. Lava-rápido: `work_orders` ON; Central = Atendimentos; CTA = Novo atendimento; checklist na mesma OS.
3. Testes nomeados 19/19 (não mais “8/0” ambíguo).
4. Mobile: labels de assignee/OS vêm do adapter; dashboard filtra `nova-os` / veículo / estoque.

## Smoke (Renato) — copy hardening — validar visualmente

Já homologado: oficina UX automotiva, consultoria sem módulos automotivos, barbearia Barbeiros, lava Pacotes/Atendimentos/Profissionais, agenda.

Validar agora (fechamento):
1. Lava-rápido → Atendimentos: KPIs **Atendimentos abertos** e **Valor estimado dos atendimentos em andamento**
2. Lava-rápido → abrir atendimento: loading **Carregando atendimento**, aba **Análise**, sem toast “OS”
3. Oficina: **OS abertas**, Mecânicos, diagnóstico, peças, skeleton “workspace da OS”
4. Barbearia: menu **Barbeiros**; Personalizar experiência sem linha “Mecânicos”
5. Consultoria: Relatórios sem OS; Importar Arquivos **sem** card de ordens; 404 em `/integracoes/importar/ordens`
6. Tenant legado: copy automotiva intacta
7. Override: ligar/desligar não troca vocabulário do segmento

## Não feito (conforme escopo)

Prontuário clínico, odontograma, folha de pagamento, fidelidade completa, projetos complexos, ERPs paralelos, checkout/billing, Asaas, Sentry, PITR, Sprint 35.2.
