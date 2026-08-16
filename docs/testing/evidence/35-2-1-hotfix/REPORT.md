# Hotfix 35.2.1 — Sugestões oficiais de serviço no cadastro rápido e na Agenda

**Data:** 2026-08-16  
**Branch:** `main`  
**Tipo:** Integração da biblioteca `lib/segments/catalogs/` nos demais pontos de entrada. Sem billing, sem WhatsApp real, sem cron de production, sem Sprint 35.3, sem reescrever a biblioteca 35.1, sem alterar a arquitetura de retornos da 35.2.

```
HOTFIX 35.2.1 — SERVICE SUGGESTIONS IN QUICK CREATE + AGENDA

STATUS: GO (código) · homologação visual PENDING (Renato)
P0: 0
P1: 0
P2: 1 (homologação visual Chrome/mobile nos 6 segmentos)

SERVICE SUGGESTIONS NEW SERVICE: PASS
BROWSER AUTOCOMPLETE ISOLATION: PASS (código; confirmar no Chrome)
SEGMENT ISOLATION: PASS
CUSTOM SERVICE: PASS
DEDUPLICATION: PASS
AGENDA EXISTING SERVICES: PASS
AGENDA EMPTY CATALOG UX: PASS
AGENDA ADOPT SUGGESTION: PASS
AGENDA QUICK CREATE: PASS
AGENDA CONTEXT PRESERVATION: PASS
RBAC: PASS
TENANT ISOLATION: PASS
MOBILE: PASS (mesmo formulário; min-h-11; combobox por teclado)
REGRESSION: PASS
LINT: PASS
TYPECHECK: PASS
BUILD: PASS

WHATSAPP REAL: DISABLED
EMAIL: DRY_RUN
CRON PRODUCTION: DISABLED
BILLING: UNTOUCHED
SPRINT 35.3: NÃO INICIADA

TESTES HOTFIX: 25/25 (phase35-2-1-service-suggestions)
REGRESSÃO 35.2.1: 20/20
REGRESSÃO 35.2: 19/19
REGRESSÃO 35.1: 48/48
RBAC: 92 PASS
LINT: 0 errors / 35 warnings (pré-existentes)
TYPECHECK: PASS
BUILD: PASS · /[tenant]/produtos/novo · /[tenant]/agenda

MIGRATION: NENHUMA
COMMIT: (preenchido após o push)
HEAD == ORIGIN/MAIN: (após push)
```

## Causa raiz

A biblioteca por segmento já existia e era usada em `/produtos/catalogo-inicial`. O cadastro rápido `/produtos/novo?tipo=servico` usava um `<Input>` nativo no campo Nome, **sem** `getLibraryForContext` / combobox da aplicação. O Chrome preenchia o histórico do navegador (ex.: “câmbio”, “Caixa de Direção Hidráulica”) em tenant BARBEARIA.

Na Agenda, o `<select>` listava só serviços reais do tenant (correto), mas o catálogo vazio era um select em branco, sem adotar sugestão ou criar serviço sem sair do agendamento. IDs da biblioteca nunca devem ir para `servico_id` (UUID).

## Resultado por segmento

Nomes oficiais vêm da biblioteca 35.1 — **não** foi criado “Corte masculino”. Em barbearia o homologador deve procurar **Corte tradicional**, **Corte infantil**, **Barba tradicional**, **Corte + barba**.

| Segmento | Sugestões | Isolamento |
|---|---|---|
| BARBEARIA | Corte tradicional, infantil, barba, combos, hidratação… | sem óleo/alinhamento/câmbio/caixa de direção |
| LAVA-RÁPIDO | Lavagem externa/técnica, higienização… | sem corte/barba/óleo/diagnóstico mecânico |
| CONSULTORIA | Consultoria inicial/estratégica, diagnóstico empresarial… | sem corte/barba/lavagem/óleo |
| ESTÉTICA | Limpeza de pele, peeling, drenagem… | catálogo próprio |
| ODONTOLOGIA | Consulta inicial, profilaxia, restauração… | catálogo próprio; sem prontuário |
| OFICINA | catálogo completo (óleo, alinhamento, câmbio…) | preservado |
| Legado (`segment_version` NULL) | biblioteca da oficina | engine atual |

Tenant A (oficina) não alimenta sugestões nem o select da Agenda do tenant B (barbearia). Actions validam IDs no servidor via `planLibraryAdoption` + `createProdutoService(tenant.id)`.

## Arquivos principais

- `lib/segments/catalogs/suggest.ts` — busca/ranking/DTO; única fonte = catalogs 35.1
- `lib/ux/browser-autocomplete.ts` — `autoComplete=off` + nome operacional
- `components/produtos/service-catalog-suggest.tsx` — combobox da aplicação
- `components/agenda/agenda-service-field.tsx` — select do tenant + adotar + criar
- `lib/segments/library-actions.ts` — `adoptOneLibraryItemAction` / `createCustomServiceForAgendaAction` (`produtos.criar`)
- `app/(app)/[tenant]/produtos/novo/page.tsx`
- `app/(app)/[tenant]/agenda/page.tsx`
- `components/produtos/produto-form.tsx`
- `components/agenda/agenda-event-create-form.tsx`
- `components/mecanicos/professional-specialty-field.tsx` (sem `<datalist>`)
- `scripts/phase35-2-1-service-suggestions-tests.mjs`

Preço do template continua `null`. “Defina o preço cobrado pela sua empresa.” Duplicatas equivalentes aparecem como “Já cadastrado” no cadastro rápido e são omitidas no picker da Agenda. Sem `if (segment === …)` nas páginas.

## Homologação visual (Renato)

1. BARBEARIA → Produtos & Serviços → Novo serviço → clicar em **Nome**. Esperado: sugestões da barbearia (Corte tradicional…). Proibido: histórico automotivo do Chrome como se fosse do Gestoo.
2. BARBEARIA → Agenda → Novo agendamento. Esperado: serviços reais cadastrados no tenant.
3. Tenant sem serviços → Agenda → Serviço → Escolher das sugestões → Corte tradicional → preço/duração mínimos → Adicionar e usar. Esperado: volta ao agendamento com o serviço selecionado; cliente/data/hora/profissional preservados.
4. Smoke: Oficina, Lava-rápido, Consultoria, Estética, Odontologia.

**NÃO iniciar Sprint 35.3. Não ativar WhatsApp real. Não ativar cron production. Não alterar billing.**
