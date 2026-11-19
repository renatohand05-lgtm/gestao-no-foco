-- Rodada 15: dados de EXEMPLO do financeiro (CMV, DRE, orçamento) para a empresa de demonstração.
-- Origem = 'exemplo' em todos os registros. Não toca em nenhuma outra empresa: se a empresa
-- "fat-buddha-demo" não existir (ou não tiver o módulo), não faz nada. Reaplicar não duplica.
do $$
declare
  v_t uuid;
begin
  select id into v_t from public.tenants where slug = 'fat-buddha-demo' and rede_operacional;
  if v_t is null then
    return;
  end if;

  -- Contagens semanais (8 semanas x 4 lojas) do painel original.
  insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, vendas, cmv_teorico, estoque_inicial, compras, estoque_final, responsavel, origem)
  select v_t, l.id, x.semana::date, x.vendas, x.teorico, x.ei, x.compras, x.ef, 'Exemplo', 'exemplo'
  from (values
    ('brooklyn', '2026-09-07', 224637, 19.4, 79071, 41385, 74636),
    ('perdizes', '2026-09-07', 202627, 19.7, 67527, 45599, 69284),
    ('vila-mariana', '2026-09-07', 84517, 20.4, 27647, 20712, 30774),
    ('tatuape', '2026-09-07', 42994, 20.4, 14204, 11340, 16438),
    ('brooklyn', '2026-09-14', 228665, 19.5, 78836, 44465, 75193),
    ('perdizes', '2026-09-14', 196627, 20, 63964, 39384, 61509),
    ('vila-mariana', '2026-09-14', 87373, 20.2, 30456, 19339, 31852),
    ('tatuape', '2026-09-14', 47604, 20.4, 15363, 12222, 17013),
    ('brooklyn', '2026-09-21', 210742, 19.8, 64639, 43975, 65455),
    ('perdizes', '2026-09-21', 191808, 20.1, 59879, 37516, 56874),
    ('vila-mariana', '2026-09-21', 85056, 20.1, 25950, 20286, 28321),
    ('tatuape', '2026-09-21', 47823, 20.5, 16180, 11165, 17077),
    ('brooklyn', '2026-09-28', 228329, 19.7, 81628, 41768, 77556),
    ('perdizes', '2026-09-28', 204110, 19.7, 64519, 48067, 69375),
    ('vila-mariana', '2026-09-28', 96619, 20.4, 34498, 21393, 36186),
    ('tatuape', '2026-09-28', 45864, 20.5, 15614, 11342, 17384),
    ('brooklyn', '2026-10-05', 234488, 19.5, 82503, 47543, 83292),
    ('perdizes', '2026-10-05', 201167, 20.1, 67284, 38859, 64213),
    ('vila-mariana', '2026-10-05', 94108, 20.3, 29438, 21929, 31862),
    ('tatuape', '2026-10-05', 44053, 20.7, 13488, 11268, 15531),
    ('brooklyn', '2026-10-12', 210803, 19.8, 69531, 46138, 71297),
    ('perdizes', '2026-10-12', 195410, 19.9, 61331, 46188, 65740),
    ('vila-mariana', '2026-10-12', 89069, 20.5, 28695, 21614, 31786),
    ('tatuape', '2026-10-12', 43082, 20.5, 13055, 11869, 15382),
    ('brooklyn', '2026-10-19', 215461, 19.8, 72480, 41717, 68273),
    ('perdizes', '2026-10-19', 190097, 19.8, 64004, 43341, 68311),
    ('vila-mariana', '2026-10-19', 88483, 20.3, 27274, 19087, 28289),
    ('tatuape', '2026-10-19', 45515, 20.4, 14887, 11938, 16851),
    ('brooklyn', '2026-10-26', 234158, 19.8, 72623, 49816, 74641),
    ('perdizes', '2026-10-26', 210253, 19.9, 64328, 42476, 61372),
    ('vila-mariana', '2026-10-26', 90687, 20.4, 27665, 22126, 31220),
    ('tatuape', '2026-10-26', 43406, 20.4, 14211, 10660, 15833)
  ) as x(loja, semana, vendas, teorico, ei, compras, ef)
  join public.rede_lojas l on l.tenant_id = v_t and l.slug = x.loja
  on conflict (loja_id, semana) do nothing;

  -- Dispersão por item da última contagem do painel original (exemplo), junto da última contagem do Brooklyn.
  insert into public.rede_cmv_itens (tenant_id, loja_id, semana, item, consumo_teorico, consumo_real)
  select v_t, l.id, date '2026-10-26', x.item, x.teorico, x.real
  from (values
    ('Salmão', 8, 9.4),
    ('Karaage empanado', 41, 44.5),
    ('Arroz japonês', 86, 89),
    ('Carne bovina (acém)', 22, 24.1),
    ('Frango (sobrecoxa)', 55, 56.2),
    ('Molho teriyaki (base)', 14, 15.3),
    ('Óleo de soja', 30, 33.5),
    ('Embalagem bowl 750 ml', 1480, 1530)
  ) as x(item, teorico, real)
  join public.rede_lojas l on l.tenant_id = v_t and l.slug = 'brooklyn'
  on conflict (loja_id, semana, item) do nothing;

  -- Exceção do DRE original: Vila Mariana com custo de delivery de 27%.
  insert into public.rede_dre_premissas (tenant_id, loja_id, custo_delivery)
  select v_t, l.id, 27 from public.rede_lojas l where l.tenant_id = v_t and l.slug = 'vila-mariana'
  on conflict do nothing;

  -- Brooklyn vende no salão e no delivery: participação do delivery = a de outubro/2026 lançada na demonstração.
  insert into public.rede_dre_premissas (tenant_id, loja_id, mix_delivery)
  select v_t, l.id,
         (select round(100 * sum(v.venda_delivery) / nullif(sum(v.venda_salao + v.venda_delivery), 0), 1)
            from public.rede_vendas_dia v where v.loja_id = l.id and v.data between date '2026-10-01' and date '2026-10-31')
  from public.rede_lojas l
  where l.tenant_id = v_t and l.slug = 'brooklyn'
    and exists (select 1 from public.rede_vendas_dia v where v.loja_id = l.id and v.data between date '2026-10-01' and date '2026-10-31')
  on conflict do nothing;

  -- Cenários de exemplo para comparar (o "Base" já vem do modelo original).
  insert into public.rede_orc_cenarios
    (tenant_id, nome, descricao, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, base_delivery, manutencao, marketing, cto, agua, energia, curva, origem)
  values
    (v_t, 'Conservador (exemplo)', 'Exemplo: loja nova mais lenta e com custos mais altos.', 420000, 100, 22, 21, 10, 28, 'delivery', 1.5, 7, 12000, 1500, 4500, '[60,70,80,90,95,100]'::jsonb, 'exemplo'),
    (v_t, 'Otimista (exemplo)', 'Exemplo: loja nova que matura rápido.', 600000, 100, 20.5, 18, 10, 28, 'delivery', 1.5, 7, 12000, 1500, 4500, '[80,90,100,100,100,100]'::jsonb, 'exemplo')
  on conflict (tenant_id, nome) do nothing;

  -- Calendário sugerido no painel original para chegar a 10 lojas (exemplo; datas ajustáveis).
  insert into public.rede_expansao_unidades (tenant_id, nome, abertura_prevista, status, observacao, origem)
  values
    (v_t, 'Loja 6', date '2027-03-01', 'planejada', 'Exemplo: 1º semestre de 2027', 'exemplo'),
    (v_t, 'Loja 7', date '2027-08-01', 'planejada', 'Exemplo: 2º semestre de 2027', 'exemplo'),
    (v_t, 'Loja 8', date '2027-11-01', 'planejada', 'Exemplo: 2º semestre de 2027', 'exemplo'),
    (v_t, 'Loja 9', date '2028-04-01', 'planejada', 'Exemplo: 1º semestre de 2028', 'exemplo'),
    (v_t, 'Loja 10', date '2028-10-01', 'planejada', 'Exemplo: 2º semestre de 2028', 'exemplo')
  on conflict (tenant_id, nome) do nothing;
end $$;
