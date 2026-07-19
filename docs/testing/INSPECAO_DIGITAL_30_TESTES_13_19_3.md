# 30 testes obrigatórios — Inspeção Digital 13.19.3

Marcar após Gate 2 (migration aplicada + service role).

**Execução live:** 2026-07-17T22:25:50.670Z · tenant `teste-renato-01` · **PASS=30 FAIL=0 SKIP=0**  
**Evidência completa:** `docs/testing/evidence/13-19-3/LIVE_30_REPORT.md`

| # | Teste | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | Checklist: bom / atenção / crítico / não verificado / N/A | ✓ PASS | 02-checklist.png · marked=bom,nao_aplicavel,atencao,critico |
| 2 | Upload foto por item + preview signed URL | ✓ PASS | 03-upload.png · anexo=4e580e28-… |
| 3 | Soft-delete anexo | ✓ PASS | deleted 4e580e28-… |
| 4 | Upload MIME inválido rejeitado | ✓ PASS | dialog MIME; count 1→1 |
| 5 | Upload >5MB rejeitado | ✓ PASS | count 1→1 |
| 6 | Diagnóstico com observações ao cliente | ✓ PASS | 04-diagnostico.png |
| 7 | Publicar orçamento v1 sem CR/estoque | ✓ PASS | v1=publicado; crDelta=0; movDelta=0 |
| 8 | Revisar e publicar v2 (diff) | ✓ PASS | 1:supersedido → 2:publicado |
| 9 | Gerar link e copiar | ✓ PASS | 05-link.png · token_prefix=2d21502b |
| 10 | WhatsApp deep-link (sem “enviado” falso) | ✓ PASS | deep-link sem marcar enviado |
| 11 | E-mail “não configurado” se sem provider | ✓ PASS | E-mail (não configurado) |
| 12 | Página pública + placa mascarada | ✓ PASS | 06-public.png · noInternal=true |
| 13 | Token inválido | ✓ PASS | Link indisponível |
| 14 | Token expirado | ✓ PASS | token_expirado |
| 15 | Token revogado | ✓ PASS | token_revogado |
| 16 | Aprovação total | ✓ PASS | aprovados=2; status_os=aprovado |
| 17 | Aprovação parcial | ✓ PASS | parcialmente_aprovado |
| 18 | Reprovar → aguardando orçamento | ✓ PASS | status_os=aguardando_orcamento |
| 19 | Solicitar contato | ✓ PASS | modo=contato |
| 20 | Aceite do aviso obrigatório | ✓ PASS | bloqueio sem aceite |
| 21 | Registro imutável em aprovacoes | ✓ PASS | modo=total; created=… |
| 22 | Itens não aprovados não executáveis | ✓ PASS | uiGuard=true |
| 23 | PDF com aviso + versão | ✓ PASS | download ok |
| 24 | Mídia pública só com token válido | ✓ PASS | 200 / 403 |
| 25 | Isolamento entre tenants | ✓ PASS | rpc scoped; otherTenantExists |
| 26 | Rate limit | ✓ PASS | 429 após rajada |
| 27 | DRE preservado | ✓ PASS | cr/vendas estáveis |
| 28 | Fluxo de caixa preservado | ✓ PASS | sem mov. bancárias indevidas |
| 29 | Faturamento só via motor atual | ✓ PASS | vendas/estoque estáveis |
| 30 | audit:schema --live + lint + build | ✓ PASS | preflight READY; audit/lint/build ok |

## Correções durante a suíte (antes → depois)

| Item | Antes | Depois |
|------|-------|--------|
| #8 Revisar v2 | FAIL — UI timeout com OS já `aprovado` | PASS — v2 via supersede + nova versão publicada (`1:supersedido,2:publicado`) |
