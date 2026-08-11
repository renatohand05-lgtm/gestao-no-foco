# Recuperação / snapshot — produção (Portal Web)

**Evidência:** não há job de backup automatizado no repositório.  
A proteção de dados depende do **plano Supabase** (PITR / daily backups) + **snapshot manual** antes de migrations.

Projeto: o mesmo referenciado em `.env.example` (`NEXT_PUBLIC_SUPABASE_URL` de production).  
Não imprimir secrets neste documento.

## O que está protegido

| Camada | Proteção | Evidência no repo |
|--------|----------|-------------------|
| Postgres (tabelas/RLS) | Backups do provedor Supabase + snapshot manual | Docs de migration pedem snapshot; **sem cron no git** |
| Storage (anexos) | Incluído no backup do projeto se o plano cobrir Storage | Não há script próprio |
| Auth (usuários) | Auth schema do projeto Supabase | — |
| Código / Vercel | Git `main` + deploys Vercel | `https://gestao-no-foco.vercel.app` |

## Como obter snapshot / backup (Renato)

No **Supabase Dashboard** do projeto **production**:

1. Abrir [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecionar o projeto production do Gestão no Foco
3. **Project Settings** (ícone de engrenagem) → **Database**
   - Conferir região e se **Point-in-Time Recovery** está ativo no plano
4. Para snapshot lógico antes de migration:
   - Menu **Database** → **Backups** (ou **Settings → Database → Backups**, conforme UI atual)
   - Se o plano permitir: **Create backup** / **Download backup**
5. Alternativa: **SQL Editor** não substitui backup; é só para aplicar SQL.

Se a UI mostrar apenas backups automáticos diários (plano): anotar horário do último backup **antes** de aplicar a migration 33.1.

## Como restaurar

1. Dashboard → **Database → Backups** → **Restore** no ponto anterior à mudança.
2. PITR (se habilitado): restaurar timestamp imediatamente anterior à migration.
3. Após restore: **Reload schema** da API (Settings → API).
4. Validar login + um SELECT em `contas_pagar` no tenant de teste.
5. Código: o app em Vercel não precisa rollback se só o SQL for revertido; se o deploy Web já estiver no ar, a UI de RBAC continua compatível com policies antigas (mais permissivas) — o risco é segurança, não quebra.

## Limitações

- Restore é **do projeto inteiro**, não de um tenant isolado.
- Downtime possível durante restore.
- Sem evidência de backup off-site além do provedor.
- Storage/Auth seguem a política do plano; confirmar no painel, não assumir PITR.

## Emergência (piloto)

1. Não aplicar novas migrations.
2. Snapshot/restore conforme acima.
3. Se vazamento cross-tenant (não esperado): revogar chaves anon comprometidas **não** é o primeiro passo — isolar o tenant, revisar RLS, rotacionar service role **só no servidor** (Vercel env).
4. Service role **nunca** no frontend.

## Variáveis no servidor (nomes)

Obrigatórias no **Vercel production** (Environment = Production, não expostas com `NEXT_PUBLIC_` salvo as públicas):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (somente servidor)
- `NEXT_PUBLIC_APP_URL` / `APP_URL`

`SUPABASE_SERVICE_ROLE_KEY` no frontend: **NÃO**.
