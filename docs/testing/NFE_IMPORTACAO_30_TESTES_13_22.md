# 30 testes — Importação NF-e 13.22

Marcar após Gate 2 (migration aplicada). Gate 1: parser unitário + lint/build.

| # | Teste | Gate 1 | Gate 2 | Evidência |
|---|-------|--------|--------|-----------|
| 1 | XML válido | ✓ parser | ☐ | |
| 2 | XML inválido | ✓ parser | ☐ | |
| 3 | Arquivo não XML | ✓ parser | ☐ | |
| 4 | XML acima do limite | ✓ parser | ☐ | |
| 5 | Campos opcionais ausentes | ✓ parser | ☐ | |
| 6 | NF já importada | ☐ código antidup | ☐ live | |
| 7 | Mesmo XML nome diferente | ✓ hash | ☐ live | |
| 8 | Fornecedor existente | ☐ | ☐ | |
| 9 | Fornecedor inexistente | ☐ | ☐ | |
| 10 | Produto por EAN | ☐ | ☐ | |
| 11 | Produto por vínculo fornecedor | ☐ | ☐ | |
| 12 | Produto sem correspondência | ☐ | ☐ | |
| 13 | Item total estoque | ☐ | ☐ | |
| 14 | Item total OS | ☐ | ☐ | |
| 15 | Item misto | ✓ helper qtd | ☐ live | |
| 16 | Quantidades divergentes | ✓ | ☐ UI | |
| 17 | OS inválida | ☐ | ☐ | |
| 18 | OS outro tenant | ☐ | ☐ | |
| 19 | Entrada estoque única | ☐ | ☐ | |
| 20 | Item direto sem ↑ estoque | ☐ | ☐ | |
| 21 | Conta a Pagar única | ☐ | ☐ | |
| 22 | Conta a Pagar parcelada | ☐ | ☐ | |
| 23 | Falha com rollback/status erro | ☐ parcial | ☐ | |
| 24 | Reprocessamento idempotente | ☐ | ☐ | |
| 25 | RLS entre tenants | ☐ migration | ☐ | |
| 26 | XML sem acesso público | ☐ bucket private | ☐ | |
| 27 | Log sem dados sensíveis | ✓ logger | ☐ | |
| 28 | DRE preservado | ☐ | ☐ | |
| 29 | Fluxo preservado | ☐ | ☐ | |
| 30 | Build e lint | ✓ Gate 1 | ☐ | |
