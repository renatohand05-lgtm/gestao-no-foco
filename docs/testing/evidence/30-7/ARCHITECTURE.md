# Sprint 30.7 — Arquitetura (evidência)

Módulo `lib/automacoes/` + UI `components/automacoes/automacoes-central.tsx`.

- Compose puro: `composeAutomationCentral`
- Engine controlada: `runAutomationEngine` (idempotência, loop, aprovação)
- Sem side-effects externos nesta sprint

Suite: `npm run test:phase30-automations`
