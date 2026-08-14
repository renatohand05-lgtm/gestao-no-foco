-- Sprint 34.9 — Catálogo mínimo de formas de pagamento para Contas a Pagar
-- Aditiva / idempotente / sem DELETE.
-- Preserva linhas legadas (CREDITO, DEBITO, DINHEIRO, PIX).
-- NÃO executar automaticamente em production — Renato aplica após revisão.

-- Helper: normaliza nome para comparação (sem acento, lower)
create or replace function public._gof_norm_forma_nome(p text)
returns text
language sql
immutable
as $$
  select lower(
    translate(
      coalesce(p, ''),
      'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
    )
  );
$$;

do $$
declare
  r record;
  v_exists boolean;
begin
  for r in
    select t.id as tenant_id
    from public.tenants t
  loop
    -- PIX
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and (
          public._gof_norm_forma_nome(fp.nome) in ('pix')
          or fp.tipo = 'pix'
        )
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'PIX', 'pix', true, true, 0);
    end if;

    -- Cartão de crédito (legado CREDITO cobre)
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and (
          public._gof_norm_forma_nome(fp.nome) in ('credito', 'cartao de credito', 'cartao credito')
          or fp.tipo = 'cartao_credito'
        )
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Cartão de crédito', 'cartao_credito', true, true, 0);
    end if;

    -- Cartão de débito (legado DEBITO cobre)
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and (
          public._gof_norm_forma_nome(fp.nome) in ('debito', 'cartao de debito', 'cartao debito')
          or fp.tipo = 'cartao_debito'
        )
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Cartão de débito', 'cartao_debito', true, true, 0);
    end if;

    -- Dinheiro
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and (
          public._gof_norm_forma_nome(fp.nome) in ('dinheiro', 'especie')
          or fp.tipo = 'dinheiro'
        )
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Dinheiro', 'dinheiro', true, true, 0);
    end if;

    -- Transferência bancária (TED coberto por alias)
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and (
          public._gof_norm_forma_nome(fp.nome) in ('transferencia', 'transferencia bancaria', 'ted', 'transf')
          or fp.tipo = 'transferencia'
        )
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Transferência bancária', 'transferencia', true, true, 0);
    end if;

    -- Boleto
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and (
          public._gof_norm_forma_nome(fp.nome) = 'boleto'
          or fp.tipo = 'boleto'
        )
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Boleto', 'boleto', true, true, 0);
    end if;

    -- Débito automático
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and public._gof_norm_forma_nome(fp.nome) in ('debito automatico')
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Débito automático', 'outros', true, true, 0);
    end if;

    -- Depósito bancário
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and public._gof_norm_forma_nome(fp.nome) in ('deposito', 'deposito bancario')
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Depósito bancário', 'outros', true, true, 0);
    end if;

    -- Débito em conta
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and public._gof_norm_forma_nome(fp.nome) in ('debito em conta', 'dcc')
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Débito em conta', 'outros', true, true, 0);
    end if;

    -- Guia / código de barras
    select exists(
      select 1 from public.formas_pagamento fp
      where fp.tenant_id = r.tenant_id and fp.deleted_at is null
        and (
          public._gof_norm_forma_nome(fp.nome) like '%guia%'
          or public._gof_norm_forma_nome(fp.nome) like '%codigo de barras%'
        )
    ) into v_exists;
    if not v_exists then
      insert into public.formas_pagamento (tenant_id, nome, tipo, ativo, gera_financeiro, dias_compensacao)
      values (r.tenant_id, 'Guia / código de barras', 'outros', true, true, 0);
    end if;
  end loop;
end $$;

comment on function public._gof_norm_forma_nome(text) is
  'Sprint 34.9 — normaliza nome de forma de pagamento para match idempotente';
