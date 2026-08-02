# Gestão de membros

**Rota:** `/{tenant}/configuracoes/equipe` (aba Membros)

## Capaz de

- Listar membros (service role após gate Owner/Admin ou `usuarios.visualizar`)
- Buscar por nome/e-mail
- Filtrar por status
- Exibir nome, e-mail, iniciais/avatar, status, papel (label amigável), equipe/cargo quando schema ok
- Alterar papel (membership)
- Ativar / inativar (quando coluna `status` existe)
- Remover acesso
- Proteção de último Owner (guards server-side)

## Labels

`owner→Proprietário`, `admin→Administrador`, `manager→Gerente`, `member→Colaborador` — sem UUID/enum cru no face.
