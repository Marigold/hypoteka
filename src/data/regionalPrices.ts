/**
 * Regional real estate price data for Czech cities.
 *
 * Average prices per square meter (Kč/m²) for residential properties
 * in major Czech cities as of 2026. Prices reflect market conditions
 * including post-pandemic trends, interest rate impacts, and local
 * supply/demand dynamics.
 *
 * Data sources: CZSO (Czech Statistical Office), real estate market reports
 * from major brokers (Reality Mix, Sreality.cz), and local market analysis.
 */

export interface RegionalPrice {
  /** City name in Czech */
  city: string;
  /** Average price per square meter in CZK */
  pricePerSqm: number;
  /** Region/kraj for geographical context */
  region: string;
  /** Population (approximate, for context) */
  population: number;
}

/**
 * Regional price data for major Czech cities (2026).
 *
 * Prices reflect current market conditions:
 * - Prague remains most expensive (capital premium, international demand)
 * - Brno second-tier pricing (university city, tech hub)
 * - Plzeň shows growth due to industrial development
 * - Ostrava remains affordable (post-industrial transition)
 * - Regional cities (Olomouc, České Budějovice) offer middle-tier pricing
 *
 * Note: Prices are city-wide averages. Individual neighborhoods can vary
 * significantly (+/- 30-50% from average).
 */
export const regionalPrices: Record<string, RegionalPrice> = {
  prague: {
    city: 'Praha',
    pricePerSqm: 120000,
    region: 'Hlavní město Praha',
    population: 1324000,
  },
  brno: {
    city: 'Brno',
    pricePerSqm: 85000,
    region: 'Jihomoravský kraj',
    population: 382000,
  },
  ostrava: {
    city: 'Ostrava',
    pricePerSqm: 40000,
    region: 'Moravskoslezský kraj',
    population: 285000,
  },
  plzen: {
    city: 'Plzeň',
    pricePerSqm: 65000,
    region: 'Plzeňský kraj',
    population: 175000,
  },
  olomouc: {
    city: 'Olomouc',
    pricePerSqm: 55000,
    region: 'Olomoucký kraj',
    population: 100000,
  },
  ceskeBudejovice: {
    city: 'České Budějovice',
    pricePerSqm: 60000,
    region: 'Jihočeský kraj',
    population: 94000,
  },
};

/**
 * Get regional price data by city key.
 *
 * @param cityKey - Key from regionalPrices object (e.g., 'prague', 'brno')
 * @returns RegionalPrice object or undefined if not found
 */
export function getRegionalPrice(cityKey: string): RegionalPrice | undefined {
  return regionalPrices[cityKey];
}

/**
 * Calculate affordable apartment size in square meters.
 *
 * @param affordablePrice - Maximum affordable property price in CZK
 * @param cityKey - Key from regionalPrices object
 * @returns Affordable size in m² or 0 if city not found
 */
export function calculateAffordableSize(
  affordablePrice: number,
  cityKey: string
): number {
  const cityData = getRegionalPrice(cityKey);
  if (!cityData) return 0;
  return Math.floor(affordablePrice / cityData.pricePerSqm);
}

/**
 * Get all cities sorted by price (highest to lowest).
 *
 * @returns Array of [cityKey, RegionalPrice] tuples sorted by price
 */
export function getCitiesByPrice(): Array<[string, RegionalPrice]> {
  return Object.entries(regionalPrices).sort(
    (a, b) => b[1].pricePerSqm - a[1].pricePerSqm
  );
}

/**
 * Get price difference percentage between two cities.
 *
 * @param cityKey1 - First city key
 * @param cityKey2 - Second city key
 * @returns Percentage difference (positive if city1 is more expensive)
 */
export function getPriceDifference(
  cityKey1: string,
  cityKey2: string
): number | null {
  const city1 = getRegionalPrice(cityKey1);
  const city2 = getRegionalPrice(cityKey2);

  if (!city1 || !city2) return null;

  return ((city1.pricePerSqm - city2.pricePerSqm) / city2.pricePerSqm) * 100;
}
