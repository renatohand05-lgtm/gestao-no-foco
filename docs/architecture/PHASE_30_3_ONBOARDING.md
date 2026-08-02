# Fase 30.3 — Onboarding Enterprise Multissetorial

## Objetivo

Configurar automaticamente uma nova empresa conforme o segmento, via wizard em etapas, **sem alterar** módulos financeiros, DRE, CRM, estoque, compras ou identidade visual.

## Arquitetura

| Camada | Path |
|--------|------|
| Catálogo de segmentos | `config/onboarding/segments.ts` |
| Setup (labels/menus/KPIs) | `config/onboarding/segment-setup.ts` |
| Templates (somente estrutura) | `config/onboarding/templates.ts` |
| Checklist implantação | `config/onboarding/implantation-checklist.ts` |
| Canais de import (prep) | `config/onboarding/import-channels.ts` |
| Fluxo de passos | `config/onboarding/flow.ts` |
| Persistência meta | `lib/onboarding/enterprise/*` + `user_onboarding_progress.meta` |
| UI | `components/onboarding/enterprise/*` |
| Rota | `/{tenant}/primeiro-acesso` |

## Persistência

- Perfil da empresa (CNPJ, endereço, regime…) → `meta.enterprise30_3.company`
- Segmento enterprise → `meta.enterprise30_3.segmentId`
- Segmento de navegação canônico → `tenants.segment` via `toNavSegmentId`
- Templates **não** inserem linhas em tabelas de negócio
- Importação: arquitetura apenas (`IMPORT_CHANNELS`)

## Gate 19.4

O wizard premium (`OnboardingWizard` + `PREMIUM_ONBOARDING_FLOW`) permanece intacto para o preflight. A página `primeiro-acesso` passa a renderizar o wizard enterprise.

## Tempo médio

~6 minutos (`ENTERPRISE_AVG_MINUTES`).

## Testes

- `npm run test:phase30-onboarding`
- `npm run test:phase30-templates`
- `npm run test:phase30-checklist`
- `npm run test:phase30-segment-config`
- `npm run test:homolog-30-3`
