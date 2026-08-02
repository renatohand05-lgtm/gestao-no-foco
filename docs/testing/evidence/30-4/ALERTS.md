# Alertas — Sprint 30.4

Fonte: `lib/dashboard/cockpit-v2/alerts.ts` + UI `alerts-center.tsx`.

## Prioridade

Crítica · Alta · Média · Baixa

## Categorias

Financeiro · Compras · Estoque · CRM · Equipe · Operação · Tributário

## Regras

- Só promove insights/decisões **acionáveis** já existentes
- Corpos “Indisponível” não viram alerta (exceto danger)
- Cada alerta: descrição · impacto · ação sugerida · atalho · fonte
- **Nunca** gera alerta fictício / IA inventada
