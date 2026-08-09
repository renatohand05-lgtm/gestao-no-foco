# Sprint 32.2 — Performance (baseline piloto)

Medições de device em lab/piloto; valores abaixo são **placeholders de processo** até coleta física na Build do piloto.

| Fluxo | p50 | p95 | worst observed | Notas |
|-------|-----|-----|----------------|-------|
| Cold start | TBD | TBD | TBD | Splash → APP_READY |
| Warm start | TBD | TBD | TBD | |
| Login | TBD | TBD | TBD | |
| Membership bootstrap | TBD | TBD | TBD | memberships + permissions |
| Dashboard | TBD | TBD | TBD | |
| Financeiro | TBD | TBD | TBD | |
| CRM | TBD | TBD | TBD | |
| Estoque | TBD | TBD | TBD | |
| Operação | TBD | TBD | TBD | |

## Gargalos conhecidos (não otimizar prematuramente)

- Bootstrap sequencial: boot → biometric → memberships → permissions → branches.
- Homes de módulo fazem 1 GET principal (+ soft domains no server).
- Retries GET (máx 2) em rede instável.

Correções só com evidência de p95 degradado no piloto.
