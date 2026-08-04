# Sprint 31.8 — REPORT FINAL

**Classificação:** **APROVADA COM RESSALVAS** (device QA / EAS fora de escopo; sem commit)
**Data:** 2026-08-04

## Arquitetura

Execução em campo no detalhe da OS Mobile, wrapping `OrdemServicoService` + `InspecaoStorageService` + schemas Web (`osChecklistUpdateSchema`, `osAnexoUploadMetaSchema`). Ver `docs/architecture/PHASE_31_8_FIELD_EXECUTION.md`.

## APIs

| Rota | Método | Uso |
|------|--------|-----|
| `.../work-orders/:id` | GET | Detail expandido |
| `.../checklist` | GET | Lista checklist |
| `.../checklist/:checklistId` | PATCH | Atualiza classificação |
| `.../anexos` | GET/POST | Galeria + upload |
| `.../anexos/:anexoId` | GET/DELETE | Signed URL / soft-delete |
| `.../assinatura` | POST | PNG → anexo entrega |

## Superfícies

| Item | Status |
|------|--------|
| OS expandida (cliente, veículo, placa, status, serviços, peças, mecânico, previsão, timeline, obs) | SIM |
| Checklist | SIM |
| Fotos (antes/durante/depois) | SIM |
| Galeria | SIM |
| Assinatura digital (evidência) | SIM |
| Anexos PDF/imagem | SIM |
| Timeline | SIM |
| Offline RO + fila metadados | SIM |

## Gates

| Gate | Resultado |
|------|-----------|
| Expo Doctor | 20/20 |
| mobile lint/typecheck/test | PASS |
| lint | 0 errors |
| build | PASS |
| rbac / RC | PASS |
| homolog-31-8 | **10 PASS / 0 FAIL** |

## Segurança

Bearer + membership + `os.visualizar`/`os.editar` · signed URLs TTL · sem URL pública permanente · offline sem blobs/tokens.

## Dependências novas (Expo SDK 57)

`expo-image-picker`, `react-native-webview` (pad de assinatura).

## Pendências não bloqueantes

- Device QA Android/iOS
- Flush real da fila offline (hoje só metadado; arquivo não fica em storage inseguro)
- Commit/push (restrito)

## Checklist final

1. Ordem de Serviço Mobile expandida: **SIM**
2. Checklist Mobile: **SIM**
3. Fotos da OS: **SIM**
4. Galeria: **SIM**
5. Assinatura Digital: **SIM**
6. Anexos: **SIM**
7. Timeline completa: **SIM**
8. Offline expandido: **SIM**
9. Segurança preservada: **SIM**
10. Expo Doctor 20/20: **SIM**
11. Pronto para commit: **SIM**
12. Pronto para Sprint 31.9: **SIM**
