-- Rodada 16: dados de EXEMPLO da cozinha central e do delivery para a empresa de demonstração.
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

  -- Rupturas registradas (105, de 05/10 a 01/11) do painel original.
  if not exists (select 1 from public.rede_rupturas where tenant_id = v_t) then
    insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas, origem)
    select v_t, l.id, x.data::date, x.item, x.motivo, x.horas, 'exemplo'
    from (values
    ('brooklyn', '2026-10-10', 'Molho de gergelim', 'Erro no pedido da loja', 8),
    ('brooklyn', '2026-10-10', 'Tofu', 'Atraso na entrega', 8),
    ('brooklyn', '2026-10-08', 'Repolho roxo', 'Falta na cozinha central', 1),
    ('perdizes', '2026-10-05', 'Molho de gergelim', 'Demanda acima do previsto', 3),
    ('perdizes', '2026-10-09', 'Salmão', 'Falta na cozinha central', 6),
    ('perdizes', '2026-10-06', 'Molho de gergelim', 'Falta na cozinha central', 8),
    ('perdizes', '2026-10-11', 'Molho de gergelim', 'Problema de qualidade', 1),
    ('vila-mariana', '2026-10-09', 'Tofu', 'Falta na cozinha central', 1),
    ('vila-mariana', '2026-10-11', 'Salmão', 'Problema de qualidade', 2),
    ('vila-mariana', '2026-10-11', 'Salmão', 'Falta na cozinha central', 2),
    ('vila-mariana', '2026-10-09', 'Carne bovina (acém)', 'Erro no pedido da loja', 2),
    ('vila-mariana', '2026-10-10', 'Karaage empanado', 'Demanda acima do previsto', 3),
    ('vila-mariana', '2026-10-07', 'Salmão', 'Atraso na entrega', 2),
    ('vila-mariana', '2026-10-07', 'Salmão', 'Falta na cozinha central', 4),
    ('vila-mariana', '2026-10-09', 'Salmão', 'Erro no pedido da loja', 2),
    ('tatuape', '2026-10-07', 'Molho de gergelim', 'Falta na cozinha central', 6),
    ('tatuape', '2026-10-07', 'Salmão', 'Atraso na entrega', 2),
    ('tatuape', '2026-10-05', 'Karaage empanado', 'Demanda acima do previsto', 6),
    ('tatuape', '2026-10-07', 'Carne bovina (acém)', 'Falta na cozinha central', 8),
    ('tatuape', '2026-10-08', 'Molho de gergelim', 'Erro no pedido da loja', 1),
    ('tatuape', '2026-10-08', 'Salmão', 'Falta na cozinha central', 2),
    ('tatuape', '2026-10-05', 'Repolho roxo', 'Demanda acima do previsto', 3),
    ('tatuape', '2026-10-07', 'Cebolinha', 'Demanda acima do previsto', 2),
    ('tatuape', '2026-10-11', 'Molho de gergelim', 'Erro no pedido da loja', 8),
    ('tatuape', '2026-10-11', 'Molho de gergelim', 'Falta na cozinha central', 3),
    ('brooklyn', '2026-10-13', 'Karaage empanado', 'Erro no pedido da loja', 2),
    ('brooklyn', '2026-10-14', 'Karaage empanado', 'Erro no pedido da loja', 1),
    ('perdizes', '2026-10-17', 'Karaage empanado', 'Falta na cozinha central', 1),
    ('perdizes', '2026-10-17', 'Salmão', 'Erro no pedido da loja', 3),
    ('perdizes', '2026-10-13', 'Gengibre', 'Falta na cozinha central', 4),
    ('perdizes', '2026-10-16', 'Arroz integral', 'Falta na cozinha central', 6),
    ('vila-mariana', '2026-10-18', 'Karaage empanado', 'Erro no pedido da loja', 2),
    ('vila-mariana', '2026-10-12', 'Embalagem bowl 750 ml', 'Erro no pedido da loja', 8),
    ('vila-mariana', '2026-10-15', 'Karaage empanado', 'Falta na cozinha central', 6),
    ('vila-mariana', '2026-10-16', 'Embalagem bowl 750 ml', 'Erro no pedido da loja', 8),
    ('vila-mariana', '2026-10-15', 'Salmão', 'Atraso na entrega', 2),
    ('vila-mariana', '2026-10-12', 'Carne bovina (acém)', 'Falta na cozinha central', 3),
    ('vila-mariana', '2026-10-16', 'Carne bovina (acém)', 'Demanda acima do previsto', 3),
    ('vila-mariana', '2026-10-15', 'Gengibre', 'Falta na cozinha central', 2),
    ('tatuape', '2026-10-15', 'Molho de gergelim', 'Falta na cozinha central', 3),
    ('tatuape', '2026-10-18', 'Embalagem bowl 750 ml', 'Demanda acima do previsto', 6),
    ('tatuape', '2026-10-15', 'Carne bovina (acém)', 'Falta na cozinha central', 3),
    ('tatuape', '2026-10-14', 'Cebolinha', 'Atraso na entrega', 4),
    ('tatuape', '2026-10-14', 'Salmão', 'Demanda acima do previsto', 2),
    ('tatuape', '2026-10-17', 'Cebolinha', 'Falta na cozinha central', 2),
    ('tatuape', '2026-10-14', 'Cebolinha', 'Erro no pedido da loja', 8),
    ('tatuape', '2026-10-15', 'Karaage empanado', 'Demanda acima do previsto', 6),
    ('tatuape', '2026-10-14', 'Embalagem bowl 750 ml', 'Falta na cozinha central', 2),
    ('tatuape', '2026-10-16', 'Carne bovina (acém)', 'Atraso na entrega', 8),
    ('tatuape', '2026-10-14', 'Karaage empanado', 'Falta na cozinha central', 2),
    ('brooklyn', '2026-10-21', 'Karaage empanado', 'Falta na cozinha central', 8),
    ('brooklyn', '2026-10-22', 'Karaage empanado', 'Demanda acima do previsto', 8),
    ('brooklyn', '2026-10-25', 'Gengibre', 'Demanda acima do previsto', 2),
    ('perdizes', '2026-10-23', 'Embalagem bowl 750 ml', 'Falta na cozinha central', 2),
    ('perdizes', '2026-10-25', 'Molho de gergelim', 'Erro no pedido da loja', 6),
    ('perdizes', '2026-10-24', 'Gengibre', 'Falta na cozinha central', 8),
    ('perdizes', '2026-10-23', 'Cebolinha', 'Demanda acima do previsto', 2),
    ('vila-mariana', '2026-10-24', 'Embalagem bowl 750 ml', 'Falta na cozinha central', 4),
    ('vila-mariana', '2026-10-22', 'Tofu', 'Falta na cozinha central', 8),
    ('vila-mariana', '2026-10-24', 'Salmão', 'Problema de qualidade', 3),
    ('vila-mariana', '2026-10-20', 'Salmão', 'Demanda acima do previsto', 1),
    ('vila-mariana', '2026-10-21', 'Embalagem bowl 750 ml', 'Atraso na entrega', 4),
    ('vila-mariana', '2026-10-19', 'Molho de gergelim', 'Falta na cozinha central', 6),
    ('vila-mariana', '2026-10-23', 'Salmão', 'Falta na cozinha central', 6),
    ('vila-mariana', '2026-10-21', 'Salmão', 'Atraso na entrega', 2),
    ('tatuape', '2026-10-25', 'Salmão', 'Demanda acima do previsto', 2),
    ('tatuape', '2026-10-19', 'Cebolinha', 'Falta na cozinha central', 2),
    ('tatuape', '2026-10-23', 'Cebolinha', 'Demanda acima do previsto', 2),
    ('tatuape', '2026-10-21', 'Carne bovina (acém)', 'Atraso na entrega', 8),
    ('tatuape', '2026-10-23', 'Tofu', 'Atraso na entrega', 2),
    ('tatuape', '2026-10-20', 'Cebolinha', 'Atraso na entrega', 2),
    ('tatuape', '2026-10-20', 'Cebolinha', 'Falta na cozinha central', 6),
    ('tatuape', '2026-10-19', 'Molho de gergelim', 'Falta na cozinha central', 4),
    ('tatuape', '2026-10-23', 'Salmão', 'Erro no pedido da loja', 4),
    ('tatuape', '2026-10-22', 'Molho de gergelim', 'Demanda acima do previsto', 3),
    ('tatuape', '2026-10-21', 'Molho de gergelim', 'Erro no pedido da loja', 3),
    ('tatuape', '2026-10-25', 'Arroz integral', 'Erro no pedido da loja', 2),
    ('brooklyn', '2026-10-29', 'Karaage empanado', 'Falta na cozinha central', 2),
    ('brooklyn', '2026-10-29', 'Arroz integral', 'Falta na cozinha central', 1),
    ('brooklyn', '2026-10-26', 'Tofu', 'Demanda acima do previsto', 2),
    ('perdizes', '2026-10-26', 'Repolho roxo', 'Demanda acima do previsto', 1),
    ('perdizes', '2026-10-29', 'Cebolinha', 'Falta na cozinha central', 3),
    ('perdizes', '2026-11-01', 'Salmão', 'Atraso na entrega', 8),
    ('perdizes', '2026-10-27', 'Gengibre', 'Falta na cozinha central', 3),
    ('vila-mariana', '2026-10-30', 'Tofu', 'Erro no pedido da loja', 6),
    ('vila-mariana', '2026-10-26', 'Salmão', 'Falta na cozinha central', 2),
    ('vila-mariana', '2026-10-30', 'Gengibre', 'Erro no pedido da loja', 6),
    ('vila-mariana', '2026-10-30', 'Salmão', 'Falta na cozinha central', 6),
    ('vila-mariana', '2026-10-31', 'Carne bovina (acém)', 'Falta na cozinha central', 1),
    ('vila-mariana', '2026-10-28', 'Cebolinha', 'Erro no pedido da loja', 1),
    ('vila-mariana', '2026-10-31', 'Cebolinha', 'Falta na cozinha central', 8),
    ('vila-mariana', '2026-11-01', 'Molho de gergelim', 'Erro no pedido da loja', 6),
    ('vila-mariana', '2026-10-31', 'Tofu', 'Demanda acima do previsto', 8),
    ('tatuape', '2026-10-29', 'Molho de gergelim', 'Demanda acima do previsto', 2),
    ('tatuape', '2026-10-28', 'Molho de gergelim', 'Problema de qualidade', 2),
    ('tatuape', '2026-11-01', 'Salmão', 'Problema de qualidade', 4),
    ('tatuape', '2026-10-28', 'Tofu', 'Atraso na entrega', 2),
    ('tatuape', '2026-10-27', 'Salmão', 'Erro no pedido da loja', 3),
    ('tatuape', '2026-10-28', 'Cebolinha', 'Atraso na entrega', 4),
    ('tatuape', '2026-11-01', 'Salmão', 'Problema de qualidade', 2),
    ('tatuape', '2026-11-01', 'Salmão', 'Falta na cozinha central', 1),
    ('tatuape', '2026-10-28', 'Gengibre', 'Demanda acima do previsto', 3),
    ('tatuape', '2026-10-31', 'Cebolinha', 'Falta na cozinha central', 1),
    ('tatuape', '2026-10-27', 'Tofu', 'Demanda acima do previsto', 1),
    ('tatuape', '2026-10-31', 'Carne bovina (acém)', 'Demanda acima do previsto', 6)
    ) as x(loja, data, item, motivo, horas)
    join public.rede_lojas l on l.tenant_id = v_t and l.slug = x.loja;
  end if;

  -- Estoque da cozinha central (20 produtos) do painel original.
  insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario, origem)
  select v_t, x.item, x.un, x.atual, x.minimo, x.consumo, x.custo, 'exemplo'
  from (values
    ('Arroz japonês', 'kg', 320, 180, 62, 8.9),
    ('Arroz integral', 'kg', 90, 40, 14, 9.6),
    ('Frango (sobrecoxa)', 'kg', 260, 120, 48, 17.5),
    ('Karaage empanado', 'kg', 140, 60, 27, 24.0),
    ('Carne bovina (acém)', 'kg', 110, 50, 19, 39.9),
    ('Salmão', 'kg', 50, 25, 9, 79.0),
    ('Tofu', 'kg', 30, 15, 5, 18.0),
    ('Shoyu', 'L', 85, 40, 9, 14.5),
    ('Molho teriyaki (base)', 'L', 70, 35, 11, 22.0),
    ('Molho de gergelim', 'L', 32, 20, 7, 26.0),
    ('Ovos', 'dz', 64, 30, 12, 11.0),
    ('Repolho roxo', 'kg', 38, 25, 10, 6.5),
    ('Cenoura', 'kg', 44, 20, 8, 4.9),
    ('Cebolinha', 'kg', 9, 6, 2.5, 18.0),
    ('Gengibre', 'kg', 11, 5, 1.5, 22.0),
    ('Óleo de soja', 'L', 150, 60, 22, 8.2),
    ('Embalagem bowl 750 ml', 'un', 4200, 1500, 620, 0.85),
    ('Tampa bowl', 'un', 3900, 1500, 620, 0.32),
    ('Hashi', 'un', 2600, 2000, 700, 0.09),
    ('Sacola delivery', 'un', 5000, 1200, 520, 0.45)
  ) as x(item, un, atual, minimo, consumo, custo)
  on conflict (tenant_id, lower(btrim(item))) do nothing;

  -- Checklists de delivery semanais de outubro/2026: os indicadores repetem o valor do mês do painel
  -- original (a média do mês continua igual); as rupturas da semana vêm das rupturas registradas acima.
  insert into public.rede_delivery_registros
    (tenant_id, loja_id, data, periodo, responsavel, preparo, cancelamentos, nota_ifood, tempo_online, rupturas, rotina, observacoes, origem)
  select v_t, l.id, s.semana, 'semanal', 'Exemplo', i.preparo, i.cancel, i.ifood, i.online,
         (select count(*) from public.rede_rupturas r where r.loja_id = l.id and r.data >= s.semana and r.data < s.semana + 7)::int,
         i.rotina::jsonb, i.obs, 'exemplo'
  from (values
    ('brooklyn', 13.8, 1.5, 4.8, 98.4, '{"0":"sim","1":"sim","2":"sim","3":"sim","4":"sim","5":"sim","6":"sim"}', null),
    ('perdizes', 14.6, 1.9, 4.7, 97.6, '{"0":"sim","1":"sim","2":"sim","3":"sim","4":"sim","5":"sim","6":"sim"}', null),
    ('vila-mariana', 17.2, 2.9, 4.5, 95.8, '{"0":"sim","1":"nao","2":"sim","3":"sim","4":"nao","5":"sim","6":"sim"}', 'Itens em falta sem pausar nas plataformas; campanhas sem revisão. Exemplo.'),
    ('tatuape', 19.5, 3.8, 4.4, 94.2, '{"0":"sim","1":"nao","2":"nao","3":"sim","4":"sim","5":"nao","6":"sim"}', 'Avaliações sem resposta e embalagem sem auditoria no pico. Exemplo.')
  ) as i(loja, preparo, cancel, ifood, online, rotina, obs)
  join public.rede_lojas l on l.tenant_id = v_t and l.slug = i.loja
  cross join (values (date '2026-10-05'), (date '2026-10-12'), (date '2026-10-19'), (date '2026-10-26')) as s(semana)
  on conflict (loja_id, data, periodo) do nothing;
end $$;
