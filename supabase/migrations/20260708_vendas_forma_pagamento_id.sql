-- Migration: integração vendas ↔ formas_pagamento
-- Execute manualmente no Supabase SQL Editor
-- Requer: formas_pagamento

alter table public.vendas
  add column if not exists forma_pagamento_id uuid
    references public.formas_pagamento (id) on delete set null;

create index if not exists idx_vendas_forma_pagamento_id
  on public.vendas (forma_pagamento_id);

comment on column public.vendas.forma_pagamento_id is
  'Referência à forma de pagamento cadastrada no financeiro';
comment on column public.vendas.forma_pagamento is
  'Legado: slug ou nome denormalizado para compatibilidade com vendas antigas';
