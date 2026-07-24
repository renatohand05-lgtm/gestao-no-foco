# Brand Guide — Gestão

**Sprint 19 · Gate 19.0.1 — Brand System Oficial**

Identidade visual da plataforma. Não define regras de negócio.

---

## 1. Identidade

| Elemento | Valor oficial |
|----------|----------------|
| **Nome** | Gestão |
| **Subtítulo** | Plataforma de Gestão Inteligente |
| **Slogan** | Controle • Estratégia • Resultados |
| **Edição** | Enterprise |

Arquivo canônico: `config/brand.ts`  
Site: `config/site.ts` (consome `brandConfig`)

---

## 2. Logo

### Principal (`BrandLogo`)

- Monograma **G** (grafite + dourado) + wordmark **Gestão**
- Uso: sidebar expandida, login, loading/splash, marketing header/footer

### Reduzido (`BrandMark`)

- Apenas o monograma **G**
- Uso: sidebar recolhida, header, mobile, favicon, PWA

### Assets

| Arquivo | Uso |
|---------|-----|
| `/brand/logo.svg` | Logo completo |
| `/brand/mark.svg` | Marca reduzida |
| `/favicon.svg` | Favicon vetorial |
| `/favicon.ico` | Favicon legado |
| `/apple-touch-icon.png` | iOS / PWA |
| `app/icon.tsx` / `app/apple-icon.tsx` | Geração Next.js |

**Componentes React:** `@/components/brand` → `BrandLogo`, `BrandMark`, `BrandSplash`

---

## 3. Paleta oficial

Usar **somente** estas cores:

| Token | Hex | Uso |
|-------|-----|-----|
| Preto Grafite | `#1A1C1E` | Texto, chrome escuro, monograma fundo |
| Dourado Premium | `#C9A84C` | Acento, primary, CTAs de destaque, monograma |
| Branco | `#FFFFFF` | Fundo, cards |
| Cinza Claro | `#F4F4F5` | Sidebar, canvas, muted |
| Cinza Escuro | `#3F3F46` | Texto secundário |
| Success | `#16A34A` | Positivo |
| Warning | `#D97706` | Atenção |
| Danger | `#DC2626` | Crítico / erro |
| Info | `#5B6B7A` | Informativo neutro |

CSS: `--brand-*` em `app/globals.css`  
Tokens DS: `gofColors` / `exColors` / `brandPalette`

**Proibido:** azul legado (`#2563eb`), roxo info, cores fora da lista em chrome de marca.

---

## 4. Tipografia

| Papel | Fonte | Variável CSS |
|-------|-------|----------------|
| Display / títulos | **Space Grotesk** | `--font-display` |
| Corpo / UI | **Inter** | `--font-sans` |
| Mono / dados | **JetBrains Mono** | `--font-mono` |

Carregadas via `next/font/google` em `app/layout.tsx`.

---

## 5. Ícones

- **Somente Lucide** (`lucide-react`)
- Stroke padrão ~1.75 em navegação
- Ativo na sidebar: dourado

---

## 6. Browser / PWA

| Item | Valor |
|------|--------|
| `<title>` | Gestão |
| Description | Plataforma de Gestão Inteligente |
| Open Graph / Twitter | summary + nome + subtítulo |
| Theme color | `#1A1C1E` |
| Apple status bar | `default` / capable |
| Manifest | `/manifest.webmanifest` |
| Short name | Gestão |

---

## 7. Loading / Splash

Componente: `BrandSplash`

- Centro: logo + nome + subtítulo + Enterprise
- Slogan
- Barra de progresso discreta (dourado)
- Fade-in suave (`motion-safe`)
- Aplicado em: `app/loading.tsx`, auth loading, tenant loading (refresh / troca de área)

---

## 8. Aplicações

| Superfície | Tratamento |
|------------|------------|
| Login | Painel grafite + ouro, logo, slogan, paleta |
| Sidebar | Logo / mark, edition Enterprise, menu refinado |
| Header | Mark + nome · tenant, busca, usuário |
| Marketing | Header/footer com BrandLogo |

**Fora deste Gate:** Dashboard, CRM, Estoque, Comercial, IA, Centro de OS (sem refactor de telas).

---

## 9. Uso correto

```tsx
import { BrandLogo, BrandMark, BrandSplash } from "@/components/brand";
import { brandConfig, brandPalette } from "@/config/brand";

<BrandLogo showEdition />
<BrandMark size="sm" />
```

- Preferir `--brand-*` / `gofColors` a hex soltos.
- Manter Lucide.
- Splash só para loading institucional.

---

## 10. Uso incorreto

- Renomear a marca para “Gestão no Foco” na UI (nome oficial = **Gestão**)
- Introduzir azul/roxo/neon no chrome
- Misturar outras famílias tipográficas
- Ícones não-Lucide na navegação
- Animação exagerada no splash
- Alterar services/SQL “por branding”

---

## 11. Arquivos-chave

```
config/brand.ts
config/site.ts
components/brand/*
app/layout.tsx
app/globals.css
public/favicon.svg
public/favicon.ico
public/apple-touch-icon.png
public/manifest.webmanifest
public/brand/*.svg
BRAND_GUIDE.md
```

---

## 12. Showcase (Gate 19.5)

Rota interna: `/{tenant}/design-system` (owner/admin).  
Documentação de tokens e componentes oficiais sem dados de negócio.
