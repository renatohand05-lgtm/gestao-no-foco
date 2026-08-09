# App Store Readiness — Gestão no Foco Mobile

**Status:** preparação documental — **não** enviar App Review nesta sprint.  
**Baseline homologada:** 1.10.0 Build **118** · candidata visual: Build desta sprint (se gerada).

## Metadados sugeridos

| Campo | Valor sugerido |
|-------|----------------|
| Nome | Gestão no Foco |
| Subtítulo | ERP operacional no bolso |
| Categoria principal | Business |
| Categoria secundária | Productivity |
| Copyright | © RENATO FRANCO |
| Classificação etária | 4+ (sem conteúdo restrito) |
| Bundle ID | `com.gestaonofoco.app` |

### Descrição (rascunho)

Gestão no Foco leva o painel executivo da sua empresa para o iPhone: dashboard, inteligência, financeiro, CRM, estoque e operação — com permissões alinhadas ao portal web, Face ID opcional e uso estável offline limitado.

### Palavras-chave (rascunho)

erp,gestao,oficina,financeiro,crm,estoque,operacao,dashboard,negocio

### URLs

| Tipo | URL |
|------|-----|
| Suporte | https://gestao-no-foco.vercel.app (ou página de suporte dedicada quando existir) |
| Privacidade | https://gestao-no-foco.vercel.app/privacidade (confirmar rota publicada) |
| Marketing | https://gestao-no-foco.vercel.app |

## App Privacy (declaração)

Coletar apenas o necessário à autenticação e operação:

- Contato (e-mail de conta) — Account Authentication  
- Identifiers (User ID) — App Functionality  
- Dados de uso / diagnóstico — se telemetria remota for ativada no futuro  

Não vender dados. Tokens não saem em logs.

## Permissões Info.plist (já no app)

| Permissão | Uso |
|-----------|-----|
| Face ID | Desbloquear app (opt-in) |
| Câmera | Scanner / fotos de OS |
| Fotos | Anexos de OS |
| Push | Preparado (expo-notifications) — validar uso real antes do Review |
| Encryption | `ITSAppUsesNonExemptEncryption = false` |

## Compliance

- Contas / login reais (Supabase Auth)  
- Sem conteúdo gerado por usuário público  
- TestFlight interno antes de Review  

## Checklist pré-Review (futuro)

- [ ] Screenshots 6.7" / 6.5" / 5.5"  
- [ ] Política de privacidade acessível publicamente  
- [ ] Conta demo para revisores (se necessário)  
- [ ] Revisar permissões não usadas  
- [ ] Build production atual no ASC  
