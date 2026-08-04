# Sprint 31.8 — BASELINE

**Data:** 2026-08-04
**Branch:** `main` (sync `origin/main` em `f377f31`)
**Missão:** Execução em campo — fotos, checklists, assinatura, anexos (reuso Web).

## Estado pré-implementação

| Check | Resultado |
|-------|-----------|
| Sprint 31.7 | Preservada (working tree local, sem commit) |
| Expo Doctor | **20/20** |
| Conflitos | Não |
| Ahead/behind | 0 / 0 vs origin no HEAD publicado |

## Reuso confirmado

| Capacidade | Fonte Web |
|------------|-----------|
| OS detail | `OrdemServicoService.getById` |
| Checklist | `updateChecklistItem` + `ordem_servico_checklist` |
| Fotos/anexos | `InspecaoStorageService` (`os-inspecao` bucket) |
| Signed URL | `createSignedUrl` (não URL pública permanente) |
| Etapas | `OsAnexoEtapa` existente (entrada/execucao/conclusao/…) |
| Aceite entrega | timestamps (assinatura = PNG como anexo `entrega`) |

## Gaps a fechar (wrap only)

- DTO mobile sem checklist / URLs / etapa
- UI detail não renderiza photos
- Sem mutações mobile (upload/checklist/delete)
- Sem `expo-image-picker` (camera/FS já no package)

## Fora de escopo

Commit, push, deploy, EAS, SQL, migrations, IA, alteração Web/RBAC/fórmulas.
