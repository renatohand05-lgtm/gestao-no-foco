# Fase 29 â€” Enterprise Release Oficial (29.11)

**Status:** RELEASE ENTERPRISE
**Data:** 2026-08-02
**ProduÃ§Ã£o:** https://gestao-no-foco.vercel.app

## Escopo encerrado

- Arquitetura enterprise consolidada (29.0â€“29.8)
- HomologaÃ§Ã£o profunda (29.9)
- Migrations CRM + Compras (29.10 / 29.10.1 / 29.10.2)
- Release oficial (29.11): gates, browser QA, push, deploy, tag `v29.0-enterprise`

## CritÃ©rios de aceite

| CritÃ©rio | Resultado |
|----------|-----------|
| lint / build | 0 erros / EXIT 0 |
| suites phase29 + RC + cores | 0 FAIL |
| Browser QA autenticado | 0 FAIL |
| CRM + Compras runtime | homologados |
| Schema `cliente_contatos.ativo` + Ã­ndice principal | corretivo 60818 |
| Push `main` + deploy Vercel Production | obrigatÃ³rio na 29.11 |
| Tag `v29.0-enterprise` | obrigatÃ³ria na 29.11 |

## DocumentaÃ§Ã£o relacionada

- [PHASE_29_ENTERPRISE.md](./PHASE_29_ENTERPRISE.md)
- [PHASE_29_10_MIGRATIONS.md](./PHASE_29_10_MIGRATIONS.md)
- EvidÃªncia: `docs/testing/evidence/release-v29/REPORT.md`

## Fora de escopo nesta release

- RegeneraÃ§Ã£o oficial `supabase gen types` com token (dÃ­vida nÃ£o bloqueante)
- EvidÃªncias locais `27-8-*` (nÃ£o versionadas)
- Fase 30
