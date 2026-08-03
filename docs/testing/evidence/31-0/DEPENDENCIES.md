# Sprint 31.0 — DEPENDENCIES

## Mobile (Expo SDK ~57)

| Pacote | Uso | Ativado |
|--------|-----|---------|
| expo / react-native / react | runtime | SIM |
| expo-router | navegação | SIM |
| expo-secure-store | tokens | SIM (mock) |
| expo-splash-screen | splash | SIM |
| expo-linking / constants / device / application | plataforma | SIM |
| expo-network | offline status | SIM |
| expo-image | imagens | preparado |
| @tanstack/react-query | data fetching | SIM |
| zustand | sessão/tenant | SIM |
| zod / RHF | forms + env | SIM |
| AsyncStorage | prefs não sensíveis | SIM |
| expo-notifications | push | NÃO (contrato) |
| expo-camera / local-auth / file-system / updates | adapters | NÃO |

## Packages @gof/*

design-tokens, domain, schemas, api-contracts, rbac-contracts, config, utils

## Risco

Duplicate `react` 19.2.3 (mobile) vs 19.2.4 (root) — esperado sem workspaces npm. Mitigado em 31.1 com workspaces/Turborepo.
