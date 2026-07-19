# Gate 2 — Inspeção Digital 13.19.3 (após aprovação CTO)

**Pré-condição:** Gate 1 revisado e aprovado formalmente.  
**Proibido:** aplicar migration sem essa aprovação.

## 1. Aplicar schema (manual)

No SQL Editor do Supabase (tenant de teste):

1. Abrir `supabase/migrations/20260724_digital_vehicle_inspection.sql`
2. Executar o script completo
3. Confirmar bucket `os-inspecao` (Storage → Buckets)
4. Confirmar RPCs: `inspecao_publica_por_token`, `inspecao_publica_detalhes`, `inspecao_publica_aprovar`  
   - Se erro `digest(...) does not exist`, aplicar `20260724_fix_inspecao_publica_rpc.sql`

## 2. Variáveis de ambiente (server)

```env
SUPABASE_SERVICE_ROLE_KEY=<service_role — nunca no client>
# opcional
INSPECAO_IP_SALT=<salt para hash de IP>
# e-mail (quando existir)
RESEND_API_KEY=...
# ou SMTP_HOST / EMAIL_PROVIDER
```

Reiniciar o processo Next.js após alterar env.

## 3. Chromium (PDF)

```bash
npm run install:chromium
```

## 4. Os 30 testes obrigatórios

Executar checklist em `docs/testing/INSPECAO_DIGITAL_30_TESTES_13_19_3.md` e/ou:

```bash
npm run test:inspecao-gate2
```

Cobertura mínima:

1. Checklist classificações (bom/atenção/crítico/…)  
2. Upload foto por item + preview signed URL  
3. Soft-delete anexo  
4. Upload MIME inválido rejeitado  
5. Upload >5MB rejeitado  
6. Diagnóstico com `observacoes_cliente`  
7. Publicar orçamento v1 (sem gerar CR/estoque)  
8. Diff v1→v2 após revisão  
9. Gerar link / copiar  
10. WhatsApp deep-link abre com mensagem (sem marcar “enviado”)  
11. E-mail mostra “não configurado” se sem provider  
12. Página pública carrega com placa mascarada  
13. Token inválido → erro  
14. Token expirado → erro  
15. Token revogado → erro  
16. Aprovação total  
17. Aprovação parcial  
18. Reprovar → volta revisão orçamento  
19. Contato (sem decidir itens)  
20. Aceite do aviso obrigatório  
21. Evidência imutável em `ordem_servico_aprovacoes`  
22. Itens não aprovados não executáveis no fluxo atual  
23. PDF gera com aviso + versão  
24. Midia pública só com token válido  
25. Outro tenant não vê dados via token alheio  
26. Rate limit responde após excesso  
27. DRE inalterado (smoke rota + sem lançamentos novos indevidos)  
28. Fluxo de caixa inalterado  
29. Faturamento só via motor `faturar` existente  
30. `npm run audit:schema -- --live` + lint + build  

## 5. Comandos finais

```bash
npm run audit:schema -- --live
npm run lint
npm run build
```

**Atenção:** não rodar `next build` com `next dev` compartilhando o mesmo `.next`.

## 6. Relatório final

Documentar em `docs/testing/evidence/13-19-3/`:

- Data/hora da aplicação da migration  
- Confirmação service role configurada  
- Resultado dos 30 testes  
- Confirmação explícita: DRE / Fluxo / estoque / faturamento preservados  
