# Checklist de Desenvolvimento — Novos Módulos

Obrigatório antes de considerar um módulo pronto para merge.

---

## Isolamento e dados

- [ ] Tenant isolado (`requireTenant` + `tenant_id` em todas as queries)
- [ ] Soft-delete respeitado (`deleted_at`) — exclusão lógica com confirmação quando aplicável
- [ ] Sem mock de dados de produção
- [ ] Sem regra de negócio duplicada (reutilizar DRE / Fluxo / CR / CP / serviços canônicos)
- [ ] Sem TODO / FIXME deixados no código entregue
- [ ] Seções críticas com isolamento de erro (boundary / Suspense) quando o módulo for composto

## Tipagem e validação

- [ ] Tipos em `types/<modulo>.ts` (ou subdomínio)
- [ ] Zod em `lib/<modulo>/validations.ts` para writes
- [ ] Service tipado (`Database` / tipos de domínio)
- [ ] Actions com `ActionResult` ou redirect padronizado

## Estrutura

- [ ] Pastas: `app/.../<modulo>/`, `components/<modulo>/`, `lib/<modulo>/`
- [ ] Responsabilidades alinhadas a [MODULE_STANDARD.md](./MODULE_STANDARD.md)
- [ ] Services alinhados a [SERVICE_STANDARD.md](./SERVICE_STANDARD.md)
- [ ] Sem arquivos órfãos após substituição de UI

## UI / UX

- [ ] Loading state
- [ ] Empty state (com explicação)
- [ ] Error state (mensagem amigável)
- [ ] Success feedback (`?success=` ou equivalente)
- [ ] Responsividade (mobile → desktop)
- [ ] Acessibilidade mínima (label, `aria-label`, focus, contraste)
- [ ] Design System (`ds*` tokens) — sem hardcodes desnecessários
- [ ] Server → Client: apenas props serializáveis
- [ ] `<title>` / tooltips SVG como **string única** (não children em array)

## Qualidade

- [ ] `npm run lint` sem erros
- [ ] `npm run build` sem erros
- [ ] Teste manual do fluxo feliz + empty + erro de validação + exclusão com confirmação
- [ ] Se houver testes automatizados do domínio, verdes

## Financeiro / KPI (quando aplicável)

- [ ] Fonte única de verdade documentada
- [ ] Período e comparação claros
- [ ] Formatação monetária / percentual consistente
- [ ] Drill-down com filtros de URL quando fizer sentido

---

## Sprint 9 — encerrada (9.9.2 RC)

Pendências críticas tratadas até 9.9.1; RC 9.9.2: limpeza, App Router states, docs de release. Itens de modelagem (canal, vendedor, feriados) no backlog da Sprint 10.

---

## Referências

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [MODULE_STANDARD.md](./MODULE_STANDARD.md)
- [SERVICE_STANDARD.md](./SERVICE_STANDARD.md)
- [UI_STANDARD.md](./UI_STANDARD.md)
- [METAS_VENDAS.md](./METAS_VENDAS.md)
- [COMERCIAL_ENTERPRISE.md](./COMERCIAL_ENTERPRISE.md)
