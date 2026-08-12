# Portal Web — Onboarding operacional do 1º cliente piloto

**Sprint:** 33.2
**Escopo:** procedimento seguro sem intervenção perigosa no banco. Multiempresa via `tenant_members`.

## Modelo (confirmado no código)

```
usuário (auth.users / profiles)
  └── tenant_members (role: owner|admin|manager|member)
        └── tenants (empresa)  ← URL /{slug}/…
```

- **Filiais operacionais:** não há produto de “branch ativa” no Portal web para troca; entidades fiscais/tax existem à parte. Não inventar filiais paralelas nesta sprint.
- **Empresa ativa:** slug na URL + cookie `gof_last_tenant_slug` (só se membership válida).
- **Troca:** seletor na sidebar → limpa cache tenant-scoped → `router.push` + `refresh`.
- **Empresa adicional:** `/empresas/nova` (mesma conta, novo tenant + OWNER).

## Pré-requisitos (antes de dados reais)

1. Production: `https://gestao-no-foco.vercel.app`
2. Snapshot/backup documentado: `docs/pilot/PRODUCTION_RECOVERY.md`
3. Migration RLS financeiro aplicada: `supabase/migrations/20260822_phase33_1_finance_rls_write.sql`
4. Env production: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` **somente servidor**, `APP_URL` / `NEXT_PUBLIC_APP_URL`
5. Opcional: `PILOT_TENANT_SLUGS=slug1,slug2` (marcação ops — **sem** bypass de segurança)
6. Smoke production com **dados de teste** PASS

## Fluxo — primeira empresa

1. `/register` → autenticação
2. `/onboarding` → cria tenant + membership OWNER
   (se já tem empresa, middleware redireciona para dashboard — usar `/empresas/nova` para outra)
3. `/{slug}/primeiro-acesso` (wizard) → Dashboard
4. Convidar equipe: `/{slug}/configuracoes/equipe`
5. Aceitar convite: `/convite/[token]`

## Fluxo — empresa adicional (mesma conta)

1. Logado → seletor → **Nova empresa** → `/empresas/nova`
2. Cria outro tenant; usuário vira OWNER da nova
3. Memberships anteriores permanecem; troca pelo seletor

## Tratamento de edge cases

| Caso | Comportamento esperado |
|------|------------------------|
| Empresa/slug já existe | Erro 23505 → mensagem de conflito; não duplica |
| Onboarding interrompido | Reabrir `/onboarding` (1ª) ou `/empresas/nova`; sem dados fictícios auto |
| Refresh mid-flow | Sessão Supabase; formulário não reenvia se `submitted` |
| Logout/login | Restaura última empresa **autorizada** via cookie; senão primeira membership |
| Convite futuro | `/convite/[token]` adiciona membership; não cria tenant |
| Erro de rede | Mensagem no form; retry manual |
| Duplo submit | Guard `loading`/`submitted` no client |

## Checklist pós-criação (piloto)

- [ ] Login OK
- [ ] Slug correto na URL
- [ ] Dashboard carrega (vazio ≠ erro)
- [ ] Sidebar só módulos permitidos (RBAC)
- [ ] CRM / Operação / Estoque / Financeiro OK para OWNER
- [ ] `member` não cria título financeiro (RLS 33.1)
- [ ] Se multiempresa: troca A↔B sem vazar dados; cold start OK
- [ ] Logout → `/login` sem loop

## O que NÃO fazer

- Não inserir tenant/membership só via SQL sem auditoria
- Não usar `SUPABASE_SERVICE_ROLE_KEY` no browser
- Não inserir dados fictícios em tenant real sem indicação explícita
- Não apresentar Hub de Integrações / Relatórios stub como “prontos”
- Não ativar `ALLOW_IMPORT_MEMORY` em production
- Não bypassar RLS/RBAC por “é piloto”

## Billing

Ver `docs/billing/BILLING_ARCHITECTURE.md`. Cobrança **não** bloqueia o piloto nesta sprint.
