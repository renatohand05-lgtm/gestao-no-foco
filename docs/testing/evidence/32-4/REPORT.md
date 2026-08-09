# Sprint 32.4 — Polimento visual tab bar + piloto + App Store readiness

**Data:** 2026-08-09  
**Classificação:** **APROVADA COM RESSALVAS** (homologação visual no iPhone pendente)

Ressalva: contraste/tab bar validados por tokens + gates; **teste físico da Build 119 obrigatório** antes do TestFlight.

---

## Checklist

| # | Item | Resultado |
|---|------|-----------|
| 1 | Build baseline | **118** (`3c3dae74-dfcd-48bc-950e-e8edde70d438`) |
| 2 | Tab bar corrigida | **SIM** — inactive tint explícito + tokens + ícones |
| 3 | Contraste ativo | **goldSoft** (dark) / **goldDeep** (light) |
| 4 | Contraste inativo | **silver** / `#4A5563` — legível, ≠ disabled |
| 5 | Safe area | altura iOS 88 + padding; RN aplica home indicator |
| 6 | Dark mode | tokens `gofTabBar.dark` |
| 7 | Light mode | tokens `gofTabBar.light` |
| 8 | Acessibilidade | `tabBarAccessibilityLabel`, font scaling, minHeight 44 |
| 9 | Ícones | Ionicons filled/outline por rota |
| 10 | Labels | 11pt/600; nomes curtos mantidos |
| 11 | Telas revisadas | tab layout + tokens; empty title já usava `text` |
| 12 | Regressão funcional | gates/navigation estrutural PASS — física na 119 |
| 13 | Doctor | **20/20** |
| 14 | lint | **PASS** |
| 15 | typecheck | **PASS** |
| 16 | tests | **PASS** (38/0 mobile + phase32-2) |
| 17 | export iOS | **PASS** (`npx expo export --platform ios --clear`) |
| 18 | piloto atualizado | `docs/pilot/PILOT_01.md` |
| 19 | App Store readiness | `docs/app-store/READINESS.md` |
| 20 | Screenshots planejadas | `docs/app-store/SCREENSHOTS.md` |
| 21 | nova build necessária | **SIM** (runtime visual) |
| 22 | build gerada | **119** FINISHED |
| 23 | Build ID | `8c5c68d1-9325-4a68-833d-c8d794cd7390` |
| 24 | commit SHA | runtime `bea9d98` · evidence `56d7980` |
| 25 | HEAD == origin/main | **SIM** |
| 26 | blockers | Homologação visual iPhone da 119 |
| 27 | próxima ação | 🟡 TESTAR NO IPHONE PRIMEIRO |

---

## Build 119

| Campo | Valor |
|-------|-------|
| Version | 1.10.0 |
| Build | **119** |
| Profile | production |
| Channel | production |
| Status | FINISHED |
| EAS ID | `8c5c68d1-9325-4a68-833d-c8d794cd7390` |
| URL | https://expo.dev/accounts/gesto-no-foco/projects/gestao-no-foco/builds/8c5c68d1-9325-4a68-833d-c8d794cd7390 |
| IPA | https://expo.dev/artifacts/eas/RYTBzDK6dZMiXav-s_rox7t1s4Jqw34wYBRBs5ertv4.ipa |
| Runtime | `1.10.0-visual-32.4` |
| Integrity | `32.4` |
| Created | 2026-08-09T19:29:42.827Z |
| Completed | 2026-08-09T19:35:25.247Z |

**TestFlight:** NÃO ENVIADO nesta sprint.

---

## Causa do “apagado”

`tabBarInactiveTintColor` **não estava definido** → default do React Navigation com baixo contraste sobre `surface` graphite/navy.

## Alterações

- `packages/design-tokens`: `gofTabBar`
- `apps/mobile/src/design/tab-bar.ts` + `TabBarIcon.tsx`
- `app/(app)/_layout.tsx` — opções + ícones + a11y
- `@expo/vector-icons`
- runtime `1.10.0-visual-32.4` / integrity `32.4`
- Docs: pilot, App Store readiness/screenshots, checklist visual

## Próxima ação humana

1. Instalar Build **119** no iPhone (Ad Hoc / internal distribution ou via EAS).
2. Validar checklist `docs/testing/evidence/32-4/VISUAL_CHECKLIST.md`.
3. Regressão funcional rápida (login → módulos → offline).
4. Só então, se autorizado: submit TestFlight da Build 119.
