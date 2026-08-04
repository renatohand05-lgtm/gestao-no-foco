# Sprint 31.4.1 — REPORT · Hardening CRM Mobile

## Classificação

**APROVADA COM RESSALVAS** (mesmas ressalvas de device da 31.4)

Hardening sem novas features/APIs/banco/web. CRM Mobile alinhado ao padrão visual/comportamental do Financeiro Mobile.

## O que foi feito

### Lint zero
- `mobile:lint` 0 erros / 0 warnings
- `mobile:typecheck` 0
- `mobile:test` 2 PASS

### Offline
- Snapshot `@gof/cache/crm-summary/{tenantId}` no home (restore + save após fetch)
- Pull-to-refresh **somente online** (home)
- Listas/detalhe/pipeline/followups/forecast: gate offline + mensagem consistente
- Loading: `CrmSkeleton`; retry: botão “Tentar novamente”
- Banner “dados parciais” quando `unavailable[]` preenchido

### Performance (mitigações; device não medido)
- FlatList: `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews`, `keyExtractor` estável
- Busca clientes: `useDeferredValue` (menos refetch por tecla)
- `staleTime: 60_000` mantido
- Home sem nav row redundante (quick actions + “Abrir CRM web”)

Metas aspiracionais: Cold &lt; 1500 ms · Warm &lt; 900 ms — **não medidas em device nesta sessão**.

### UI polish
- `SafeAreaScreen edges={["left","right"]}`
- Padding/gap alinhados ao Finance (`contentContainerStyle` padding 16)
- Empty states e copy 401/403 amigáveis (`crmErrorMessage` / `throwCrmApiError`)
- Skeletons em todas as telas CRM online

### Segurança (validação estática)
- RBAC: `test:phase31-crm-rbac` 12 PASS
- Guards/membership nas rotas mobile CRM (inalteradas)
- Erros 401/403 mapeados na UI mobile
- Sem mudança de APIs, regras de negócio ou banco

## Gates (sessão 31.4.1)

| Gate | Resultado |
|------|-----------|
| mobile:lint | 0 |
| mobile:typecheck | 0 |
| mobile:test | 2 PASS |
| test:phase31-crm-mobile | 13 PASS |
| test:phase31-clients-mobile | 8 PASS |
| test:phase31-pipeline-mobile | 7 PASS |
| test:phase31-timeline-mobile | 5 PASS |
| test:phase31-followup-mobile | 6 PASS |
| test:phase31-forecast-mobile | 5 PASS |
| test:phase31-crm-rbac | 12 PASS |
| test:phase31-crm-offline | 7 PASS |
| test:homolog-31-4 | **9 PASS · 0 FAIL** |
| Expo Doctor | **20/20** |

## Browser QA

**N/A** para CRM Mobile (Expo). Smoke web do CRM **não** alterado nesta sprint (regra: NÃO alterar web).

## Device QA

Android/iOS **não executado** — não homologar store nesta sessão.

## Sem commit / push / deploy / EAS
