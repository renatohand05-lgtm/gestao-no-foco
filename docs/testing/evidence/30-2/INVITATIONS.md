# Convites

## Fluxo

1. Admin cria convite (nome, e-mail, função ≠ owner, equipe/cargo opcionais, validade, mensagem).
2. Token aleatório 32 bytes → persistido só `token_hash` + `token_prefix`.
3. Link **global** `/convite/{token}` (não sob `/{tenant}/` — middleware bloquearia não-membros).
4. E-mail externo: **não fingido** (`emailSent: false` se provider ausente); link exibido uma vez ao admin.
5. Aceite: login → match de e-mail → membership via service role → auditoria → dashboard.

## Regras

- Impede convite pendente duplicado (mesmo e-mail no tenant)
- Impede convidar e-mail já membro
- Bloqueia convite como `owner`
- Cancelar / reenviar regenera token
- Listagem nunca expõe token/hash

## Schema

Depende de `tenant_invitations` (migration 30.2). Sem tabela → banner honesto “schema pendente”.
