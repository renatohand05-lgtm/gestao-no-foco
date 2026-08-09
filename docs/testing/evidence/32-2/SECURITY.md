# Sprint 32.2 — Auditoria de segurança (piloto)

## Escopo

Mobile (`apps/mobile`) + rotas `/api/mobile/v1/*` + env pública.

## Achados

| Classe | Ocorrências | Risco | Ação |
|--------|-------------|-------|------|
| `service_role` no mobile | 0 | — | OK |
| Secrets / `.env` no bundle | não commitados; EAS `EXPO_PUBLIC_*` apenas | baixo | manter |
| Bearer API | SecureStore + fallback sessão Supabase (32.1.1) | médio residual | OK com fallback |
| Tokens em logs | `sanitizeForLog` + telemetria scrub (32.2 amplia keys) | baixo | OK |
| RBAC / RLS | `mergeMobileEffectivePermissions` server-side; sem bypass | — | OK |
| Tenant isolation | headers + membership checks nas rotas | — | OK |
| `console.log` ad-hoc com secrets | logger centralizado `[gof.mobile]` | baixo | preferir `logger` / `mobileTelemetry` |
| Biometria | opt-in; não armazena senha | — | OK |
| AsyncStorage | sessão Supabase JSON (necessário >2048 SecureStore) | aceito | documentado |
| Mock tokens em production | rejeitados (`isProductionMode`) | — | OK |

## Classificação

**APROVADO PARA PILOTO COM RESSALVAS** — sem secret no cliente; telemetria console-only (sem sink remoto ainda).
