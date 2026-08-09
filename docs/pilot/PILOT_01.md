# Piloto controlado 01 — Gestão no Foco Mobile

**Baseline estável:** 1.10.0 · **Build 118** (homologada — `docs/testing/evidence/32-3/REPORT.md`)  
**EAS Build 118:** `3c3dae74-dfcd-48bc-950e-e8edde70d438`  
**Candidata visual (32.4):** Build **119** (se gerada) — polimento tab bar / contraste; homologar no iPhone antes do TestFlight  
**Canal:** TestFlight interno / production (STORE)  
**Status:** piloto controlado — **não** App Review pública; convites manuais

## Objetivo

Validar estabilidade, RBAC, qualidade de dados, UX e **legibilidade visual** (tab bar) em uso real limitado.

## Duração

7–14 dias corridos (ajustável).

## Usuários internos

| Papel | Qtd sugerida | Critério |
|-------|--------------|----------|
| Owner/admin | 1–2 | tenant real de homologação |
| Operacional | 1–3 | OS / estoque |
| Financeiro/CRM (opcional) | 0–2 | se módulo liberado |

Empresas: **somente tenants já existentes** autorizados pelo responsável.  
Convites manuais via App Store Connect / TestFlight — sem automação.

## Módulos liberados

- Início / Dashboard  
- Inteligência  
- Financeiro (leitura)  
- CRM (leitura)  
- Estoque (leitura)  
- Operação (leitura + fluxos já nativos)  
- Perfil / Ajustes / Face ID / troca empresa-filial  

## Critérios de sucesso

- Login + Face ID sem loop  
- Nenhum Access Denied indevido para owner/admin  
- KPIs: erro ≠ zero; empty válido distinguível  
- Zero crash recorrente no cold start  
- Offline: sem perda de sessão por rede  
- Feedback de erros compreensível  
- **Tab bar:** ativo óbvio; inativo legível; safe area OK  

## Feedback a coletar

| Área | Perguntas |
|------|-----------|
| Visual | Tab bar legível? Ativo claro? Inativo não parece desabilitado? |
| Performance | Cold start / navegação aceitável? |
| Funcional | Módulos abrem? Sessão estável? Offline ok? |

Usar também `docs/testing/evidence/32-4/VISUAL_CHECKLIST.md`.

## Bugs bloqueantes (interrupção)

- Vazamento de secret / token em log  
- Cross-tenant comprovado  
- Regressão de sessão/permissões  
- Crash rate impedindo uso diário  
- Inconsistência financeira grave Web×Mobile  
- Tab bar ilegível após “polimento”  

## Canal de suporte

Responsável interno (definir no kickoff). WhatsApp/e-mail + screenshots.

## Evidências

- `docs/pilot/PILOT_01_CHECKLIST.md`  
- Checklist visual 32.4  
- Logs sanitizados  
