# Checkpoint 31.9-release — DEPENDENCIES

**Data:** 2026-08-04

| Check | Resultado |
|-------|-----------|
| Expo Doctor | **20/20** |
| Expo SDK | 57 (workspace `@gof/mobile`) |
| `expo-camera` | Presente (~57) — scanner 31.9 |
| `expo-image-picker` | Presente — fotos 31.8 |
| `react-native-webview` | Presente — assinatura 31.8 |
| `react-native-gesture-handler` | Compatível com SDK 57 (Doctor OK) |
| React duplicado no mobile workspace | Não reportado pelo Doctor |
| `apps/mobile/node_modules` aninhado | Presente como link/workspace; Doctor OK |
| Peer conflicts críticos | Nenhum (Doctor 20/20) |
| package-lock | Sincronizado com alterações mobile |
| Migration nova neste checkpoint | Nenhuma |

Dependências adicionadas nas sprints 31.7–31.9 são usadas pelas telas/APIs correspondentes (sem dependência órfã detectada no Doctor).
