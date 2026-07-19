# Padrão de Services e Server Actions

---

## 1. Services (data layer)

### Factory oficial

```ts
export class XService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}
  // ...
}

export async function createXService(tenantId: string) {
  const supabase = await createClient(); // lib/supabase/server
  return new XService(supabase, tenantId);
}
```

### Regras obrigatórias

| Tema | Padrão |
|------|--------|
| Cliente Supabase | Sempre `createClient()` de `@/lib/supabase/server` no factory |
| Tenant | Toda query: `.eq("tenant_id", this.tenantId)` |
| Soft-delete | Listagens: `.is("deleted_at", null)` salvo regra explícita |
| Erros | `if (error) throw new Error(error.message)` |
| Retorno | Tipado (`Promise<T>`, `PaginatedResult<T>`) |
| Paginação | `page` / `perPage` com defaults e teto em `constants.ts` |
| Ordenação | Whitelist de colunas no service; nunca confiar no client cego |
| Relações | Preferir FK explícita no `select` quando houver ambiguidade (`table!fk_name(...)`) |
| Leitura vs escrita | Métodos `list`/`get` separados de `create`/`update`/`delete`/`softDelete` |

### O que o service **não** faz

- Validar sessão HTTP (isso é da page/action via `requireTenant`)
- `revalidatePath` / `redirect`
- Conhecer componentes React
- Duplicar cálculo já existente em outro service financeiro

### Domínios financeiros

- Reutilizar `DreService`, `FluxoCaixaService`, `ContaReceberService`, `ContaPagarService`.
- Operações atômicas multi-tabela: wrappers `*-rpc.ts` existentes.
- **Não** criar novas RPCs nesta fase de freeze sem sprint dedicada.

---

## 2. Server Actions

### Formato oficial

```ts
"use server";

type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export async function createXAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = xFormSchema.parse(values);
    const service = await createXService(tenant.id);
    const row = await service.create(normalizeXFormValues(parsed));

    revalidatePath(`/${tenantSlug}/x`);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao criar registro.",
    };
  }
}
```

### Checklist da action

1. `"use server"` no topo do arquivo
2. `requireTenant(tenantSlug)` (ou equivalente de sessão)
3. Validação Zod (`schema.parse` / `safeParse`)
4. Mapper → input tipado do service
5. Chamada ao service
6. `revalidatePath` das rotas afetadas
7. Retorno `ActionResult` **ou** `redirect` com `?success=` / `?error=`
8. Mensagens de erro amigáveis em português

### Feedback UX

- Preferência do projeto: query string `?success=` / `?error=` + componente `*-feedback.tsx`
- Alternativa: `ActionResult` consumido no client com toast/inline error

### Redirects

- Após create bem-sucedido: listagem ou detalhe, conforme o módulo maduro equivalente
- Nunca expor stack traces ao usuário

---

## 3. Paginação tipada (padrão atual)

Cada módulo declara localmente (até unificação futura):

```ts
export type SortOrder = "asc" | "desc";

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
};
```

Defaults típicos: `DEFAULT_PER_PAGE = 10`, `MAX_PER_PAGE = 50`.

---

## 4. Anti-padrões

- Importar service no Client Component e consultar Supabase no browser para mutações privilegiadas
- Copiar SQL do DRE/Fluxo para o Dashboard
- Ignorar `deleted_at` em listagens
- Usar `select('*')` em joins ambíguos sem FK nomeada
- Engolir erros sem mensagem
