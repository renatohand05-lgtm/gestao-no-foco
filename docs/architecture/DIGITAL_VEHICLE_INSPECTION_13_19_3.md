# Sprint 13.19.3 — Inspeção Digital do Veículo

**Status Gate 1:** pronto para revisão do CTO (schema **não** aplicado).  
**Status Gate 2:** bloqueado até aprovação formal + aplicação manual da migration.

## Objetivo

Entregar inspeção digital do veículo: checklist visual, fotos privadas, versão de orçamento prévio, link público com token hash, aprovação parcial/total com evidência imutável, PDF e deep-link WhatsApp — **sem** alterar DRE, Fluxo de Caixa, estoque ou faturamento.

## Decisões

| Tema | Decisão |
|------|----------|
| Gates | (1) código + migration para revisão; (2) schema + testes live só após CTO |
| Assinatura de mídia | `SUPABASE_SERVICE_ROLE_KEY` somente no servidor |
| Migration | arquivo `20260724_digital_vehicle_inspection.sql` — **não aplicar automaticamente** |
| Financeiro | checklist/diagnóstico/orçamento/aprovação **não** geram receita, CR, banco ou baixa de estoque |
| WhatsApp | deep-link `wa.me` (sem fingir envio) |
| E-mail | UI “não configurado” se não houver provider |
| Rate limit | in-memory 30 req / 10 min por IP+token (MVP) |

## Auditoria (reutilizado)

- Checklist / diagnóstico / anexos / eventos — `20260723_fix_oficina_os_enterprise.sql`
- Máquina de estados `advanceTo` / `findTransitionPath` — `lib/ordens/os-status.ts`, `ordem-servico-service.ts`
- Workspace OS — `components/ordens/os-workspace.tsx`

## Schema novo (pendente de aplicação)

Arquivo: [`supabase/migrations/20260724_digital_vehicle_inspection.sql`](../../supabase/migrations/20260724_digital_vehicle_inspection.sql)

Inclui:

1. `oficina_textos` + aviso padrão de orçamento prévio  
2. Checklist: `classificacao`, `categoria`, `etapa_inspecao`, unique parcial  
3. Diagnóstico: `observacoes_cliente`  
4. Anexos: vínculo checklist/diagnóstico, legenda, sha256; bucket privado `os-inspecao`  
5. `ordem_servico_orcamento_versoes` + `ordem_servico_orcamento_itens`  
6. `ordem_servico_compartilhamentos` (token_hash) + views  
7. `ordem_servico_aprovacoes` + `ordem_servico_aprovacao_itens`  
8. RPCs SECURITY DEFINER: `inspecao_publica_por_token`, `inspecao_publica_detalhes`, `inspecao_publica_aprovar`  
   - Fix digest/pgcrypto: aplicar também `20260724_fix_inspecao_publica_rpc.sql` se a RPC retornar `function digest(...) does not exist`.

## Backend

| Módulo | Função |
|--------|--------|
| `lib/supabase/admin.ts` | Service role server-only |
| `lib/ordens/inspecao-storage-service.ts` | Upload, soft-delete, signed URL |
| `lib/ordens/orcamento-versao-service.ts` | Publicar vN, listar, diff |
| `lib/ordens/compartilhamento-service.ts` | Criar/revogar link, WhatsApp helper |
| `lib/ordens/aprovacao-publica-service.ts` | Load/approve por token + rate limit |
| `lib/ordens/inspecao-pdf-service.ts` | HTML → PDF (Playwright) |
| `lib/ordens/inspecao-actions.ts` | Server actions da oficina |

## UX oficina

- Checklist visual por categoria (`components/ordens/inspecao/checklist-visual.tsx`)
- Anexos reais (`anexos-panel.tsx`)
- Painel de envio: publicar, link, copiar, WhatsApp, PDF, e-mail (`inspecao-envio-panel.tsx`)
- Integrado em `os-workspace.tsx` + props na página `[id]`

## Página pública

- Rota: `/inspecao/[token]` (`app/(public)/inspecao/[token]/page.tsx`)
- Allowlist: `PUBLIC_ROUTES` + segmento reservado `inspecao`
- APIs: `GET/POST /api/inspecao/[token]`, `GET .../midia/[anexoId]`
- Placa mascarada; sem custos/margem/obs internas

## Segurança / LGPD

- Token alto entropia; persistir apenas hash + prefixo  
- Expiração + revogação  
- Service role só em módulos server  
- MIME/extensão/tamanho validados no upload  
- Logs sem token completo / sem service key  
- RPCs públicas sem vazar outros tenants  

## Validação Gate 1

```bash
npm run lint
npm run build
```

`audit:schema --live` e os 30 testes obrigatórios → **Gate 2** (após CTO).

## Gate 2 — procedimento CTO

Ver [`docs/architecture/GATE2_DIGITAL_INSPECTION_13_19_3.md`](./GATE2_DIGITAL_INSPECTION_13_19_3.md).

Checklist resumido:

1. Aplicar `20260724_digital_vehicle_inspection.sql` no projeto Supabase de teste  
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` no ambiente server  
3. `npm run install:chromium` (PDF)  
4. Executar `npm run test:inspecao-gate2` (quando habilitado) + checklist dos 30 testes  
5. `npm run audit:schema -- --live`, `lint`, `build`  
6. Confirmar que DRE / Fluxo / faturamento / estoque permanecem intactos  

## Fora de escopo

- WhatsApp Business / SMS oficiais  
- Provider de e-mail (se inexistente)  
- Rate limit Redis/Upstash  
- Role matrix mecânico/consultor  
- Sprint 13.20  

## Release note (Oficina)

> **13.19.3 (Gate 1):** inspeção digital implementada em código — migration `20260724` **pendente de aplicação**. Funcionalidades de versão/link/aprovação pública/storage só operam após Gate 2.
