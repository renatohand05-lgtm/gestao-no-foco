# Equipes / departamentos e cargos

## Equipes (`tenant_teams`)

CRUD + status active/inactive/archived + líder + presets multissetoriais via `getOrgTeamLabels(segment)` (não hardcoded nas páginas).

| Segmento | Presets (exemplos) |
|----------|-------------------|
| oficina | Mecânica, Atendimento, Peças… |
| comércio | Vendas, Caixa, Estoque… |
| restaurante | Salão, Cozinha, Delivery… |
| serviços | Profissionais, Atendimento, Operação… |
| consultoria | Consultores, Projetos, Comercial… |
| fallback | Departamento, Operação, Comercial, Administrativo |

**Separado** da nav operacional `/oficina/mecanicos` (equipe técnica de OS).

## Cargos (`tenant_job_titles`)

Nome, descrição, nível, equipe opcional, papel membership sugerido, status — conceito distinto de papel RBAC e de equipe.
