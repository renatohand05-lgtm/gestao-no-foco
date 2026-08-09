# Processo oficial de release — Mobile + Web

Evitar builds aleatórias sem evidência.

```
código
  → gates (doctor, lint, typecheck, tests, export se mobile)
  → commit objetivo
  → push main
  → Vercel Ready (se Web/API)
  → preview build (EAS profile preview) quando UI/device
  → homologação iPhone/Android
  → production build (EAS profile production, store)
  → TestFlight interno
  → piloto controlado
  → App Review (somente com decisão explícita)
```

## Regras

1. Toda build production referencia commit SHA + evidence folder.  
2. Regressão de sessão/RBAC bloqueia avanço.  
3. Documentação-only **não** gera nova build store.  
4. Runtime mobile → nova build number (autoIncrement) + homologação.  
5. Nunca enfraquecer RBAC/RLS para “passar” piloto.  
6. Submit App Store público exige aprovação humana explícita.
