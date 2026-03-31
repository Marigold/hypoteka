# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Personal Czech-language website helping people understand mortgages, compare rent vs. buy, navigate subsidies, and make informed housing decisions. AI-generated content with human review.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm test         # Run vitest (all tests)
npx vitest run src/lib/mortgage.test.ts  # Run a single test file

# To keep dev server alive in agent/CLI context:
nohup npm run dev > /tmp/hypoteka-dev.log 2>&1 &
```

## Tech Stack

- **Framework:** Astro 5 + React islands (interactive calculators) + MDX (articles)
- **Styling:** Tailwind CSS v4 + DaisyUI v5 + @tailwindcss/typography
- **State:** Nanostores with `@nanostores/persistent` (localStorage-backed)
- **Charts:** Recharts
- **Testing:** Vitest + Testing Library
- **Language:** TypeScript, Czech only content

## Architecture

### Page Structure

- `src/pages/` — Astro pages. Calculators under `kalkulacky/`, articles under `clanky/`, subsidy wizard under `podpora/`
- `src/layouts/BaseLayout.astro` — site-wide layout with disclaimer banner; `ArticleLayout.astro` — MDX article wrapper; `CalculatorLayout.astro` — calculator pages
- `src/components/landing/` — homepage sections (Hero, FeatureCards, HowItWorks, SubsidyTeaser, TrustBar)

### Calculator Pattern

Each calculator follows a consistent architecture:

1. **Pure calculation logic** in `src/lib/` (e.g., `mortgage.ts`, `rentVsBuy.ts`, `stressTest.ts`) — no React, easily testable
2. **React component** in `src/components/calculators/` — uses the lib functions, renders UI with Recharts
3. **Astro page** in `src/pages/kalkulacky/` — wraps the React component with `client:load`

Calculators: mortgage payment, rent-vs-buy, stress test, fixation optimizer, total cost of ownership, real estate vs stocks, affordability, regulation 2026 guide.

### Shared State

`src/stores/mortgage.ts` — persistent nanostores for property price, down payment %, rate, and years. Shared across calculators via `SharedMortgageInputs` component.

### Content (Articles)

- MDX files in `src/content/articles/` with schema defined in `src/content.config.ts`
- Required frontmatter: title, description, author, pubDate, category, keywords
- Dynamic routing via `src/pages/clanky/[...slug].astro`
- Internal links in MDX are automatically prefixed with the base URL by `src/plugins/rehype-base-url.ts`

### UI Components

- `src/components/ui/` — shared components: `SharedMortgageInputs`, `ResultCard`, `InfoTooltip`, `Slider`
- `src/components/subsidy/SubsidyNavigator.tsx` — subsidy eligibility wizard
- `src/components/regulation/RegulationGuide.tsx` — 2026 regulation interactive guide

### Icons

- **Material Symbols Outlined** (loaded via Google Fonts in `BaseLayout.astro`)
- Use class `material-symbols-outlined` — **not** `material-icons`

### Internal Links

All internal links must be base-path-aware for GitHub Pages (`/hypoteka`):

- **Astro files:** use `url()` helper from `src/lib/url.ts` — e.g., `href={url('/kalkulacky')}`
- **React/TSX files:** use `` `${import.meta.env.BASE_URL.replace(/\/$/, '')}/path` ``
- **MDX content:** plain Markdown links work — `rehype-base-url` plugin prefixes them automatically

### Deployment

- Hosted on GitHub Pages via `.github/workflows/deploy.yml`
- Push to `main` triggers automatic build and deploy
- Live at `https://marigold.github.io/hypoteka/`

### Legal Disclaimer

Single unified disclaimer in `Footer.astro` — do **not** add per-page or per-calculator disclaimers.

## Content & Tone

- **Czech only.** Informal "tykání" style. Direct, no banking jargon.
- **YMYL topic** — all financial claims should cite Czech sources (ČNB, ČSÚ, Swiss Life Hypoindex)
- The project targets **individuals**, not institutions or organizations

## Data Sources for Calculators

- ČNB (Czech National Bank) — repo rate, regulatory data
- Swiss Life Hypoindex — average mortgage rates
- ČSÚ (Czech Statistical Office) — housing prices, wages, inflation
- CBA Hypomonitor — mortgage market volumes
