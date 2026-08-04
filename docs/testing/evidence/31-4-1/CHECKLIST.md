# Sprint 31.4.1 — CHECKLIST · Hardening CRM Mobile

## Regras

- [x] Sem novas features
- [x] Sem alteração de regras de negócio / APIs / banco / web
- [x] Sem migrations / telas novas
- [x] Sem commit / push / deploy / EAS

## 1. Lint zero

- [x] `npm run mobile:lint` — 0
- [x] `npm run mobile:typecheck` — 0
- [x] `npm run mobile:test` — 2 PASS

## 2. Offline

- [x] Snapshot CRM home (`save` / `load`)
- [x] Cache React Query (`staleTime` 60s)
- [x] Restore offline no home
- [x] Pull-to-refresh só online (home)
- [x] Loading (`CrmSkeleton`)
- [x] Retry (“Tentar novamente”)
- [x] Listas/detalhe online-only com mensagem

## 3. Performance

- [x] FlatList tuning (clients + timeline)
- [x] `useDeferredValue` na busca de clientes
- [x] Remoção de nav redundante na home
- [ ] Cold &lt; 1500 ms (device — **não medido**)
- [ ] Warm &lt; 900 ms (device — **não medido**)

## 4. UI polish

- [x] Padding/gap alinhados ao Finance
- [x] Safe area edges
- [x] Dark mode via theme existente
- [x] Skeletons / empty / loading / mensagens / botões

## 5. Segurança

- [x] RBAC estático (`test:phase31-crm-rbac`)
- [x] Mensagens 401/403 na UI
- [x] Guards de rota mobile inalterados (sem regressão nos testes)

## 6. QA

- [x] `test:phase31-crm-mobile`
- [x] `test:phase31-clients-mobile`
- [x] `test:phase31-pipeline-mobile`
- [x] `test:phase31-timeline-mobile`
- [x] `test:phase31-followup-mobile`
- [x] `test:phase31-forecast-mobile`
- [x] `test:homolog-31-4` — 9 PASS
- [x] Expo Doctor — 20/20
- [x] typecheck / lint

## 7. Documentação

- [x] `docs/testing/evidence/31-4-1/REPORT.md`
- [x] `docs/testing/evidence/31-4-1/CHECKLIST.md`

## Pendências conscientes

- [ ] Device QA Android/iOS
- [ ] Medição Cold/Warm em device
- [ ] Commit quando o usuário autorizar
