# Metas e Projeção de Vendas

Controle mensal de metas de faturamento e projeção automática, reutilizando a fonte oficial do Dashboard/DRE.

---

## Fonte de faturamento (obrigatória)

| Campo | Origem |
|-------|--------|
| Realizado | `DreService.getDre(...).resumo.receita_bruta` |

Mesmas regras do Dashboard KPI “Faturamento”. **Não** há cálculo paralelo de receita.

---

## Projeção (Sprint 9.8.6)

### Dias corridos

```
projecao_dias_corridos = realizado / dias_decorridos * dias_totais_mes
```

### Dias úteis (seg–sex)

```
projecao_dias_uteis = realizado / dias_uteis_decorridos * dias_uteis_totais_mes
```

**Feriados não são descontados** nesta versão — documentado em `observacao_feriados`.

| Caso | Comportamento |
|------|----------------|
| Mês encerrado / último dia | ambas projeções = realizado |
| Mês futuro / 0 dias (úteis) decorridos | projeção = 0 |
| Sem vendas | projeção = 0 |
| Sem divisão por zero | retorna 0 |

### Necessário por dia

```
restante = max(meta - realizado, 0)
necessario_corrido = restante / dias_corridos_restantes
necessario_util = restante / dias_uteis_restantes
```

Meta atingida, mês encerrado ou sem meta → 0 / não calcula.

### Ritmo

```
ritmo_esperado = dias_decorridos / dias_totais * 100
ritmo_atual = realizado / meta * 100
diff_pp = ritmo_atual - ritmo_esperado
```

Também calculado `percentual_tempo_util_decorrido` para referência.

---

## Status / thresholds (9.8.6)

| Status | Regra |
|--------|-------|
| `sem_meta` | sem cadastro |
| `atingida` | ≥ 100% (ou meta 0) |
| `mes_encerrado` | mês passado sem atingir |
| `acima_do_ritmo` | diff > **+5** p.p. |
| `no_ritmo` | **-5 ≤ diff ≤ +5** |
| `abaixo_do_ritmo` | **-15 ≤ diff < -5** |
| `muito_abaixo_do_ritmo` | diff **< -15** |

Constantes: `META_RITMO_ACIMA_PP`, `META_RITMO_NO_RITMO_PP`, `META_RITMO_ABAIXO_PP` em `types/metas-vendas.ts`.

---

## Tabela

`public.metas_vendas_mensais` — migration `20260714_create_metas_vendas_mensais.sql`.

Índices únicos **parciais** (`where deleted_at is null`) permitem recriar meta para a mesma competência/centro após soft delete.

---

## Exclusão (Sprint 9.9.1)

- Soft delete: preenche `deleted_at` — **sem** delete físico.
- UI: botão **Excluir meta** (destrutivo) no histórico e na edição, com modal obrigatório.
- Server: `deleteMetaVendasAction` → `MetaVendasService.softDelete` (filtra `tenant_id` + `id` + `deleted_at is null`).
- Meta inexistente / já excluída / outro tenant → erro amigável; zero linhas atualizadas.
- Revalidação: Dashboard + `/configuracoes/metas` (+ rota de edição).
- Após exclusão: Dashboard mostra estado **Sem meta**; realizado permanece; DRE/faturamento intactos.
- Histórico de listagem só exibe metas ativas (`deleted_at is null`); registro permanece no banco para auditoria.

---

## Rotas / UI

- `/{tenant}/configuracoes/metas` (+ nova / editar / excluir com confirmação)
- Dashboard: **Painel Comercial** (Sprint 9.8.7 / 9.9) — projeções via `buildMetaProjecao`
