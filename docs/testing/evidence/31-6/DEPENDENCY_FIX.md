# Sprint 31.6 — DEPENDENCY_FIX

## Antes

Expo Doctor **19/20**:

| Pacote | Esperado | Encontrado |
|--------|----------|------------|
| react-native-gesture-handler | ~2.32.0 | **3.1.0** (major) |
| expo | ~57.0.10 | 57.0.9 |
| expo-constants | ~57.0.9 | 57.0.8 |
| expo-image | ~57.0.2 | 57.0.1 |
| expo-linking | ~57.0.5 | 57.0.4 |
| expo-router | ~57.0.10 | 57.0.9 |
| expo-updates | ~57.0.12 | 57.0.11 |

## Ações

1. `cd apps/mobile && npx expo install --fix`
2. `npm install` na raiz
3. Override monorepo: `"react-native-gesture-handler": "2.32.0"` (dedupe peer 3.1.0 de drawer-layout)
4. Lockfile alinhado a uma única cópia 2.32.0

## Depois

| Pacote | Resolvido |
|--------|-----------|
| react-native-gesture-handler | **2.32.0** |
| expo | ~57.0.10 |
| expo-constants | ~57.0.9 |
| expo-image | ~57.0.2 |
| expo-linking | ~57.0.5 |
| expo-router | ~57.0.10 |
| expo-updates | ~57.0.12 |

**Expo Doctor: 20/20 PASS**

Não foi usado `expo.install.exclude`.
