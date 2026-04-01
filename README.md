# Hypotéka.cz

> ⚠️ **Rozpracovaný projekt.** Obsah byl z velké části vygenerován pomocí AI a neprošel kompletní kontrolou. Může obsahovat chyby — nepoužívejte pro finanční rozhodování.

Osobní projekt, který se snaží srozumitelně vysvětlit, jak fungují hypotéky v Česku. Kalkulačky, články a průvodce státní podporou.

**→ [Živá verze](https://marigold.github.io/hypoteka/)**

## Co tu najdeš

### Kalkulačky

| Kalkulačka | Popis |
|---|---|
| **Splátka hypotéky** | Měsíční splátka, celkové náklady, amortizační plán |
| **Nájem vs. vlastní** | Porovnání nájmu s investováním vs. koupě na hypotéku |
| **Stresový test** | Co se stane, když vyletí sazby nebo klesne příjem |
| **Optimalizace fixace** | Porovnání různých fixačních období |
| **Celkové náklady vlastnictví** | Fond oprav, pojištění, daň, údržba — celkový účet |
| **Nemovitost vs. akcie** | Investice do nemovitosti vs. akciový trh |
| **Kolik si můžu půjčit** | Dostupnost hypotéky podle příjmu a pravidel ČNB |
| **Regulace 2026** | Interaktivní průvodce novými pravidly od dubna 2026 |

### Články

- Jak funguje hypotéka
- Nájem vs. vlastní bydlení
- Průvodce fixací
- Kolik vydělává banka na tvé hypotéce
- Provize realitního makléře
- Státní podpora bydlení 2026

### Průvodce státní podporou

Interaktivní dotazník, který ti pomůže zjistit, na jakou podporu máš nárok.

## Tech stack

- [Astro 5](https://astro.build/) + React islands + MDX
- [Tailwind CSS v4](https://tailwindcss.com/) + [DaisyUI v5](https://daisyui.com/)
- [Recharts](https://recharts.org/) — grafy
- [Nanostores](https://github.com/nanostores/nanostores) — sdílený stav mezi kalkulačkami
- [Vitest](https://vitest.dev/) — testy

## Spuštění

```bash
npm install
npm run dev       # Dev server
npm run build     # Produkční build
npm run preview   # Náhled produkčního buildu
npm test          # Testy
```

Vyžaduje Node.js 22+.

## Struktura projektu

```
src/
├── components/
│   ├── calculators/    # React kalkulačky
│   ├── landing/        # Sekce homepage
│   ├── layout/         # Header, Footer
│   ├── regulation/     # Průvodce regulací
│   ├── subsidy/        # Průvodce státní podporou
│   └── ui/             # Sdílené komponenty (Slider, ResultCard, …)
├── content/articles/   # MDX články
├── layouts/            # Astro layouty
├── lib/                # Výpočetní logika (čistý TS, bez Reactu)
├── pages/              # Astro stránky a routing
├── plugins/            # Rehype plugin pro base URL
├── stores/             # Nanostores (sdílený stav)
└── styles/             # Tailwind globální styly
```

Každá kalkulačka má tři vrstvy:
1. **Čistá logika** v `src/lib/` — snadno testovatelná, bez UI
2. **React komponenta** v `src/components/calculators/` — UI + grafy
3. **Astro stránka** v `src/pages/kalkulacky/` — obalí React komponentu

## Zdroje dat

- [ČNB](https://www.cnb.cz) — repo sazba, regulace
- [Swiss Life Hypoindex](https://www.hypoindex.cz) — průměrné hypoteční sazby
- [ČSÚ](https://www.czso.cz) — ceny nemovitostí, mzdy, inflace

## Licence

[MIT](LICENSE)
