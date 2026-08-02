# Política de Barrel Exports

**Sprint:** 29.0  
**Status:** Obrigatório para código novo e limpeza estrutural

---

## Regra geral

Preferir **deep imports** (`@/components/<dom>/<file>`, `@/lib/<dom>/<file>`).

Barrels (`index.ts` que reexportam um pacote) só existem quando há uma **API pública intencional** e consumidores reais do package root.

---

## Barrels permitidos (APIs públicas)

| Pacote | Motivo |
|--------|--------|
| `@/lib/enterprise` | **Única entrada oficial** — ports/adapters + Enterprise Intelligence (29.6) |
| `@/lib/executive-intelligence` | Implementação de sinais — **não** importar de app/components |
| `@/lib/design-system` | Tokens / primitives de DS |
| `@/components/executive` | Primitives de UI executiva (alto uso) |
| `@/lib/finance` | API pública do Financial Core EN — **consumidores externos** |
| `@/lib/format` | Formatters canônicos |
| Outros barrels com consumidores verificados | Manter enquanto houver imports do package root |

---

## Anti-padrões

1. **Self-barrel import** — módulos *dentro* de `lib/finance/**` (ou outro pacote) **não** devem importar `@/lib/finance`. Usar paths relativos/deep (`./shared/...`, `./treasury/...`).
2. **Mega-barrel sem consumidores** — `export *` de dezenas de módulos sem ninguém importar o barrel.
3. **Barrel de UI de domínio** — pastas `components/<domínio>/` devem ser consumidas por deep import; não criar `index.ts` “por convenção”.
4. **Crescer `components/executive`** com painéis de domínio — primitives sim; features de CRM/Finance/OS não.

---

## Checklist antes de criar um barrel

1. Existe pelo menos um consumidor que importa o package root?
2. A superfície exportada é estável (não “tudo do diretório”)?
3. O barrel não será importado por arquivos que ele próprio reexporta (ciclo)?
4. Documentou o pacote como API pública?

Se qualquer resposta for “não”, **não crie** o barrel.

---

## Checklist antes de remover um barrel

1. `rg` / busca por `from "@/path/to/package"` → 0 hits
2. Sem imports relativos do tipo `from "./index"` de fora do pacote que dependam dele
3. Deep imports dos módulos internos continuam válidos
4. Rodar `lint` + `build` + gate da fase

---

## Relação com outros padrões

- Módulos: [MODULE_STANDARD.md](./MODULE_STANDARD.md)
- Services/Actions: [SERVICE_STANDARD.md](./SERVICE_STANDARD.md)
- Fase 29: [PHASE_29_ENTERPRISE.md](./PHASE_29_ENTERPRISE.md)
