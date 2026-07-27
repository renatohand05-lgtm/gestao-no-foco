# Changelog — Gestão no Foco

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [21.10.0-rc.1] — 2026-07-27 — Enterprise Release Candidate

### Added
- Declaração oficial da Fase 21 Enterprise como Release Candidate
- Documentação: Enterprise Overview, Sprint History, Release Checklist, ADR, Release Notes
- Script agregado `npm run test:enterprise-rc`

### Changed
- Versão do projeto: `0.1.0` → `21.10.0-rc.1`
- Architecture Overview e Roadmap atualizados para marco Enterprise RC

### Security / Quality
- Reviews de arquitetura, segurança, multi-tenant e performance (RC1)
- Quality gates Fase 21: 933 PASS · lint/build PASS

### Deferred (Fase 22)
- Hardening de fallback RBAC e gate SLA cron
- Unificação de stacks paralelos domain ↔ application-services

Detalhes: [docs/releases/ENTERPRISE_21_10_RC1.md](docs/releases/ENTERPRISE_21_10_RC1.md).

---

## [Sprint 9 RC] — 2026-07-13

### Added
- Painel Comercial enterprise (performance, heatmap, rankings, insights, export)
- Metas mensais de vendas + projeção por dias corridos/úteis
- Soft delete de metas com confirmação no portal
- Isolamento de erro por seção no Painel Comercial
- App Router: `loading` / `error` / `not-found` nas rotas críticas
- Docs de release em `docs/releases/`

### Changed
- Dashboard com streaming Suspense e loaders `React.cache`
- Fluxo de Caixa com paginação server-side da listagem
- Roadmap e backlog atualizados para fechamento da Sprint 9

### Fixed
- Warning React de `<title>` SVG com children em array
- Drill-down de serviços no ranking (módulo Produtos & Serviços)
- Remoção de componentes/loaders órfãos

### Security
- Soft delete de metas com validação de tenant
- Confirmação obrigatória e anti–double-click em exclusões

---

## [Sprint 8.x] — Financeiro Enterprise

Base financeira (plano, centros, CR/CP, motor RPC, Fluxo real, DRE real). Detalhes em `docs/roadmap/ROADMAP.md`.
