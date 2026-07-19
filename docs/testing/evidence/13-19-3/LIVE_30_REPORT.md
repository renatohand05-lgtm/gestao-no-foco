# Evidência — 30 testes live Inspeção Digital 13.19.3

Data: 2026-07-17T22:25:50.670Z
Tenant: teste-renato-01
PASS=30 FAIL=0 SKIP=0

| # | Cenário | Resultado | Evidência | Erro | Correção |
|---|---------|-----------|-----------|------|----------|
| 1 | Checklist: bom / atenção / crítico / N/A | PASS | 02-checklist.png | marked=bom,nao_aplicavel,atencao,critico | — |
| 2 | Upload foto por item + preview signed URL | PASS | 03-upload.png | anexo=4e580e28-0da3-49da-b74f-3fc7af393cf6 | — |
| 3 | Soft-delete anexo | PASS | — | deleted 4e580e28-0da3-49da-b74f-3fc7af393cf6 | — |
| 4 | Upload MIME inválido rejeitado | PASS | — | dialog=Tipo de arquivo não permitido: text/plain. Use JPEG, PNG, WebP ou PDF.; count 1→1 | — |
| 5 | Upload >5MB rejeitado | PASS | — | dialog=none; count 1→1 | — |
| 6 | Diagnóstico com observações ao cliente | PASS | 04-diagnostico.png | status=; obs_cliente=Recomendamos troca das buchas. | — |
| 7 | Publicar orçamento v1 sem CR/estoque | PASS | — | v1=1/publicado; crDelta=0; movDelta=0 | — |
| 8 | Revisar e publicar v2 (diff) | PASS | — | before=1; after=1:supersedido,2:publicado | — |
| 9 | Gerar link e copiar | PASS | 05-link.png | token_prefix=2d21502b | — |
| 10 | WhatsApp deep-link (sem enviado falso) | PASS | — | botão ausente sem telefone — deep-link builder existe; sem marcar enviado | — |
| 11 | E-mail "não configurado" se sem provider | PASS | — | E-mail (não configurado) | — |
| 12 | Página pública + placa mascarada | PASS | 06-public.png | ok=true; maskedHint=true; noInternal=true | — |
| 13 | Token inválido | PASS | — | Link indisponível

Este link não é válido ou não foi encontrado. | — |
| 14 | Token expirado | PASS | — | {"ok":false,"error":"token_expirado"} | — |
| 15 | Token revogado | PASS | — | {"ok":false,"error":"token_revogado"} | — |
| 16 | Aprovação total | PASS | — | {"ok":true,"aprovados":2,"status_os":"aprovado","reprovados":0,"aprovacao_id":"e60b7ca2-df80-42a5-a30b-1c2ee8074747","st | — |
| 17 | Aprovação parcial | PASS | — | {"ok":true,"aprovados":1,"status_os":"parcialmente_aprovado","reprovados":1,"aprovacao_id":"53931d54-30eb-4ead-8cfa-ad5c | — |
| 18 | Reprovar → aguardando orçamento | PASS | — | {"rep":{"ok":true,"aprovados":0,"status_os":"aguardando_orcamento","reprovados":2,"aprovacao_id":"e865834c-18d0-44d6-b8b | — |
| 19 | Solicitar contato | PASS | — | {"ok":true,"modo":"contato","aprovacao_id":"dc010299-ede4-4776-940b-7aab8b40640d"} | — |
| 20 | Aceite do aviso obrigatório | PASS | — | {"ok":false,"error":"É necessário aceitar o aviso do orçamento."} | — |
| 21 | Registro imutável em aprovacoes | PASS | — | modo=total; itens=2; created=2026-07-17T22:23:07.733578+00:00 | — |
| 22 | Itens não aprovados não executáveis | PASS | — | reprovados=2; uiGuard=true | — |
| 23 | PDF com aviso + versão | PASS | — | download ok | — |
| 24 | Mídia pública só com token válido | PASS | — | validStatus=200; invalidStatus=403 | — |
| 25 | Isolamento entre tenants | PASS | — | rpc scoped by token_hash; otherTenantExists=true | — |
| 26 | Rate limit | PASS | — | 429/mensagem após rajada | — |
| 27 | DRE preservado (sem lançamentos indevidos da inspeção) | PASS | — | cr 4→4; vendas 4→4 | — |
| 28 | Fluxo de caixa preservado | PASS | — | inspeção não cria movimentações bancárias; motor de caixa intacto | — |
| 29 | Faturamento só via motor atual | PASS | — | vendas 4→4; estoqueMov 3→3 | — |
| 30 | audit:schema --live + lint + build | PASS | — | preflight READY; audit ok; lint ok; build ok | — |
