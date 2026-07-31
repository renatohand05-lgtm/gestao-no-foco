# Sprint 26.1 — Antes × Depois (estrutural)

Base: commit `81c2c11`.

## Hierarquia PremiumDashboardView

### Antes
1. ExecutiveDashboardHeader  
2. PremiumKpiStrip (simétrico)  
3. PremiumMainRow  
4. PremiumOpsStrip  
5. PremiumDisclosure  

### Depois
1. ExecutiveDashboardHeader  
2. **ExecutiveBrief** (novo)  
3. PremiumKpiStrip **dominant / v2**  
4. PremiumMainRow (**authorial** + intel sem scroll)  
5. PremiumOpsStrip  
6. PremiumDisclosure (Command Center compacto no slot IA)

## Markers

| Antes | Depois |
|-------|--------|
| `data-dashboard-premium-v257` | + `data-dashboard-premium-v261` |
| — | `data-cockpit-hierarchy="brief-kpi-chart-ops"` |
| — | `data-brand-continuity="dashboard"` |
| — | `data-kpi-dominant` / `data-premium-kpis="v2"` |
| — | `data-chart-authorial` / `data-chart-panel="authorial"` |
| — | `data-intel-no-scroll` |
| — | `data-command-center-compact="1"` |

Screenshots “depois”: PNGs nesta pasta. “Antes” pixel não arquivado — ver REPORT.md §7.
