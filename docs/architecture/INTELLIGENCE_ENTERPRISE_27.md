# Inteligência Enterprise — Fase 27

## Objetivo

Camada reutilizável de inteligência empresarial **auditável**, com modos explícitos e sem inventar dados.

## Modos

1. **deterministic** — regras locais + evidências (default).
2. **provider_assisted** — só com provider configurado server-side; senão fallback explícito.
3. **unavailable** — fonte/permissão/provider indisponível; sem falso sucesso.

## Pacote

`lib/intelligence/enterprise/` — contratos, gateway, flags, privacy, audit, context, evidence, confidence, insight, recommendation, prompt, validation, copilot, cost, feedback, simulation, domains.

## Persistência

Audit / feedback / evidence registry desta fase são **in-memory** (processo).  
Persistência durável exige migration futura — **criar arquivo, documentar, aplicar manualmente**; não auto-aplicar.

## Segurança

- RBAC `inteligencia.*` + compat Owner/Admin (membership → papéis Enterprise).
- Redaction antes de qualquer saída/provider.
- Sem chaves no cliente.
- Isolamento por tenant nos registros de evidência/auditoria.

## UI

Rotas sob `/{tenant}/inteligencia` + componentes GF em `components/intelligence/`.  
Não altera paleta Signature / Dashboard layout.
