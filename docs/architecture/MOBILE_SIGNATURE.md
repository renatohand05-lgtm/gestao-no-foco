# Mobile Signature — Sprint 31.8

Assinatura digital = evidência visual, **não** certificado jurídico.

## Fluxo

1. Cliente desenha no pad (WebView canvas)
2. Pré-visualização PNG
3. Confirmar → `POST .../assinatura`
4. Persistido como anexo `etapa=entrega`, `legenda=Assinatura do cliente`

Reutiliza `InspecaoStorageService.uploadAnexo` — sem schema novo.
