# Sprint 31.4 — PERFORMANCE

## Objetivos

| Métrica | Meta |
|---------|------|
| Cold start app | ≤ 2s |
| Warm navegação CRM | ≤ 1s |
| Pipeline cached | ≤ 300ms |
| Lista clientes | ≤ 1s |

## Medição nesta sessão

**Não medida em device real.** Homologação estática apenas.

Mitigações implementadas:

- `staleTime: 60_000` nas queries CRM
- Snapshot AsyncStorage no home
- Listas limitadas (100 clientes / 80 timeline / 40 cards por estágio)
- Soft-fail em sources opcionais

## Limitação

Sem instrumentação de tempo em dispositivo físico nesta sprint.
