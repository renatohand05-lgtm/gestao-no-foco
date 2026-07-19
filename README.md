# Gestão no Foco

Plataforma SaaS de gestão empresarial inteligente, multiempresa e multiusuário.

## Stack

- **Next.js 16** — App Router, Server Components, `proxy.ts`
- **TypeScript** — tipagem end-to-end
- **Tailwind CSS 4** — estilização utilitária
- **Shadcn UI** — componentes acessíveis
- **Lucide Icons** — ícones
- **Supabase** — autenticação, banco PostgreSQL e RLS

## Estrutura do projeto

```
app/
├── (marketing)/          # Landing page pública
├── (auth)/               # Login e registro
├── (app)/
│   ├── onboarding/       # Criação da primeira empresa
│   └── [tenant]/         # Área autenticada por empresa
├── api/auth/callback/    # OAuth / magic link callback
components/               # UI por domínio + ui/ + layout/
lib/                      # Services, actions, design-system
types/                    # Tipos de domínio + database.ts
config/                   # Site e navegação
docs/architecture/        # Padrões oficiais (Sprint 9.7+)
supabase/                 # schema + migrations
proxy.ts                  # Next.js 16 — proteção de sessão/rotas
```

## Começando

1. Instale dependências:

```bash
npm install
```

2. Copie as variáveis de ambiente:

```bash
cp .env.example .env.local
```

3. Crie um projeto no [Supabase](https://supabase.com) e execute `supabase/schema.sql` (e migrations em `supabase/migrations/` conforme necessário) no SQL Editor.

4. Inicie **um** servidor de desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Portas e `.next`

| Comando | Uso | Porta padrão |
|---------|-----|--------------|
| `npm run dev` | Desenvolvimento | `3000` |
| `npm run build` + `npm start` | Produção local | `3000` |

**Importante (Next.js 16):**

- Não rode dois `npm run dev` na mesma pasta do projeto ao mesmo tempo — ambos usam `.next/` e corrompem o cache Turbopack.
- Se o hot reload falhar ou aparecer erro estranho de módulo, pare os processos Node e limpe o cache:

```bash
# PowerShell (Windows)
Remove-Item -Recurse -Force .next
npm run dev
```

- Para forçar outra porta: `npx next dev -p 3001` (ainda assim, **um** processo por pasta).

### Next.js 16 — `proxy.ts`

A proteção de rotas e renovação de sessão Supabase ficam em `proxy.ts` (substitui o antigo `middleware.ts` do App Router nesta versão).

- Entry: `proxy.ts` → chama `updateSession` em `lib/supabase/middleware.ts`
- Matcher exclui estáticos (`_next/static`, imagens, favicon)

Não recrie `middleware.ts` na raiz sem alinhar à documentação oficial do Next.js 16.

### Build e produção

```bash
npm run lint
npm run build
npm start
```

Arquitetura e checklist: [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md).  
Performance: [docs/architecture/PERFORMANCE.md](docs/architecture/PERFORMANCE.md).  
Release Sprint 9: [docs/releases/SPRINT_9.md](docs/releases/SPRINT_9.md) · [CHANGELOG.md](CHANGELOG.md).

## Rotas principais

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` | Autenticação |
| `/register` | Cadastro |
| `/onboarding` | Criar primeira empresa |
| `/[tenant]/dashboard` | Painel da empresa (streaming + comercial) |
| `/[tenant]/configuracoes/metas` | Metas mensais de vendas |
| `/[tenant]/financeiro/*` | DRE, Fluxo, CR, CP, estrutura |

## Multi-tenant

Cada empresa possui um `slug` único na URL. Usuários podem pertencer a várias empresas com papéis (`owner`, `admin`, `manager`, `member`). O isolamento de dados é garantido via Row Level Security no Supabase e filtros `tenant_id` nos services.

## Status

**Sprint 9:** Release Candidate (9.9.2) — pronta para Sprint 10.
