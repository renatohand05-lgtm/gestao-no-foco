# Recovery Runbook — Banco / Storage

**Sprint 34.6.** Complementa `docs/pilot/PRODUCTION_RECOVERY.md`.

## Estado confirmado

| Item | Status | Nota |
|---|---|---|
| Backup diário Supabase | **PASS** | Confirmado manualmente (34.2) |
| PITR | **NOT ENABLED** | Add-on disponível; **não ativar automaticamente** |
| Restore E2E testado | **NÃO** | Não declarar testado sem evidência |

## Impacto da ausência de PITR

- Recuperação limitada ao **último backup diário** (ou snapshot manual).
- Janela de perda possível: até ~24h (depende do horário do backup).
- Risco residual **aceito para piloto interno**; decisão comercial futura se cliente pago exigir PITR.

## Cenários

### A) Dado apagado acidentalmente (registro)

1. Parar writes no fluxo afetado se possível.
2. Identificar `tenant_id`, `user_id`, `record_id`, horário UTC.
3. Preferir **restore lógico** (soft undelete / reinserção controlada) se o domínio suportar.
4. Restore de projeto **somente** se impacto for amplo e aprovado.

### B) Migration ruim

1. Não aplicar novas migrations.
2. Avaliar se código Web é compatível com schema antigo.
3. Se necessário: restore para ponto **anterior** à migration (backup diário / snapshot).
4. Reload schema API no Supabase.
5. Smoke: login + SELECT no tenant de teste + módulo afetado.

### C) Corrupção lógica

1. Isolar tenant/módulo.
2. Exportar evidência (IDs, contagens).
3. Corrigir com SQL revisado + checklist de migration.
4. Restore completo só se corrupção for sistêmica.

### D) Tenant afetado

1. Confirmar memberships ativas do usuário.
2. **Nunca** “consertar” trocando `tenant_id` sem validação cruzada.
3. Preferir correção de membership/role/status documentada.

### E) Incidente global

1. Manutenção ON se necessário.
2. Comunicar SEV1.
3. Restore de projeto conforme Dashboard → Database → Backups.
4. Validar antes de apontar tráfego de volta.

## Procedimento de restore (alto nível)

1. Dashboard Supabase production → **Database → Backups**.
2. Escolher ponto **antes** do incidente.
3. Restore (projeto inteiro — downtime possível).
4. Settings → API → reload schema.
5. Validar: `/api/health`, login, dashboard, um módulo core.
6. Código Vercel: rollback só se o deploy (não só o SQL) for a causa.

## Storage

- Delete de arquivo no Storage CRM costuma ser **definitivo** se não houver versionamento no bucket.
- Confirmar no painel se o plano inclui backup de Storage.
- Não inventar undelete de objeto se a API não oferecer.

## NÃO fazer nesta sprint

- Não executar restore real
- Não apagar dados reais de teste de cliente
- Não comprar/ativar PITR automaticamente
