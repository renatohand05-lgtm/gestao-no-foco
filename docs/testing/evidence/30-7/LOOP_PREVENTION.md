# Sprint 30.7 — Loop prevention

Fonte: `checkLoopPrevention` em `lib/automacoes/loop-prevention.ts`.

| Código | Comportamento |
|--------|----------------|
| SELF_TRIGGER | Regra já na cadeia → pausa |
| CYCLE | A→B→A detectado → pausa |
| COOLDOWN | Respeita `cooldownSeconds` |
| RECURSION | Profundidade > 5 |
| MAX_EXECUTIONS / TENANT_LIMIT | Limites configuráveis |

Suite: `npm run test:phase30-automation-loop-prevention`
