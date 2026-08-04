# Fase 31.8 — Execução em Campo (Mobile)

**Princípio:** wrap das APIs/services Web de inspeção digital — sem migrations, sem novas regras.

## Arquitetura

```
Expo OS detail
  ├─ checklist  → PATCH .../checklist/:id  → OrdemServicoService.updateChecklistItem
  ├─ fotos      → POST  .../anexos         → InspecaoStorageService.uploadAnexo
  ├─ galeria    → GET signed URL          → createSignedUrl (TTL curto)
  ├─ assinatura → POST .../assinatura     → uploadAnexo etapa=entrega
  └─ anexos     → mesmo bucket os-inspecao
```

## Segurança

Bearer + membership + `os.visualizar` / `os.editar`. URLs assinadas temporárias — sem URL pública permanente.
