# Dashboard Drag & Drop — Workspace Editor

Sprint 13.7 — Advanced Drag & Drop Workspace

## Escopo

Apenas UX do **Workspace Editor** (lista de blocos). Persistência da Sprint 13.6 permanece intacta: reordenar só muda o estado local; gravação ocorre só ao **Salvar**.

Fora de escopo: banco, migration, RLS, services de persistência, DRE/Fluxo/Financeiro, BI/EI, Prediction, Timeline, Copilot, Action Center/Plan, cálculos e filtros de negócio.

## Auditoria (antes)

| Item | Situação |
|------|----------|
| Engine | HTML5 `draggable` no handle em `executive-layout-editor.tsx` |
| Reorder | `move` / `moveTo` via `layout-context` → `layout-engine` |
| Teclado | Botões subir/descer; sem captura Espaço/Enter no handle |
| Touch | Frágil / sem long-press |
| Persistência | Dirty fingerprint; save explícito |
| Libs DnD | Nenhuma |

Riscos de regressão mitigados: não alterar formato `layout_data`; não auto-save; preview continua sem editor; botões de ação com `stopPropagation` no pointer.

## Arquitetura escolhida

**Pointer Events + teclado**, sem biblioteca nova.

| Camada | Arquivo | Papel |
|--------|---------|--------|
| Helpers puros | `lib/dashboard-layout/layout-dnd.ts` | `computeInsertIndex`, `insertIndexToMoveTarget`, thresholds |
| Hook | `components/executive/layout/use-layout-dnd.ts` | fases, ghost, auto-scroll, Escape, aria announce |
| UI | `components/executive/layout/executive-layout-editor.tsx` | handle, placeholder/linha, ghost, tool buttons |

Motivo de **não** adicionar `@dnd-kit` / similar: o caso de uso é lista vertical com ~10 blocos; HTML5 estava insuficiente para touch/a11y, mas Pointer Events cobrem mouse + touch + teclado com bundle zero e integração direta com `moveTo`.

## Eventos

### Mouse / trackpad

1. `pointerdown` no handle → fase `pending` + `setPointerCapture`
2. Movimento ≥ 6px → `dragging` (ghost + linha de inserção)
3. `pointermove` atualiza ghost e `insertIndex` (rects via `[data-dnd-item]`)
4. Bordas da viewport → auto-scroll (`requestAnimationFrame`)
5. `pointerup` → `moveTo` se índice mudou; animação `dropSettle`
6. `Escape` → cancela sem commit

### Touch / pen

1. Long-press (~380ms) inicia drag; vibração opcional se `navigator.vibrate` existir
2. Movimento antes do long-press > 10px → cancela pending (permite scroll da página)
3. Controles ↑/↓ permanecem como fallback acessível

### Teclado

| Tecla | Ação |
|-------|------|
| Enter / Espaço (idle) | Captura item (`keyboard`) |
| ↑ / ↓ | Move linha de inserção |
| Enter / Espaço (keyboard) | Confirma |
| Escape | Cancela |

Anúncios em `aria-live="assertive"`. Handle focável; `aria-grabbed` enquanto arrasta.

## Persistência (contrato 13.6)

1. Usuário move → `moveTo` local  
2. Fingerprint marca dirty → “Alterações não salvas”  
3. Sem gravação por pixel / sem polling  
4. **Salvar** persiste ordem  
5. **Cancelar/Descartar** restaura layout hidratado  
6. Conflito de versão inalterado  
7. Falha de rede mantém local e permite retry  

## Preview

Com `studioView === "preview"` (ou fora de `editMode`), o editor retorna `null`: sem handles, sem linhas, sem ghost — canvas mostra o layout final.

## Performance

- Helpers puros fora do React  
- `phaseRef` evita estado stale sob capture  
- Ghost atualiza só posição (`setGhost` parcial)  
- Rects lidos só em move / begin (não em cada frame de scroll além do tick rAF)  
- Lista pequena; sem Virtualizer necessário  
- Página do dashboard permanece Server Component + island do workspace

## Estados visuais

idle · hover · focused (ring) · grabbed/keyboard · dragging (opacidade + ghost) · valid drop (linha azul) · saving / saved / unsaved / error (toolbar + caption do editor)

## Fallback

Se o ambiente não permitir Pointer Events de forma confiável, **Mover para cima/baixo** no card continua disponível e dispara o mesmo `move` / dirty tracking.

## Limitações

- Sem grid 2D / coordenadas absolutas por breakpoint  
- Ghost não clona o conteúdo completo do card (card resumido)  
- Auto-scroll usa `window`, não um scroller interno do editor  
- Touch exige long-press (por design, para não conflitar com scroll)

## Testes manuais sugeridos

- Primeiro → último; último → primeiro; adjacentes  
- Escape cancela  
- Salvar + reload + logout/login + outro browser  
- Touch long-press + scroll cancel  
- Teclado captura/setas/Enter/Escape  
- Ocultar / duplicar / prioridade sem iniciar drag  
- Preview sem UI de editor  
- Conflito de versão e falha de rede ao salvar  
