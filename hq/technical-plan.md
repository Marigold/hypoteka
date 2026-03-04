# Hypoteka - Technical Implementation Plan

## Overview

Build a Czech mortgage education website using Astro + React islands + Tailwind CSS + TypeScript. Static-first for SEO, interactive calculators as React components.

See [business-plan.md](./business-plan.md) for full business context.

---

## Skills Installed

These Claude Code skills are installed globally and should be used during development:

```bash
# Astro framework patterns & best practices
npx skills add astrolicious/agent-skills@astro -g -y

# Tailwind design system patterns
npx skills add wshobson/agents@tailwind-design-system -g -y

# SEO audit for YMYL content
npx skills add coreyhaines31/marketingskills@seo-audit -g -y

# Programmatic SEO for calculator landing pages
npx skills add coreyhaines31/marketingskills@programmatic-seo -g -y
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Astro 5** | Static-first, excellent SEO, island architecture for interactive parts |
| Interactive | **React 19** (Astro islands) | Calculators need client-side state, `client:visible` for lazy loading |
| Styling | **Tailwind CSS v4** | Utility-first, fast iteration, good responsive support |
| Language | **TypeScript** | Type safety for calculator logic |
| Hosting | **Vercel** (free tier) or **Cloudflare Pages** | Zero cost, edge CDN, good Astro support |
| Analytics | **Plausible** or **Umami** (self-hosted) | Privacy-friendly, no cookie banner needed, GDPR compliant |
| Content | **Astro Content Collections** | Markdown/MDX articles with typed frontmatter |

---

## Project Structure

```
hypoteka/
├── hq/                          # Project management (this folder)
│   ├── business-plan.md
│   └── technical-plan.md
├── src/
│   ├── components/
│   │   ├── calculators/         # React islands (client:visible)
│   │   │   ├── RentVsBuy.tsx    # Rent vs Buy calculator
│   │   │   ├── MortgagePayment.tsx  # Monthly payment + total cost
│   │   │   └── StressTest.tsx   # Rate & income stress test
│   │   ├── ui/                  # Shared UI components (Astro + React)
│   │   │   ├── Slider.tsx       # Range input for calculator params
│   │   │   ├── Chart.tsx        # Lightweight chart (recharts or chart.js)
│   │   │   ├── ResultCard.tsx   # Calculator result display
│   │   │   └── InfoTooltip.tsx  # Contextual help tooltips
│   │   └── layout/              # Astro layout components
│   │       ├── Header.astro
│   │       ├── Footer.astro
│   │       └── Navigation.astro
│   ├── content/
│   │   └── articles/            # MDX content collection
│   │       ├── jak-funguje-hypoteka.mdx
│   │       ├── fixace-pruvodce.mdx
│   │       ├── statni-podpora-2026.mdx
│   │       ├── kolik-vydelava-banka.mdx
│   │       └── historicky-pohled.mdx
│   ├── layouts/
│   │   ├── BaseLayout.astro     # HTML head, meta, OG tags, analytics
│   │   ├── ArticleLayout.astro  # Article with TOC, author, date
│   │   └── CalculatorLayout.astro  # Calculator page with SEO description
│   ├── lib/
│   │   ├── mortgage.ts          # Core mortgage math (amortization, total cost, etc.)
│   │   ├── rentVsBuy.ts         # Rent vs buy comparison logic
│   │   ├── stressTest.ts        # Stress test scenarios
│   │   └── formatters.ts        # Czech number/currency formatting (Kč, etc.)
│   ├── pages/
│   │   ├── index.astro          # Landing page
│   │   ├── kalkulacky/
│   │   │   ├── index.astro      # Calculator overview page
│   │   │   ├── najem-vs-vlastni.astro  # Rent vs Buy
│   │   │   ├── splatka-hypoteky.astro  # Monthly payment
│   │   │   └── stresovy-test.astro     # Stress test
│   │   ├── clanky/
│   │   │   ├── index.astro      # Article listing
│   │   │   └── [...slug].astro  # Dynamic article pages from content collection
│   │   └── o-projektu.astro     # About page (author bio, disclaimers, E-E-A-T)
│   └── styles/
│       └── global.css           # Tailwind imports + custom base styles
├── public/
│   ├── og/                      # OG images for social sharing
│   ├── favicon.svg
│   └── robots.txt
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
└── CLAUDE.md                    # Already exists - project context for Claude
```

---

## Implementation Order

### Step 1: Project Setup
1. Initialize Astro project: `npm create astro@latest -- --template minimal`
2. Add integrations: `@astrojs/react`, `@astrojs/tailwind`, `@astrojs/sitemap`
3. Configure TypeScript strict mode
4. Set up base layout with Czech meta tags, OG defaults, `lang="cs"`
5. Create minimal landing page and navigation

### Step 2: Core Calculator Logic (`src/lib/`)
Build pure TypeScript functions (no UI) with tests:

**mortgage.ts:**
- `calculateMonthlyPayment(principal, annualRate, years)` → monthly payment
- `calculateAmortizationSchedule(principal, annualRate, years)` → month-by-month breakdown (principal, interest, remaining)
- `calculateTotalCost(principal, annualRate, years)` → total paid, total interest, effective cost
- `calculateBankProfit(principal, annualRate, years)` → what the bank earns vs. their funding cost

**rentVsBuy.ts:**
- `compareRentVsBuy(params)` → takes: property price, down payment, mortgage rate, mortgage years, monthly rent, rent growth rate, property appreciation, investment return rate, maintenance %, transaction costs, tax deduction
- Returns: year-by-year comparison of net worth for renting+investing vs buying
- Key insight to surface: opportunity cost of down payment

**stressTest.ts:**
- `stressTest(params)` → takes current mortgage params + stress scenarios
- Scenarios: rate increase (+1%, +2%, +3%), income drop (-20%, -50%), combination
- Returns: new monthly payment, % of income, months of emergency fund needed

### Step 3: First Calculator - Rent vs Buy (`src/components/calculators/RentVsBuy.tsx`)
- React island with `client:visible` directive
- Input panel: sliders + number inputs for all parameters
- Czech defaults pre-filled (avg Prague apartment 5M Kč, avg rate 4.5%, avg rent 18K/month)
- Output: side-by-side comparison chart (line chart showing net worth over time)
- Key takeaway sentence auto-generated: "Při těchto parametrech je výhodnější [nájem/vlastní] o X Kč za Y let"
- Shareable: URL params encode calculator state for social sharing

### Step 4: Two More Calculators
- **MortgagePayment.tsx** - Monthly payment + amortization table + total cost breakdown
- **StressTest.tsx** - Visual stress scenarios with traffic-light indicators (green/yellow/red)

### Step 5: Content Collection & Articles
- Set up Astro content collection with typed schema (title, description, author, date, category, keywords)
- Write 5 cornerstone articles in MDX (can embed calculator components)
- Article layout with: table of contents, reading time, last updated date, disclaimer, structured data (JSON-LD)

### Step 6: SEO & Launch Readiness
- Sitemap generation (`@astrojs/sitemap`)
- robots.txt
- JSON-LD structured data (Article, FAQPage, WebApplication for calculators)
- Open Graph images for each page
- Czech-specific meta: `<html lang="cs">`, proper hreflang
- Performance audit: target 95+ Lighthouse score
- Disclaimer/právní upozornění on every calculator page

---

## Key Technical Decisions

### Calculator Architecture
- **Pure logic in `src/lib/`** - testable, reusable, no UI dependency
- **React islands** - only calculators hydrate on client, rest is static HTML
- **`client:visible`** - calculators load only when scrolled into view (performance)
- **URL state** - calculator params encoded in URL for sharing (e.g., `?price=5000000&rate=4.5&rent=18000`)

### Charting
- Use **recharts** (lightweight, React-native) or **Chart.js** with react-chartjs-2
- Prefer recharts for bundle size (~40KB gzipped vs ~60KB for Chart.js)

### Czech Formatting
- All numbers in Czech format: `1 234 567 Kč` (space as thousands separator)
- Use `Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' })`
- Percentages: `4,5 %` (comma decimal, space before %)

### Content
- MDX for articles (can embed React calculator components inline)
- Frontmatter schema enforced by Astro content collections (Zod)
- Every article must have: `lastUpdated` date, `disclaimer: true`, `keywords[]`

---

## Verification

After each step, verify:
1. `npm run build` succeeds with zero errors
2. `npm run preview` serves the site locally
3. Calculator outputs match manually computed values
4. Lighthouse score ≥ 95 (Performance, Accessibility, Best Practices, SEO)
5. All pages have proper Czech lang, meta descriptions, OG tags
6. Calculators work on mobile (responsive layout)
7. URL sharing works (params round-trip correctly)

---

## Defaults for Calculators (Czech Market, March 2026)

| Parameter | Default Value | Source |
|---|---|---|
| Average mortgage rate | 4.5% | Swiss Life Hypoindex |
| Average apartment price (Prague) | 5,000,000 Kč | CZSO |
| Average apartment price (CZ) | 3,500,000 Kč | CZSO |
| Average monthly rent (Prague, 2+kk) | 18,000 Kč | Sreality/Bezrealitky |
| Average monthly rent (CZ, 2+kk) | 12,000 Kč | Sreality/Bezrealitky |
| Down payment (typical) | 20% | CNB regulation |
| Down payment (under 36) | 10% | CNB exception |
| Property appreciation (long-term avg) | 5-7%/year | CZSO historical |
| Rent growth rate | 3-5%/year | Historical CZ data |
| Stock market return (long-term avg) | 7-8%/year | MSCI World historical |
| Maintenance costs | 1% of property value/year | Industry standard |
| Mortgage tax deduction cap | 150,000 Kč/year | Czech tax law |
| Income tax rate | 15% (23% above 1,582,812 Kč) | Czech tax law 2026 |
