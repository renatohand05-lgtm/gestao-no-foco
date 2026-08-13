# ASAAS_PRODUCTION_API_KEY_BLOCKER

**Status:** BLOCKED EXTERNALLY  
**Sprint:** 33.10

## Fatos

- Conta Asaas Production aprovada
- KYC aprovado
- Painel production operacional (`asaas.com`, não sandbox)
- Botão "Gerar chave de API" desabilitado/cinza
- Suporte Asaas acionado, sem resposta até o momento

## Impede

- provisionamento real de credencial production
- cutover
- microtransação
- cobrança real

## Não impede

- testes locais e sandbox
- build
- observabilidade
- segurança
- documentação
- código do webhook production
- preparação de rollback

## Regras

Não obter a key por outro canal.  
Não usar chave sandbox em production.  
Não alterar Vercel.  
`ASAAS_ENV=sandbox`. `BILLING_REAL_CHARGES_ENABLED` OFF.
