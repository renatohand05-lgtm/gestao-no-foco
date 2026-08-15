# Arquitetura de segmentação (Sprint 35.0)

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
visível = relevante(segmento + override) AND autorizado(RBAC)
```

Capability **nunca** concede permissão. RBAC **nunca** é substituído pela segmentação.

## Persistência

Campos em `tenants` (aditivos):

- `segment` — já existia (text, nullable)
- `segment_version` — `NULL` = comportamento legado (pré-35.0)
- `segment_config` — jsonb `{ enabledCapabilities, disabledCapabilities, terminology }`

Tenant sem segmento ou com `segment_version` nulo continua com a navegação atual.

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

## Os 6 segmentos de produto

`oficina` · `barbearia` · `lava_rapido` · `consultoria` · `clinica_estetica` · `consultorio_odontologico`

Aliases: `auto_center` → oficina; `odontologia` → consultório.

`patient_records` e `treatment_plans` existem como capabilities futuras — **desligadas**. Sem prontuário clínico nesta sprint.

Nav: `filterNavByCapabilities` combina capability do item **ou** `recommendedNavIds` do perfil (atalhos como equipe da barbearia no módulo existente de profissionais). RBAC aplica depois.

## Como adicionar um novo segmento

1. Incluir id em `PRODUCT_SEGMENT_IDS` (`lib/segments/types.ts`).
2. Criar perfil em `lib/segments/profiles.ts` (capabilities, terminologia, presets 34.9).
3. Mapear alias em `lib/segments/resolve.ts` se necessário.
4. Adicionar ao catálogo de onboarding `config/onboarding/segments.ts` + setup/templates.
5. Testes em `scripts/phase35-0-segment-architecture-tests.mjs`.

Não copiar módulos. Só estender o perfil.

## Financeiro

Presets usam chaves de `lib/financeiro/despesa-presets.ts` / catálogo 34.9. Sem duplicar categorias. Sem inventar IDs.

## Compatibilidade

| Caso | Comportamento |
|---|---|
| Tenant legado sem segmento | UX atual (oficina-like na nav de equipe/OS) |
| `consultoria` sem `segment_version` | UX atual até escolha explícita |
| Tenant novo / onboarding 35.0 | `segment_version = 1` + capabilities |
| Mobile | `segment` continua no payload; motor é puro e reutilizável |
| Cross-tenant | Resolver é função pura dos campos do tenant |

## Billing

Intocado.
