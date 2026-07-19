# Gate 2 — Runbook NF-e Importação 13.22

## Pré-requisitos

1. CTO aprovou Gate 1 (código + migration).
2. Decisão de política de **custo** (último vs médio) registrada — obrigatória antes de atualizar `produtos.custo`.
3. Backup/snapshot do projeto Supabase.

## Aplicar migration (manual)

1. Abrir Supabase SQL Editor do ambiente alvo.
2. Colar e executar **integralmente**:
   - `supabase/migrations/20260725_nfe_entrada_importacao.sql`
3. Confirmar:
   - tabelas `notas_fiscais_entrada*` e `fornecedor_produto_vinculos`
   - bucket `nfe-entrada`
   - RLS ativo
4. `NOTIFY pgrst, 'reload schema';` (se necessário).

## Smoke pós-migration

```bash
npm run test:nfe-parser
npm run lint
$env:GNF_DIST_DIR=".next-build"; npm run build
```

1. Login no tenant de teste.
2. Estoque → Importar NF-e → upload XML real de fornecedor.
3. Conferir matching CNPJ, produtos, destino estoque.
4. Confirmar **sem** Conta a Pagar → verificar 1 movimentação entrada.
5. Repetir mesmo XML → deve abrir nota existente (sem nova movimentação).
6. Nova nota: item OS direto → OS com peça `compra`, estoque inalterado.
7. Com CP marcada + classificadores → 1 Conta a Pagar aberta (não paga).

## Não fazer no Gate 2

- Não habilitar OCR/SEFAZ.
- Não alterar motor de vendas/DRE/Fluxo.
- Não atualizar `produtos.custo` automaticamente até decisão CTO.

## Evidências

Registrar em `docs/testing/evidence/13-22/` com screenshots + IDs de NF/OS/CR/mov.
