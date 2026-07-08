# Gestão no Foco

Plataforma SaaS de gestão empresarial inteligente, multiempresa e multiusuário.

## Stack

- **Next.js 16** — App Router, Server Components
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
│       ├── dashboard/
│       ├── clientes/
│       ├── produtos/
│       ├── vendas/
│       ├── financeiro/
│       ├── ordens/
│       ├── relatorios/
│       └── configuracoes/
├── api/auth/callback/    # OAuth / magic link callback
components/
├── ui/                   # Shadcn UI
├── layout/               # Sidebar, header, marketing
├── marketing/            # Seções da landing
├── auth/                 # Formulários de autenticação
├── dashboard/            # Componentes do painel
└── onboarding/
config/                   # Site e navegação
lib/
├── supabase/             # Clientes browser/server/middleware
├── tenants.ts            # Helpers multi-tenant
└── constants.ts
types/                      # Tipos TypeScript e Database
supabase/schema.sql         # Schema inicial com RLS
middleware.ts               # Proteção de rotas
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

3. Crie um projeto no [Supabase](https://supabase.com) e execute `supabase/schema.sql` no SQL Editor.

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Rotas principais

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` | Autenticação |
| `/register` | Cadastro |
| `/onboarding` | Criar primeira empresa |
| `/[tenant]/dashboard` | Painel da empresa |

## Multi-tenant

Cada empresa possui um `slug` único na URL. Usuários podem pertencer a várias empresas com papéis (`owner`, `admin`, `manager`, `member`). O isolamento de dados é garantido via Row Level Security no Supabase.

## Próximos passos

- CRUD de clientes, produtos e vendas
- Módulo financeiro com lançamentos
- Ordens de serviço para oficinas
- Convite de membros da equipe
- Relatórios e dashboards
