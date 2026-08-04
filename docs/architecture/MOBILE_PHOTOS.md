# Mobile Photos — Sprint 31.8

Fotos da OS reutilizam `InspecaoStorageService` e o bucket `os-inspecao`.

## Captura

- `expo-image-picker` (câmera/galeria)
- Compressão via `quality: 0.55`
- Upload JSON base64 autenticado (Bearer)

## Etapas (existentes)

| Intent field | `OsAnexoEtapa` |
|--------------|----------------|
| Antes | `entrada`, `antes_desmontagem` |
| Durante | `execucao`, `diagnostico` |
| Depois | `conclusao`, `entrega` |
| Outras | `outro` |

MIME: JPEG/PNG/WebP/PDF · máx. 5MB.
