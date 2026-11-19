-- Rodada 19: dados de EXEMPLO de talentos (Nine Box e nota de liderança) para a empresa de demonstração.
-- Origem = 'exemplo' em todos os registros. Só toca na empresa "fat-buddha-demo" e só em colaboradores que já são
-- de exemplo: se a empresa não existir, não faz nada. Reaplicar não duplica. NUNCA entra na empresa real.
-- As notas são as do painel original (desempenho e potencial de 1 a 3; liderança de 0 a 5, em out/2026, o mês dos dados de vendas da demonstração).
do $$
declare
  v_t uuid;
begin
  select id into v_t from public.tenants where slug = 'fat-buddha-demo' and rede_operacional;
  if v_t is null then
    return;
  end if;

  insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial, origem)
  select v_t, c.loja_id, c.id, x.d, x.p, 'exemplo'
  from (values
    ('brooklyn', 'Breno F.', 3, 3),
    ('brooklyn', 'Cristiano E.', 3, 3),
    ('brooklyn', 'João A.', 3, 2),
    ('brooklyn', 'Vanessa F.', 2, 2),
    ('brooklyn', 'André E.', 3, 2),
    ('brooklyn', 'Cíntia L.', 3, 3),
    ('brooklyn', 'Letícia H.', 2, 3),
    ('brooklyn', 'Flávia S.', 2, 3),
    ('brooklyn', 'Priscila L.', 2, 2),
    ('brooklyn', 'Ingrid V.', 3, 2),
    ('brooklyn', 'Hugo P.', 3, 3),
    ('brooklyn', 'Giovana H.', 2, 3),
    ('brooklyn', 'Débora S.', 3, 1),
    ('brooklyn', 'Rayane E.', 2, 1),
    ('brooklyn', 'Leonardo C.', 2, 2),
    ('brooklyn', 'Karina P.', 3, 2),
    ('brooklyn', 'Murilo T.', 1, 3),
    ('brooklyn', 'Elaine M.', 1, 2),
    ('brooklyn', 'Sérgio B.', 3, 3),
    ('brooklyn', 'Natália A.', 1, 2),
    ('brooklyn', 'Camila M.', 2, 2),
    ('brooklyn', 'Tiago B.', 3, 3),
    ('brooklyn', 'Paula M.', 2, 2),
    ('brooklyn', 'Emerson P.', 2, 2),
    ('perdizes', 'Marcos O.', 3, 2),
    ('perdizes', 'Talita D.', 3, 2),
    ('perdizes', 'Jéssica R.', 1, 2),
    ('perdizes', 'Yasmin T.', 3, 3),
    ('perdizes', 'Fernanda D.', 3, 2),
    ('perdizes', 'Matheus A.', 2, 2),
    ('perdizes', 'Carla F.', 3, 2),
    ('perdizes', 'Jorge H.', 3, 3),
    ('perdizes', 'Tatiane G.', 2, 2),
    ('perdizes', 'Fábio E.', 3, 1),
    ('perdizes', 'Daniela C.', 2, 2),
    ('perdizes', 'Gabriela G.', 2, 2),
    ('perdizes', 'Pedro M.', 2, 3),
    ('perdizes', 'Patrícia J.', 2, 1),
    ('perdizes', 'Fabiana L.', 2, 2),
    ('perdizes', 'Nathan G.', 3, 1),
    ('perdizes', 'Kleber D.', 1, 2),
    ('perdizes', 'Rodrigo N.', 3, 3),
    ('perdizes', 'Douglas F.', 1, 2),
    ('perdizes', 'Rafael F.', 2, 3),
    ('perdizes', 'Vitor T.', 3, 3),
    ('perdizes', 'Nicole H.', 2, 3),
    ('vila-mariana', 'Elias G.', 2, 2),
    ('vila-mariana', 'Sabrina M.', 2, 3),
    ('vila-mariana', 'Aline D.', 3, 2),
    ('vila-mariana', 'Helena V.', 3, 1),
    ('vila-mariana', 'Bárbara N.', 1, 2),
    ('vila-mariana', 'Bianca J.', 2, 2),
    ('vila-mariana', 'Ana B.', 1, 1),
    ('vila-mariana', 'Juliana S.', 1, 2),
    ('vila-mariana', 'Mônica R.', 2, 2),
    ('vila-mariana', 'Vinícius T.', 2, 1),
    ('vila-mariana', 'Otávio T.', 2, 3),
    ('vila-mariana', 'Larissa G.', 1, 2),
    ('vila-mariana', 'Joice G.', 1, 2),
    ('tatuape', 'Michele A.', 1, 2),
    ('tatuape', 'Renata S.', 2, 1),
    ('tatuape', 'Gustavo O.', 1, 1),
    ('tatuape', 'Sueli S.', 2, 3),
    ('tatuape', 'Everton J.', 2, 2),
    ('tatuape', 'Diego E.', 1, 3),
    ('tatuape', 'Igor H.', 1, 2),
    ('tatuape', 'Wagner T.', 2, 3),
    ('tatuape', 'Eduarda P.', 1, 2),
    ('tatuape', 'Henrique F.', 1, 1),
    ('butanta', 'Isabela T.', 2, 3),
    ('butanta', 'Kátia E.', 3, 2),
    ('butanta', 'Bruno N.', 2, 3),
    ('butanta', 'Wesley G.', 2, 2),
    ('butanta', 'Paulo D.', 2, 2),
    ('butanta', 'Leandro C.', 1, 3),
    ('butanta', 'Felipe P.', 2, 3),
    ('butanta', 'Luana A.', 2, 3),
    ('butanta', 'Lucas N.', 2, 1),
    ('butanta', 'Thiago M.', 2, 1),
    ('butanta', 'Samuel A.', 2, 1),
    ('butanta', 'Denise S.', 2, 2),
    ('butanta', 'Mariana F.', 3, 2)
  ) as x(loja_slug, nome, d, p)
  join public.rede_lojas l on l.tenant_id = v_t and l.slug = x.loja_slug
  join public.rede_rh_colaboradores c on c.tenant_id = v_t and c.loja_id = l.id and c.nome = x.nome and c.origem = 'exemplo' and c.status = 'ativo'
  on conflict (colaborador_id) do nothing;

  insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota, origem)
  select v_t, c.loja_id, c.id, date '2026-10-01', x.nota, 'exemplo'
  from (values
    ('brooklyn', 4.6),
    ('perdizes', 4.2),
    ('vila-mariana', 3.5),
    ('tatuape', 2.8)
  ) as x(loja_slug, nota)
  join public.rede_lojas l on l.tenant_id = v_t and l.slug = x.loja_slug
  join public.rede_rh_colaboradores c on c.tenant_id = v_t and c.loja_id = l.id and c.cargo = 'gerente_loja' and c.origem = 'exemplo' and c.status = 'ativo'
  on conflict (colaborador_id, mes) do nothing;
end $$;
