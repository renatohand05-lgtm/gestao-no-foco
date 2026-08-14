# Release Checklist — Gestão no Foco

**Sprint 34.8.** Marcar antes de liberar cliente beta / RC.

## Git

- [ ] Working tree limpa (exceto logs locais descartáveis)
- [ ] `HEAD == origin/main`
- [ ] SHA do release anotado: _______________

## Qualidade

- [ ] `npm run test:phase34-2-p0-tenant-rls`
- [ ] `npm run test:phase34-3-p1-mutation-auth`
- [ ] `npm run test:phase34-4-access-journey`
- [ ] `npm run test:phase34-5-pilot-ux`
- [ ] `npm run test:phase34-6-ops-readiness`
- [ ] `npm run test:phase34-7-reports-integrity`
- [ ] `npm run test:phase34-8-release-candidate` (se existir)
- [ ] `npm run test:rbac`
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] `git diff --check` (sem erros de conflito)

## Production deployment

- [ ] Vercel deployment Ready
- [ ] Domínio `https://gestao-no-foco.vercel.app`
- [ ] Envs presentes (nomes apenas; sem colar secrets):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `APP_URL` / `NEXT_PUBLIC_APP_URL`
- [ ] Auth Redirect URLs Supabase apontam para production (não localhost)
- [ ] Storage CRM bucket privado + policies 34.3

## Produto / segurança

- [ ] Tenant isolation / RBAC / inactive (regressões 34.2–34.3)
- [ ] Password recover `/recuperar` + `/nova-senha`
- [ ] Convite equipe (copy-link honesto)
- [ ] Empresa nova sem demo/mock
- [ ] Dashboard / aging / estoque / relatórios (34.7)
- [ ] Mobile web smoke
- [ ] Assinatura: piloto sem checkout sandbox confuso

## Operações

- [ ] `GET /api/health`
- [ ] `GET /api/status` → `billing.frozen: true`
- [ ] Backup diário PASS
- [ ] PITR: NOT ENABLED (risco aceito documentado)
- [ ] Runbooks: incident / recovery / support
- [ ] [FIRST_CLIENT_CHECKLIST.md](./FIRST_CLIENT_CHECKLIST.md) preenchível
- [ ] [ROLLBACK_CHECKLIST.md](./ROLLBACK_CHECKLIST.md) lido

## Billing

- [ ] **FROZEN SAFE**
- [ ] Cobrança real **NO-GO**
- [ ] Não iniciar 33.11
- [ ] `ASAAS_PRODUCTION_API_KEY_BLOCKER` isolado (externo)

## Decisão

| Modalidade | GO? |
|---|---|
| Piloto interno | |
| Cliente beta | |
| Cliente pago | **NO-GO** até key production |

Assinatura do responsável: _______________ Data: _______________
