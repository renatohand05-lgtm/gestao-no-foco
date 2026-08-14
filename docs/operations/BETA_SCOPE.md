# Escopo operacional — Beta / piloto (sem cobrança)

**Sprint 34.8.** Não é contrato jurídico.

## Incluído

- Uso web do produto core: clientes, produtos/serviços, estoque, vendas, financeiro básico, OS/agenda conforme segmento, equipe, CRM, dashboard, relatórios essenciais.
- Isolamento multiempresa, RBAC, recuperação de senha, convites.
- Suporte próximo/manual no canal acordado.
- Backup diário Supabase.

## Não incluído / limites

- **Cobrança real / Asaas production** — indisponível (`ASAAS_PRODUCTION_API_KEY_BLOCKER`).
- Checkout sandbox **não** é pagamento real; no piloto a UI não oferece checkout como cobrança.
- Integrações e automações avançadas podem aparecer como “Em breve”.
- Excel/PDF analytics avançados podem estar em preparação (CSV quando habilitado).
- Monitoring externo (ex.: Sentry) **parcial** — logging + health + runbooks.
- **PITR** não habilitado — RPO limitado ao backup diário.
- Acessibilidade: dívida P2 residual (não bloqueia beta controlado).
- Performance: aging até ~2k títulos; ABC/repos até 500 itens.

## Compromissos do operador

- Não misturar tenants de teste com cliente real.
- Não alterar production sem evidência.
- Não iniciar cobrança real sem decisão + key production distinta.

## Compromissos esperados do beta

- Reportar erros com horário / tela / empresa.
- Não usar o sistema para dados ilegais ou compartilhar credenciais.
- Aceitar que o piloto pode evoluir com avisos prévios.
