# Arquitetura de segmentação (Sprint 35.0 + 35.1)

Uma empresa só — vários modelos de negócio. Não há ERPs separados nem módulos duplicados.

## Conceitos

| Conceito | O que é | O que não é |
|---|---|---|
| **segment** | Preset inteligente persistido em `tenants.segment` | Prisão permanente / RBAC |
| **capability** | Capacidade de produto (`vehicles`, `crm`, …) | Permissão de segurança |
| **preset** | Perfil inicial (módulos, labels, financeiro) | Dados fictícios inseridos |
| **override** | `tenants.segment_config` do próprio tenant | Configuração global |
| **RBAC** | Autoridade de acesso (roles/permissões) | Relevância de UX |

Regra de exibição:

```
visível = relevante(preset + override) AND autorizado(RBAC) AND módulo real
```

Capability **nunca** concede permissão. RBAC **nunca** é substituído pela segmentação.
Desativar módulo **esconde** a experiência — **não apaga dados**.

## Persistência

Campos em `tenants` (aditivos, Sprint 35.0):

- `segment` — já existia (text, nullable)
- `segment_version` — `NULL` = comportamento legado (pré-35.0)
- `segment_config` — jsonb `{ enabledCapabilities, disabledCapabilities, terminology }`

Sprint 35.1 **não** adicionou migration: o JSON já cobre override/reset.

Sprint 35.2 adiciona `customer_returns`, `customer_retention`, `customer_notifications` (presets em todos os segmentos). Agenda continua em `appointments`. Ver `docs/product/APPOINTMENTS_AND_RETENTION.md`.

## Motor

Fonte única: `lib/segments/`.

```ts
import { resolveSegmentContext, hasCapability } from "@/lib/segments";

const ctx = resolveSegmentContext({
  segment: tenant.segment,
  segmentVersion: tenant.segment_version,
  segmentConfig: tenant.segment_config,
});

if (hasCapability(ctx, "vehicles")) { /* ... */ }
```

Não espalhar `if (segment === 'oficina')` nos componentes.

UI de override: `/[tenant]/configuracoes/modulos` (owner/admin). Server action exige `configuracoes.editar` ou `configuracoes.tenant`.

`patient_records`, `treatment_plans` e `projects` são future — não ligam pela UI.

## Os 6 segmentos de produto

`oficina` · `barbearia` · `lava_rapido` · `consultoria` · `clinica_estetica` · `consultorio_odontologico`

Aliases: `auto_center` → oficina; `odontologia` → consultório.

Nav: `filterNavByCapabilities` usa as capabilities resolvidas (preset + override). Itens essenciais (`dashboard`, `search`, `settings`) não somem.

Equipe reusa o cadastro `mecanicos`. Oficina abre `/oficina/mecanicos` (Mecânicos). Barbearia, lava-rápido e demais segmentos com motor ligado abrem `/profissionais` (Barbeiros / Profissionais) — **sem duplicar tabelas**.

Lava-rápido reusa `ordens_servico` como **Atendimentos** (checklist no mesmo backend). Copy de apresentação vive em `lib/segments/copy.ts`.

## Sprint 35.1

Override no próprio `segment_config` (sem migration nova). UI: Configurações → Personalizar experiência.

Biblioteca inicial de serviços (`lib/segments/catalogs/`): templates por segmento, montados pela página via `buildCatalogPickerView` (mesma função dos testes). Descoberta: empty state **Montar catálogo inicial**, hub **Sugestões do segmento**, onboarding com o mesmo CTA. Nada é persistido no `createTenant`. Deduplicação por nome normalizado. Form de catálogo lê `getSegmentFormConfig`. Lava-rápido usa tipos de atendimento sobre `tipo_ordem` (sem engine paralela) e checklist próprio na tabela `ordem_servico_checklist`. Preço não é imposto pela biblioteca.

Reset remove overrides; desativar módulo não apaga dados. Alterar o tipo de negócio aplica o novo preset; overrides compatíveis podem ser preservados se o usuário confirmar.

Mobile: `memberships.modules` + atalhos de operação filtrados por capability.

Financeiro: `orderDespesaPresetsForSegment` só reordena o catálogo 34.9.

Dashboard: cards de OS/estoque some quando a capability correspondente está off. Sem KPIs inventados.

## Como adicionar um novo segmento

1. Incluir id em `PRODUCT_SEGMENT_IDS` (`lib/segments/types.ts`).
2. Criar perfil em `lib/segments/profiles.ts`.
3. Mapear alias em `lib/segments/resolve.ts` se necessário.
4. Adicionar ao catálogo de onboarding + gaps em `lib/segments/gaps.ts`.
5. Testes `scripts/phase35-1-segment-presets-tests.mjs`.

## Compatibilidade

| Caso | Comportamento |
|---|---|
| Tenant legado sem `segment_version` | UX atual |
| Tenant 35.0/35.1 | preset + override |
| Mobile | `memberships.modules` + atalhos de operação filtrados |
| Cross-tenant | resolver puro + update só no `tenant.id` da sessão |

## Billing

Intocado.
