# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Non-profit Czech-language website helping people understand mortgages, compare rent vs. buy, navigate subsidies, and make informed housing decisions. LLM-curated content with human review.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm test         # Run vitest (all tests)
npx vitest run src/lib/mortgage.test.ts  # Run a single test file
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
- `src/pages/` — Astro pages. Calculators live under `kalkulacky/`, articles under `clanky/`
- `src/layouts/BaseLayout.astro` — site-wide layout; `ArticleLayout.astro` — MDX article wrapper
- `src/components/landing/` — homepage sections (Hero, FeatureCards, HowItWorks, etc.)

### Calculator Pattern
Each calculator follows a consistent architecture:
1. **Pure calculation logic** in `src/lib/` (e.g., `mortgage.ts`, `rentVsBuy.ts`, `stressTest.ts`) — no React, easily testable
2. **React component** in `src/components/calculators/` — uses the lib functions, renders UI with Recharts
3. **Astro page** in `src/pages/kalkulacky/` — wraps the React component with `client:load`

Calculators: mortgage payment, rent-vs-buy, stress test, fixation optimizer, total cost of ownership, real estate vs stocks.

### Shared State
`src/stores/mortgage.ts` — persistent nanostores for property price, down payment %, rate, and years. These are shared across calculators via `SharedMortgageInputs` component so users don't re-enter values.

### Content (Articles)
- MDX files in `src/content/articles/` with schema defined in `src/content.config.ts`
- Required frontmatter: title, description, author, pubDate, category, keywords
- Dynamic routing via `src/pages/clanky/[...slug].astro`

### UI Components
- `src/components/ui/` — shared components: `SharedMortgageInputs`, `ResultCard`, `InfoTooltip`, `Slider`
- `src/components/subsidy/SubsidyNavigator.tsx` — subsidy eligibility wizard

## Content & Tone
- **Czech only.** Informal "tykání" style (like Airbank). Direct, no banking jargon.
- **YMYL topic** — all financial claims must cite Czech sources (CNB, CZSO, Swiss Life Hypoindex)

## Key Market Data (as of March 2026)

### Mortgage Rates
- Average rate: ~4.48% (Nov 2025), expected to rise slightly in 2026
- CNB repo rate: 3.5% (since May 2025)
- Best 3-year fixed: 4.39-4.59%

### Affordability
- Czechia requires 13.3x annual salary for a standard apartment (worst in Europe)
- Prague has 20,000+ unit housing deficit
- Rental costs in major cities 20-30% cheaper than mortgage payments

### Regulations (April 2026)
- Investment property LTV capped at 70%
- Stricter income requirements for investor mortgages
- Under-36 borrowers can still get 90% LTV

### Subsidies & Support (2026)
- Housing Support Act: 115 "Housing Contact Points" with free legal advice
- Cooperative housing (družstvo) loan interest now tax-deductible (cap CZK 150,000/yr)
- Affordable Rental Housing Program: CZK 2.25B budget, up to 80% coverage, 1-2% interest
- "Guaranteed Housing" program for vulnerable groups

## SEO Notes
- YMYL (Your Money Your Life) topic - Google scrutinizes financial content heavily
- Pure AI content sites lost all rankings in Feb 2025 (SE Ranking experiment)
- Must have: real author bios, Czech data citations (CNB, CZSO), unique calculators
- Target keywords: "hypotéka kalkulačka", "nájem vs vlastní bydlení", "státní podpora bydlení 2026"

## Competitors / Existing Tools
- hyponamiru.cz - 25,000+ mortgage combinations comparison
- banky.cz - personalized mortgage calculations
- kalkulackahypoteky.cz - simple payment calculator
- kurzy.cz - mortgage calculators
- finaram.cz - calculators + blog
- Bank calculators (KB, ČS, MONETA, Fio, Raiffeisenbank)

**Gaps we fill:** None of the above offer rent-vs-buy analysis, stress testing, fixation optimization, subsidy navigation, total cost of ownership, or educational content explaining how mortgages actually work.

## Data Sources for Calculators
- CNB (Czech National Bank) - repo rate, regulatory data
- Swiss Life Hypoindex - average mortgage rates
- CZSO (Czech Statistical Office) - housing prices, wages, inflation
- CBA Hypomonitor - mortgage market volumes
