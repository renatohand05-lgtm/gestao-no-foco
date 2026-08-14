# Migration Checklist — Production

Obrigatório antes de aplicar SQL em production (padrão 34.2 / 34.3).

## Antes

- [ ] Backup diário confirmado no Supabase (ou snapshot manual)
- [ ] PITR status anotado (**hoje: NOT ENABLED**)
- [ ] Migration revisada (sem `DROP`/destructive inesperado)
- [ ] Idempotente quando possível
- [ ] Smoke SQL / queries de validação preparados
- [ ] Rollback conhecido (ou restore point)
- [ ] App Web compatível se schema mudar
- [ ] Renato aplica **manualmente** (agente não executa production)

## Durante

- [ ] Aplicar no SQL Editor / migration runner do projeto **production**
- [ ] Anotar horário UTC

## Depois

- [ ] Reload schema (API) se necessário
- [ ] Rodar smoke estrutural (policies, constraints)
- [ ] Smoke app: login → dashboard → módulo afetado
- [ ] Registrar evidência em `docs/testing/evidence/<sprint>/`
- [ ] Se falha: **não** empilhar migrations; seguir recovery

## Proibido

- Destructive SQL sem aprovação
- Execução automática pelo agente em production
- Alterar Asaas / billing envs “de passagem”
