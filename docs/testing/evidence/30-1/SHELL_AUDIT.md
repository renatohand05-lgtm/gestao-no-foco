# Sprint 30.1 — Shell Audit

## Problema
`DemoModeControls` (“Apresentação”: Normal / Executivo / Comercial / Tela Cheia) era renderizado **expandido** acima de todo conteúdo autenticado em `AppShell`, reduzindo área útil — especialmente em mobile.

## Correção
- Chrome **colapsado por padrão** (`defaultCollapsed`)
- Toggle com `aria-expanded` + `data-demo-chrome`
- Preferência em `sessionStorage` (`gnf_demo_chrome_expanded`)
- `DemoNavRail` só quando demo mode **active**
- Funcionalidade preservada (expandir sob demanda)

## Resultado browser
- Desktop/tablet/mobile: `collapsed` por padrão
- Expandível sob clique
- Sem scroll duplo / overlay observado nas viewports 375–1920

## Arquivos
- `components/demo/demo-mode-controls.tsx`
- `components/layout/app-shell.tsx`
