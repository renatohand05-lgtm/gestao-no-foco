# Tenants de teste / homologação — plano seguro

**Sprint 34.8.** **NÃO apagar** automaticamente.

## Tenants conhecidos (evidências)

| Slug | Uso | Ação |
|---|---|---|
| `teste-renato-01` | Homologação principal A | Manter; não usar como cliente |
| `teste-renato-02` | Homologação (quando existir) | Manter |
| `Primewhash` | Homologação multiempresa / inactive | Manter |
| `gestaonofoco2` | Cross-tenant / B | Manter |

Outros slugs com prefixo `teste-` ou nomes claramente QA: tratar como homologação.

## Regras

1. **Cliente real/beta:** criar **tenant novo** com nome/slug comerciais.
2. Suporte: ao abrir ticket, confirmar slug; se for `teste-*` / QA, não tratar como produção do cliente.
3. Não copiar dados de teste → cliente.
4. Não soft-delete em massa sem backup + decisão.
5. Opcional futuro: flag `is_internal` / tag no nome — **não** exigido nesta sprint.

## Separação visual (operacional)

- Lista interna de suporte: manter este arquivo atualizado quando surgir novo QA tenant.
- Preferir e-mails `+qa@` / contas internas nos tenants de teste.
