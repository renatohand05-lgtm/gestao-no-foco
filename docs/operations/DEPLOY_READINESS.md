# Deploy Readiness — Pós-deploy

Checklist após deploy Vercel production (sem alterar envs automaticamente).

## Confirmar

1. Deployment **Ready** no Vercel
2. Commit SHA esperado em `main`
3. Domínio `https://gestao-no-foco.vercel.app`
4. Envs Production presentes (nomes apenas):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server)
   - `APP_URL` / `NEXT_PUBLIC_APP_URL`
5. `GET /api/health` → `ok: true` (ou degraded documentado)
6. `GET /api/status` → sem secrets; `billing.frozen: true`
7. Smoke login
8. Smoke dashboard
9. Smoke switcher multiempresa / tenant ativo
10. Smoke módulo core (clientes ou vendas)

## Se falhar

- Seguir [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md)
- Não ativar billing real
- Não aplicar migration “de emergência” sem checklist
