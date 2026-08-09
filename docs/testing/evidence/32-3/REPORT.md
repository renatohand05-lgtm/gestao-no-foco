# Sprint 32.3 — Homologação Build 118 + preparação piloto TestFlight

**Data:** 2026-08-09  
**Branch:** `main`  
**HEAD:** `012d131`  
**Classificação:** **PRONTO PARA TESTFLIGHT**

Submit **não** executado nesta sprint (confirmação prévia solicitada).

---

## 1. Identidade da Build 118

| Campo | Valor |
|-------|-------|
| version | `1.10.0` |
| build | **118** |
| profile | `production` |
| channel / environment | `production` |
| distribution | **STORE** |
| bundleIdentifier | `com.gestaonofoco.app` |
| EAS Build ID | `3c3dae74-dfcd-48bc-950e-e8edde70d438` |
| Build URL | https://expo.dev/accounts/gesto-no-foco/projects/gestao-no-foco/builds/3c3dae74-dfcd-48bc-950e-e8edde70d438 |
| Commit da build (runtime) | `4cd175d` |
| runtimeVersion | `1.10.0-pilot-32.2` |
| HEAD == origin/main | **SIM** (`012d131`) |
| Delta runtime HEAD vs commit da build | **nenhum** (`4cd175d..HEAD` sem alterações em `apps/mobile` / `lib/mobile` / packages runtime — apenas docs `012d131`) |

**Conclusão:** a Build 118 testada no iPhone corresponde ao código runtime homologado em `4cd175d`. É a **candidata principal** ao TestFlight / piloto.

---

## 2. Homologação física (iPhone)

| Teste | Resultado |
|-------|-----------|
| Abertura do app | **PASS** |
| Login | **PASS** |
| Sessão | **PASS** |
| Navegação | **PASS** |
| Início | **PASS** |
| Inteligência | **PASS** |
| Financeiro | **PASS** |
| CRM | **PASS** |
| Estoque | **PASS** |
| Operação | **PASS** |
| Perfil / Ajustes | **PASS** |
| Performance percebida | **MELHOR** que a build anterior (relato manual) |
| Sem internet | **PASS** |
| App permanece aberto/estável offline | **PASS** |
| Abas acessíveis offline | **PASS** |
| Sessão não perdida offline | **PASS** |
| Sem loop de autenticação | **PASS** |
| Sem crash | **PASS** |

**BUILD 118 · IPHONE FÍSICO: PASS · HOMOLOGAÇÃO: PASS**

### Offline (evidência — sem nova UX nesta sprint)

Durante o teste sem internet: app aberto, sessão ativa, abas acessíveis, sem crash, sem loop.  
Mensagem futura do tipo “Sem conexão — exibindo dados carregados anteriormente” = melhoria opcional, **não blocker**.

---

## 3. Gates finais (sessão 32.3)

| Gate | Resultado |
|------|-----------|
| `mobile:doctor` | **20/20 PASS** |
| `mobile:lint` | **PASS** |
| `mobile:typecheck` | **PASS** |
| `mobile:test` | **PASS** (0 FAIL) |
| Produção `/api/health` | **200** |
| `/api/mobile/v1/memberships` sem token | **401** |

---

## 4. TestFlight / piloto

| Item | Status |
|------|--------|
| Build 118 válida para App Store / TestFlight (`distribution: STORE`) | **SIM** |
| Candidata ao TestFlight | **Build 118** |
| `eas submit` nesta sprint | **NÃO** |
| App Store Review / publicação pública | **NÃO** |
| Nova build (119) | **NÃO** |
| Piloto interno preparado | **SIM** — `docs/pilot/PILOT_01.md` (alvo Build 118) |
| Usuários externos adicionados automaticamente | **NÃO** |

---

## 5. Próxima ação (humana)

Quando Renato autorizar o envio ao App Store Connect (TestFlight interno apenas):

```powershell
cd apps\mobile
npx eas-cli@latest submit --platform ios --id 3c3dae74-dfcd-48bc-950e-e8edde70d438 --profile production
```

Depois no App Store Connect: TestFlight → teste **interno** → convites manuais.  
**Não** enviar para App Review nesta etapa.
