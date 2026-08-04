# Mobile Scanner

Implementação: `expo-camera` (`CameraView` + `onBarcodeScanned`).

## Fluxo

1. Usuário abre `/scanner`
2. Permissão solicitada no momento
3. Código lido (QR / EAN / Code128…) ou entrada manual (placa/SKU)
4. `interpretScanPayload` — bloqueia URL externa; deep link interno allowlisted; senão termo de busca
5. Busca segura (online)
6. Usuário **confirma** abertura

## Segurança

- Sem upload automático
- Sem gravar imagem do scan
- Sem log do código
- Câmera desativada após leitura (`active=false`)
- Offline: resolução remota bloqueada

## QA device

Homologação de câmera em device **não executada** nesta máquina — contratos e testes estáticos apenas.
