-- Rodada 18: dados de EXEMPLO de RH (quadro de pessoal, quadro previsto e lançamentos mensais) para a empresa de
-- demonstração. Origem = 'exemplo' em todos os registros. Não toca em nenhuma outra empresa: se a empresa
-- "fat-buddha-demo" não existir (ou não tiver o módulo), não faz nada. Reaplicar não duplica.
-- Os nomes (ex.: "Breno F.") são os do painel original e são fictícios; NUNCA entram na empresa real.
do $$
declare
  v_t uuid;
begin
  select id into v_t from public.tenants where slug = 'fat-buddha-demo' and rede_operacional;
  if v_t is null then
    return;
  end if;

  -- 82 colaboradores do painel original.
  if not exists (select 1 from public.rede_rh_colaboradores where tenant_id = v_t) then
    insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao, origem)
    select v_t, l.id, x.nome, x.cargo, x.adm::date, 'exemplo'
    from (values
    ('brooklyn', 'Breno F.', 'gerente_loja', '2022-09-15'),
    ('brooklyn', 'Cristiano E.', 'chefe_cozinha', '2024-11-04'),
    ('brooklyn', 'João A.', 'lider_delivery', '2024-10-10'),
    ('brooklyn', 'Vanessa F.', 'lider_delivery', '2024-10-21'),
    ('brooklyn', 'André E.', 'auxiliar_cozinha', '2023-08-09'),
    ('brooklyn', 'Cíntia L.', 'auxiliar_cozinha', '2024-02-03'),
    ('brooklyn', 'Letícia H.', 'auxiliar_cozinha', '2022-10-12'),
    ('brooklyn', 'Flávia S.', 'auxiliar_cozinha', '2026-03-28'),
    ('brooklyn', 'Priscila L.', 'auxiliar_cozinha', '2023-10-08'),
    ('brooklyn', 'Ingrid V.', 'auxiliar_cozinha', '2023-11-13'),
    ('brooklyn', 'Hugo P.', 'auxiliar_cozinha', '2022-02-04'),
    ('brooklyn', 'Giovana H.', 'auxiliar_cozinha', '2025-12-13'),
    ('brooklyn', 'Débora S.', 'auxiliar_cozinha', '2024-09-06'),
    ('brooklyn', 'Rayane E.', 'auxiliar_cozinha', '2023-08-18'),
    ('brooklyn', 'Leonardo C.', 'auxiliar_cozinha', '2024-04-07'),
    ('brooklyn', 'Karina P.', 'auxiliar_cozinha', '2024-04-02'),
    ('brooklyn', 'Murilo T.', 'atendente', '2025-03-03'),
    ('brooklyn', 'Elaine M.', 'atendente', '2025-12-23'),
    ('brooklyn', 'Sérgio B.', 'atendente', '2022-08-12'),
    ('brooklyn', 'Natália A.', 'atendente', '2025-11-03'),
    ('brooklyn', 'Camila M.', 'atendente', '2023-02-03'),
    ('brooklyn', 'Tiago B.', 'atendente', '2025-12-23'),
    ('brooklyn', 'Paula M.', 'atendente', '2024-02-22'),
    ('brooklyn', 'Emerson P.', 'atendente', '2026-01-28'),
    ('perdizes', 'Marcos O.', 'gerente_loja', '2021-10-20'),
    ('perdizes', 'Talita D.', 'chefe_cozinha', '2023-07-13'),
    ('perdizes', 'Jéssica R.', 'lider_delivery', '2024-08-27'),
    ('perdizes', 'Yasmin T.', 'lider_delivery', '2022-05-20'),
    ('perdizes', 'Fernanda D.', 'auxiliar_cozinha', '2024-10-22'),
    ('perdizes', 'Matheus A.', 'auxiliar_cozinha', '2024-05-05'),
    ('perdizes', 'Carla F.', 'auxiliar_cozinha', '2026-06-22'),
    ('perdizes', 'Jorge H.', 'auxiliar_cozinha', '2024-07-22'),
    ('perdizes', 'Tatiane G.', 'auxiliar_cozinha', '2023-07-08'),
    ('perdizes', 'Fábio E.', 'auxiliar_cozinha', '2023-08-12'),
    ('perdizes', 'Daniela C.', 'auxiliar_cozinha', '2024-03-04'),
    ('perdizes', 'Gabriela G.', 'auxiliar_cozinha', '2026-07-13'),
    ('perdizes', 'Pedro M.', 'auxiliar_cozinha', '2025-10-15'),
    ('perdizes', 'Patrícia J.', 'auxiliar_cozinha', '2026-01-22'),
    ('perdizes', 'Fabiana L.', 'auxiliar_cozinha', '2025-10-01'),
    ('perdizes', 'Nathan G.', 'atendente', '2022-05-08'),
    ('perdizes', 'Kleber D.', 'atendente', '2024-02-21'),
    ('perdizes', 'Rodrigo N.', 'atendente', '2022-11-07'),
    ('perdizes', 'Douglas F.', 'atendente', '2025-01-25'),
    ('perdizes', 'Rafael F.', 'atendente', '2023-05-25'),
    ('perdizes', 'Vitor T.', 'atendente', '2025-10-25'),
    ('perdizes', 'Nicole H.', 'atendente', '2022-07-24'),
    ('vila-mariana', 'Elias G.', 'gerente_loja', '2024-01-18'),
    ('vila-mariana', 'Sabrina M.', 'chefe_cozinha', '2022-06-04'),
    ('vila-mariana', 'Aline D.', 'lider_delivery', '2023-04-13'),
    ('vila-mariana', 'Helena V.', 'auxiliar_cozinha', '2026-06-09'),
    ('vila-mariana', 'Bárbara N.', 'auxiliar_cozinha', '2025-02-02'),
    ('vila-mariana', 'Bianca J.', 'auxiliar_cozinha', '2024-01-07'),
    ('vila-mariana', 'Ana B.', 'auxiliar_cozinha', '2023-09-11'),
    ('vila-mariana', 'Juliana S.', 'auxiliar_cozinha', '2023-09-24'),
    ('vila-mariana', 'Mônica R.', 'auxiliar_cozinha', '2024-10-23'),
    ('vila-mariana', 'Vinícius T.', 'atendente', '2025-05-27'),
    ('vila-mariana', 'Otávio T.', 'atendente', '2025-09-09'),
    ('vila-mariana', 'Larissa G.', 'atendente', '2024-03-18'),
    ('vila-mariana', 'Joice G.', 'atendente', '2024-09-04'),
    ('tatuape', 'Michele A.', 'gerente_loja', '2024-01-18'),
    ('tatuape', 'Renata S.', 'chefe_cozinha', '2022-12-03'),
    ('tatuape', 'Gustavo O.', 'lider_delivery', '2024-04-16'),
    ('tatuape', 'Sueli S.', 'auxiliar_cozinha', '2025-06-04'),
    ('tatuape', 'Everton J.', 'auxiliar_cozinha', '2023-12-25'),
    ('tatuape', 'Diego E.', 'auxiliar_cozinha', '2023-01-22'),
    ('tatuape', 'Igor H.', 'auxiliar_cozinha', '2025-08-04'),
    ('tatuape', 'Wagner T.', 'atendente', '2025-05-23'),
    ('tatuape', 'Eduarda P.', 'atendente', '2022-07-21'),
    ('tatuape', 'Henrique F.', 'atendente', '2025-04-28'),
    ('butanta', 'Isabela T.', 'gerente_loja', '2026-10-01'),
    ('butanta', 'Kátia E.', 'chefe_cozinha', '2026-10-01'),
    ('butanta', 'Bruno N.', 'lider_delivery', '2026-10-01'),
    ('butanta', 'Wesley G.', 'auxiliar_cozinha', '2026-10-01'),
    ('butanta', 'Paulo D.', 'auxiliar_cozinha', '2026-10-01'),
    ('butanta', 'Leandro C.', 'auxiliar_cozinha', '2026-10-13'),
    ('butanta', 'Felipe P.', 'auxiliar_cozinha', '2026-10-01'),
    ('butanta', 'Luana A.', 'auxiliar_cozinha', '2026-09-15'),
    ('butanta', 'Lucas N.', 'auxiliar_cozinha', '2026-09-15'),
    ('butanta', 'Thiago M.', 'atendente', '2026-10-01'),
    ('butanta', 'Samuel A.', 'atendente', '2026-09-15'),
    ('butanta', 'Denise S.', 'atendente', '2026-10-01'),
    ('butanta', 'Mariana F.', 'atendente', '2026-10-01')
    ) as x(loja, nome, cargo, adm)
    join public.rede_lojas l on l.tenant_id = v_t and l.slug = x.loja;
  end if;

  -- Quadro previsto (5 lojas x 5 cargos).
  if not exists (select 1 from public.rede_rh_quadro_previsto where tenant_id = v_t) then
    insert into public.rede_rh_quadro_previsto (tenant_id, loja_id, cargo, previsto, origem)
    select v_t, l.id, x.cargo, x.previsto, 'exemplo'
    from (values
    ('brooklyn', 'gerente_loja', 1),
    ('brooklyn', 'chefe_cozinha', 1),
    ('brooklyn', 'lider_delivery', 2),
    ('brooklyn', 'auxiliar_cozinha', 13),
    ('brooklyn', 'atendente', 8),
    ('perdizes', 'gerente_loja', 1),
    ('perdizes', 'chefe_cozinha', 1),
    ('perdizes', 'lider_delivery', 2),
    ('perdizes', 'auxiliar_cozinha', 12),
    ('perdizes', 'atendente', 7),
    ('vila-mariana', 'gerente_loja', 1),
    ('vila-mariana', 'chefe_cozinha', 1),
    ('vila-mariana', 'lider_delivery', 1),
    ('vila-mariana', 'auxiliar_cozinha', 8),
    ('vila-mariana', 'atendente', 5),
    ('tatuape', 'gerente_loja', 1),
    ('tatuape', 'chefe_cozinha', 1),
    ('tatuape', 'lider_delivery', 1),
    ('tatuape', 'auxiliar_cozinha', 6),
    ('tatuape', 'atendente', 4),
    ('butanta', 'gerente_loja', 1),
    ('butanta', 'chefe_cozinha', 1),
    ('butanta', 'lider_delivery', 1),
    ('butanta', 'auxiliar_cozinha', 8),
    ('butanta', 'atendente', 5)
    ) as x(loja, cargo, previsto)
    join public.rede_lojas l on l.tenant_id = v_t and l.slug = x.loja;
  end if;

  -- Lançamentos mensais (24: 4 lojas, mai a out/2026).
  if not exists (select 1 from public.rede_rh_mensal where tenant_id = v_t) then
    insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, admissoes, desligamentos, dias_falta, dias_previstos, origem)
    select v_t, l.id, x.mes::date, x.hc, x.ad, x.de, x.fa, x.pr, 'exemplo'
    from (values
    ('brooklyn', '2026-05-01', 25, 1, 1, 13, 650),
    ('brooklyn', '2026-06-01', 24, 1, 1, 12, 624),
    ('brooklyn', '2026-07-01', 25, 1, 1, 11, 650),
    ('brooklyn', '2026-08-01', 24, 1, 1, 12, 624),
    ('brooklyn', '2026-09-01', 25, 0, 0, 11, 650),
    ('brooklyn', '2026-10-01', 25, 1, 1, 13, 650),
    ('perdizes', '2026-05-01', 22, 0, 0, 15, 572),
    ('perdizes', '2026-06-01', 21, 0, 0, 14, 546),
    ('perdizes', '2026-07-01', 23, 1, 1, 15, 598),
    ('perdizes', '2026-08-01', 21, 1, 1, 13, 546),
    ('perdizes', '2026-09-01', 22, 1, 1, 15, 572),
    ('perdizes', '2026-10-01', 21, 2, 1, 12, 546),
    ('vila-mariana', '2026-05-01', 13, 0, 0, 12, 338),
    ('vila-mariana', '2026-06-01', 14, 2, 1, 11, 364),
    ('vila-mariana', '2026-07-01', 14, 1, 1, 12, 364),
    ('vila-mariana', '2026-08-01', 12, 0, 1, 9, 312),
    ('vila-mariana', '2026-09-01', 14, 0, 1, 11, 364),
    ('vila-mariana', '2026-10-01', 13, 1, 0, 11, 338),
    ('tatuape', '2026-05-01', 10, 0, 1, 11, 260),
    ('tatuape', '2026-06-01', 10, 2, 2, 10, 260),
    ('tatuape', '2026-07-01', 10, 0, 1, 10, 260),
    ('tatuape', '2026-08-01', 11, 1, 1, 11, 286),
    ('tatuape', '2026-09-01', 11, 1, 1, 13, 286),
    ('tatuape', '2026-10-01', 9, 1, 1, 11, 234)
    ) as x(loja, mes, hc, ad, de, fa, pr)
    join public.rede_lojas l on l.tenant_id = v_t and l.slug = x.loja;
  end if;
end $$;
