-- Migration: garantir forma_pagamento_id + FK em vendas
-- Execute manualmente no Supabase SQL Editor
-- Requer: formas_pagamento
--
-- Contexto: 20260708_vendas_forma_pagamento_id.sql usa
--   ADD COLUMN IF NOT EXISTS ... REFERENCES ...
-- Se a coluna já existia sem FK, o IF NOT EXISTS pula a adição e a
-- constraint nunca é criada.

begin;

alter table public.vendas
  add column if not exists forma_pagamento_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendas_forma_pagamento_id_fkey'
      and conrelid = 'public.vendas'::regclass
  ) then
    alter table public.vendas
      add constraint vendas_forma_pagamento_id_fkey
      foreign key (forma_pagamento_id)
      references public.formas_pagamento (id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_vendas_forma_pagamento_id
  on public.vendas (forma_pagamento_id);

comment on column public.vendas.forma_pagamento_id is
  'Forma de pagamento escolhida na venda';

commit;

notify pgrst, 'reload schema';
