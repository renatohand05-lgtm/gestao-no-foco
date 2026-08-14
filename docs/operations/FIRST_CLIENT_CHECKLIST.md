# First Client Checklist — Entrada do primeiro cliente (beta)

**Sprint 34.8.** Operacional — não é contrato jurídico. Billing permanece **FROZEN SAFE**.

## Decisão de escopo

| Modalidade | Status |
|---|---|
| Cliente beta sem cobrança | **CONTROLLED GO** (após este RC) |
| Cliente real sem cobrança | **CONTROLLED GO** (mesmo modelo do beta) |
| Cliente pago | **NO-GO** (`ASAAS_PRODUCTION_API_KEY_BLOCKER`) |

Use **tenant novo** (nunca reutilizar `teste-renato-*` / homologação). Ver [TEST_TENANTS.md](./TEST_TENANTS.md).

---

## ANTES (D-1)

- [ ] Empresa criada com slug definitivo (sem prefixo `teste-`)
- [ ] Owner definido (e-mail confirmado no Auth)
- [ ] Login do owner validado uma vez por suporte
- [ ] Plano comercial acordado **manualmente** (fora do checkout)
- [ ] Confirmar `BILLING_ENFORCEMENT` ≠ 1 e cobrança real OFF
- [ ] Confirmar Assinatura mostra mensagem de piloto (sem checkout sandbox)
- [ ] Suporte responsável nomeado (1 pessoa)
- [ ] Canal de suporte (WhatsApp/e-mail) informado ao cliente
- [ ] Backup diário Supabase confirmado no dia anterior
- [ ] Deploy production = `origin/main` (SHA anotado)
- [ ] `GET /api/health` e `/api/status` ok; `billing.frozen: true`
- [ ] Escopo beta enviado (ver [BETA_SCOPE.md](./BETA_SCOPE.md))

## DIA 1

- [ ] Login + onboarding / primeiro acesso
- [ ] Cadastro: 1 cliente, 1 produto/serviço
- [ ] 1 venda faturada (ou fluxo real acordado)
- [ ] Conferir Dashboard × venda
- [ ] Conta a receber / financeiro básico
- [ ] Estoque (se aplicável ao segmento)
- [ ] Relatório / hub Relatórios
- [ ] Convite de 1 membro (se houver equipe)
- [ ] Troca de empresa (só se multiempresa)
- [ ] Anotar `requestId` / horário de qualquer erro

## DIA 2–7

- [ ] Revisar logs (sem secrets) / health diário
- [ ] Validar relatórios com o cliente
- [ ] Coletar feedback (máx. 5 itens priorizados)
- [ ] Não alterar production sem evidência
- [ ] Não ativar Asaas production / 33.11
- [ ] Não apagar tenants de teste

## Saída do piloto (opcional)

- [ ] Decisão: continuar beta / pausar / preparar cobrança (só após key production)
- [ ] Postmortem leve se houve incidente

## Contatos internos (preencher)

| Papel | Nome |
|---|---|
| Owner comercial | |
| Suporte técnico | |
| Escalação SEV1 | |
