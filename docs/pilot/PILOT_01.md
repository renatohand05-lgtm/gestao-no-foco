# Piloto controlado 01 — Gestão no Foco Mobile

**Versão alvo:** 1.10.0 · **Build 118** (homologada no iPhone — `docs/testing/evidence/32-3/REPORT.md`)  
**EAS Build ID:** `3c3dae74-dfcd-48bc-950e-e8edde70d438`  
**Canal:** TestFlight interno / production (STORE)  
**Status:** candidata pronta para submit TestFlight — **não** adicionar usuários reais automaticamente; submit sob autorização humana

## Objetivo

Validar estabilidade, RBAC, qualidade de dados e UX em uso real limitado, sem App Review pública.

## Duração

7–14 dias corridos (ajustável).

## Usuários / empresas

| Papel | Qtd sugerida | Critério |
|-------|--------------|----------|
| Owner/admin | 1–2 | tenant real de homologação |
| Operacional | 1–3 | OS / estoque |
| Financeiro/CRM (opcional) | 0–2 | se módulo liberado |

Empresas: **somente tenants já existentes** autorizados pelo responsável.  
Convites manuais via App Store Connect / TestFlight — sem automação neste doc.

## Módulos liberados

- Início / Dashboard  
- Inteligência  
- Financeiro (leitura)  
- CRM (leitura)  
- Estoque (leitura)  
- Operação (leitura + fluxos já nativos)  
- Perfil / Ajustes / Face ID / troca empresa-filial  

Fora: mutações pesadas só via Web quando o app abrir portal.

## Critérios de sucesso

- Login + Face ID sem loop  
- Nenhum Access Denied indevido para owner/admin  
- KPIs: erro ≠ zero; empty válido distinguível  
- Zero crash recorrente no cold start  
- Offline: sem perda de sessão por rede  
- Feedback de erros compreensível  

## Critérios de interrupção

- Vazamento de secret / token em log  
- Cross-tenant comprovado  
- Regressão de sessão/permissões (sintoma Build 116)  
- Crash rate impedindo uso diário  
- Inconsistência financeira grave Web×Mobile  

## Canal de suporte

Responsável interno (definir nome/contato no kickoff).  
Canal: WhatsApp/e-mail interno + evidências anexas.

## Como reportar erro

1. Screenshot + horário  
2. Build number (Ajustes)  
3. Empresa / filial (nome, sem IDs sensíveis em canal aberto)  
4. Passos para reproduzir  
5. Se possível: `requestId` se aparecer em tela de erro futura  

## Evidências necessárias

- Checklist `docs/pilot/PILOT_01_CHECKLIST.md` preenchido  
- Logs sanitizados (sem token)  
- Comparativo Web×Mobile financeiro se divergência  
