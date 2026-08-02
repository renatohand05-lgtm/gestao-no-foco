# Papéis

## Dois eixos (não misturados)

| Conceito | Fonte | Exemplo |
|----------|-------|---------|
| Membership role | `tenant_members.role` | Proprietário, Administrador, Gerente, Colaborador |
| Papel Enterprise / matriz | `lib/rbac` SYSTEM_ROLES + ROLE_PERMISSIONS | proprietario, financeiro, visualizacao… |
| Cargo organizacional | `tenant_job_titles` | Gerente Financeiro |

## UI

Aba **Papéis** mostra matriz read-only dos papéis de sistema (fonte única `lib/rbac`). Custom roles em `tenant_roles` não são sobrescritos sem migração/homologação.

## Proteções

- Último Owner não pode ser rebaixado/inativado/removido
- Mutações exigem Owner/Admin server-side (`assertEquipeAdmin`)
