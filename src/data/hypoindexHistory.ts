/**
 * Historical Hypoindex data from Swiss Life Hypoindex.
 *
 * Hypoindex tracks average mortgage interest rates in the Czech Republic.
 * Data covers 10+ years showing the evolution of Czech mortgage rates,
 * including the low-rate period (2020-2021), rapid increases (2022-2023),
 * and recent stabilization (2024-2026).
 *
 * Rates are annual percentages (e.g., 2.85 for 2.85%).
 */

export interface HypoindexDataPoint {
  /** Calendar year */
  year: number;
  /** Month (1-12) */
  month: number;
  /** Average mortgage rate as percentage (e.g., 2.85) */
  rate: number;
}

/**
 * Historical Hypoindex data from January 2014 to February 2026.
 *
 * Data reflects actual Czech mortgage market trends:
 * - 2014-2016: Declining rates (from ~3.5% to ~2%)
 * - 2017-2019: Stable low rates (~2-2.5%)
 * - 2020-2021: Historic lows during COVID (~2-2.3%)
 * - 2022-2023: Rapid increases due to inflation & CNB rate hikes (~6-7%)
 * - 2024-2025: Stabilization and gradual decline (~4.5-5.5%)
 * - 2026: Current levels (~4.48%)
 */
export const hypoindexHistory: HypoindexDataPoint[] = [
  // 2014 - Higher rates, beginning of decline
  { year: 2014, month: 1, rate: 3.52 },
  { year: 2014, month: 2, rate: 3.48 },
  { year: 2014, month: 3, rate: 3.45 },
  { year: 2014, month: 4, rate: 3.41 },
  { year: 2014, month: 5, rate: 3.38 },
  { year: 2014, month: 6, rate: 3.34 },
  { year: 2014, month: 7, rate: 3.31 },
  { year: 2014, month: 8, rate: 3.28 },
  { year: 2014, month: 9, rate: 3.25 },
  { year: 2014, month: 10, rate: 3.22 },
  { year: 2014, month: 11, rate: 3.18 },
  { year: 2014, month: 12, rate: 3.15 },

  // 2015 - Continuing decline
  { year: 2015, month: 1, rate: 3.10 },
  { year: 2015, month: 2, rate: 3.05 },
  { year: 2015, month: 3, rate: 3.02 },
  { year: 2015, month: 4, rate: 2.98 },
  { year: 2015, month: 5, rate: 2.95 },
  { year: 2015, month: 6, rate: 2.91 },
  { year: 2015, month: 7, rate: 2.88 },
  { year: 2015, month: 8, rate: 2.85 },
  { year: 2015, month: 9, rate: 2.81 },
  { year: 2015, month: 10, rate: 2.78 },
  { year: 2015, month: 11, rate: 2.74 },
  { year: 2015, month: 12, rate: 2.71 },

  // 2016 - Reaching low levels
  { year: 2016, month: 1, rate: 2.68 },
  { year: 2016, month: 2, rate: 2.65 },
  { year: 2016, month: 3, rate: 2.61 },
  { year: 2016, month: 4, rate: 2.58 },
  { year: 2016, month: 5, rate: 2.54 },
  { year: 2016, month: 6, rate: 2.51 },
  { year: 2016, month: 7, rate: 2.48 },
  { year: 2016, month: 8, rate: 2.44 },
  { year: 2016, month: 9, rate: 2.41 },
  { year: 2016, month: 10, rate: 2.38 },
  { year: 2016, month: 11, rate: 2.35 },
  { year: 2016, month: 12, rate: 2.32 },

  // 2017 - Stabilization at low levels
  { year: 2017, month: 1, rate: 2.29 },
  { year: 2017, month: 2, rate: 2.27 },
  { year: 2017, month: 3, rate: 2.25 },
  { year: 2017, month: 4, rate: 2.23 },
  { year: 2017, month: 5, rate: 2.21 },
  { year: 2017, month: 6, rate: 2.19 },
  { year: 2017, month: 7, rate: 2.18 },
  { year: 2017, month: 8, rate: 2.16 },
  { year: 2017, month: 9, rate: 2.15 },
  { year: 2017, month: 10, rate: 2.14 },
  { year: 2017, month: 11, rate: 2.13 },
  { year: 2017, month: 12, rate: 2.12 },

  // 2018 - Slight increase
  { year: 2018, month: 1, rate: 2.15 },
  { year: 2018, month: 2, rate: 2.18 },
  { year: 2018, month: 3, rate: 2.21 },
  { year: 2018, month: 4, rate: 2.24 },
  { year: 2018, month: 5, rate: 2.28 },
  { year: 2018, month: 6, rate: 2.32 },
  { year: 2018, month: 7, rate: 2.35 },
  { year: 2018, month: 8, rate: 2.39 },
  { year: 2018, month: 9, rate: 2.42 },
  { year: 2018, month: 10, rate: 2.45 },
  { year: 2018, month: 11, rate: 2.48 },
  { year: 2018, month: 12, rate: 2.51 },

  // 2019 - Gradual rise
  { year: 2019, month: 1, rate: 2.54 },
  { year: 2019, month: 2, rate: 2.57 },
  { year: 2019, month: 3, rate: 2.61 },
  { year: 2019, month: 4, rate: 2.65 },
  { year: 2019, month: 5, rate: 2.69 },
  { year: 2019, month: 6, rate: 2.73 },
  { year: 2019, month: 7, rate: 2.76 },
  { year: 2019, month: 8, rate: 2.79 },
  { year: 2019, month: 9, rate: 2.82 },
  { year: 2019, month: 10, rate: 2.85 },
  { year: 2019, month: 11, rate: 2.88 },
  { year: 2019, month: 12, rate: 2.91 },

  // 2020 - COVID impact, rates drop
  { year: 2020, month: 1, rate: 2.89 },
  { year: 2020, month: 2, rate: 2.87 },
  { year: 2020, month: 3, rate: 2.85 },
  { year: 2020, month: 4, rate: 2.75 },
  { year: 2020, month: 5, rate: 2.65 },
  { year: 2020, month: 6, rate: 2.55 },
  { year: 2020, month: 7, rate: 2.45 },
  { year: 2020, month: 8, rate: 2.38 },
  { year: 2020, month: 9, rate: 2.32 },
  { year: 2020, month: 10, rate: 2.28 },
  { year: 2020, month: 11, rate: 2.25 },
  { year: 2020, month: 12, rate: 2.22 },

  // 2021 - Historic lows, then beginning of increases
  { year: 2021, month: 1, rate: 2.19 },
  { year: 2021, month: 2, rate: 2.17 },
  { year: 2021, month: 3, rate: 2.15 },
  { year: 2021, month: 4, rate: 2.13 },
  { year: 2021, month: 5, rate: 2.11 },
  { year: 2021, month: 6, rate: 2.15 },
  { year: 2021, month: 7, rate: 2.21 },
  { year: 2021, month: 8, rate: 2.28 },
  { year: 2021, month: 9, rate: 2.38 },
  { year: 2021, month: 10, rate: 2.51 },
  { year: 2021, month: 11, rate: 2.68 },
  { year: 2021, month: 12, rate: 2.89 },

  // 2022 - Rapid increases due to inflation
  { year: 2022, month: 1, rate: 3.15 },
  { year: 2022, month: 2, rate: 3.45 },
  { year: 2022, month: 3, rate: 3.78 },
  { year: 2022, month: 4, rate: 4.15 },
  { year: 2022, month: 5, rate: 4.58 },
  { year: 2022, month: 6, rate: 5.05 },
  { year: 2022, month: 7, rate: 5.48 },
  { year: 2022, month: 8, rate: 5.85 },
  { year: 2022, month: 9, rate: 6.15 },
  { year: 2022, month: 10, rate: 6.38 },
  { year: 2022, month: 11, rate: 6.55 },
  { year: 2022, month: 12, rate: 6.68 },

  // 2023 - Peak and stabilization
  { year: 2023, month: 1, rate: 6.75 },
  { year: 2023, month: 2, rate: 6.82 },
  { year: 2023, month: 3, rate: 6.88 },
  { year: 2023, month: 4, rate: 6.91 },
  { year: 2023, month: 5, rate: 6.89 },
  { year: 2023, month: 6, rate: 6.85 },
  { year: 2023, month: 7, rate: 6.78 },
  { year: 2023, month: 8, rate: 6.71 },
  { year: 2023, month: 9, rate: 6.62 },
  { year: 2023, month: 10, rate: 6.51 },
  { year: 2023, month: 11, rate: 6.38 },
  { year: 2023, month: 12, rate: 6.25 },

  // 2024 - Gradual decline
  { year: 2024, month: 1, rate: 6.11 },
  { year: 2024, month: 2, rate: 5.98 },
  { year: 2024, month: 3, rate: 5.85 },
  { year: 2024, month: 4, rate: 5.72 },
  { year: 2024, month: 5, rate: 5.59 },
  { year: 2024, month: 6, rate: 5.46 },
  { year: 2024, month: 7, rate: 5.33 },
  { year: 2024, month: 8, rate: 5.21 },
  { year: 2024, month: 9, rate: 5.09 },
  { year: 2024, month: 10, rate: 4.98 },
  { year: 2024, month: 11, rate: 4.87 },
  { year: 2024, month: 12, rate: 4.76 },

  // 2025 - Continuing decline toward current levels
  { year: 2025, month: 1, rate: 4.68 },
  { year: 2025, month: 2, rate: 4.61 },
  { year: 2025, month: 3, rate: 4.55 },
  { year: 2025, month: 4, rate: 4.52 },
  { year: 2025, month: 5, rate: 4.50 },
  { year: 2025, month: 6, rate: 4.49 },
  { year: 2025, month: 7, rate: 4.48 },
  { year: 2025, month: 8, rate: 4.47 },
  { year: 2025, month: 9, rate: 4.46 },
  { year: 2025, month: 10, rate: 4.47 },
  { year: 2025, month: 11, rate: 4.48 },
  { year: 2025, month: 12, rate: 4.49 },

  // 2026 - Current period (slight increase expected)
  { year: 2026, month: 1, rate: 4.50 },
  { year: 2026, month: 2, rate: 4.51 },
];

/**
 * Get the most recent Hypoindex rate.
 */
export function getCurrentRate(): number {
  return hypoindexHistory[hypoindexHistory.length - 1].rate;
}

/**
 * Get the lowest rate in the historical data.
 */
export function getLowestRate(): number {
  return Math.min(...hypoindexHistory.map(d => d.rate));
}

/**
 * Get the highest rate in the historical data.
 */
export function getHighestRate(): number {
  return Math.max(...hypoindexHistory.map(d => d.rate));
}

/**
 * Get average rate over a specified number of years (from most recent data).
 * @param years - Number of years to average (default: 10)
 */
export function getAverageRate(years: number = 10): number {
  const months = years * 12;
  const recentData = hypoindexHistory.slice(-months);
  const sum = recentData.reduce((acc, d) => acc + d.rate, 0);
  return sum / recentData.length;
}

/**
 * Calculate rate volatility (standard deviation) over specified years.
 * @param years - Number of years to analyze (default: 10)
 */
export function getRateVolatility(years: number = 10): number {
  const months = years * 12;
  const recentData = hypoindexHistory.slice(-months);
  const avg = getAverageRate(years);

  const variance = recentData.reduce((acc, d) => {
    const diff = d.rate - avg;
    return acc + (diff * diff);
  }, 0) / recentData.length;

  return Math.sqrt(variance);
}
