/**
 * Real estate vs. stock market investment comparison logic.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%),
 * and durations are in years.
 */

import { calculateMonthlyPayment } from "./mortgage";

export interface InvestmentComparisonParams {
  /** Property purchase price in CZK */
  propertyPrice: number;
  /** Down payment as percentage of property price (e.g. 20) */
  downPaymentPercent: number;
  /** Annual mortgage interest rate as percentage (e.g. 4.5) */
  mortgageRate: number;
  /** Mortgage duration in years */
  mortgageYears: number;
  /** Annual property appreciation rate as percentage (e.g. 3.0) */
  propertyAppreciation: number;
  /** Gross monthly rental income in CZK */
  monthlyRentalIncome: number;
  /** Investment holding period in years (1-30) */
  holdingPeriod: number;

  /** Expected annual stock market return as percentage (e.g. 7.0) */
  stockReturnRate: number;

  /** Annual maintenance cost as percentage of property value (e.g. 1.0) */
  propertyMaintenanceRate: number;
  /** One-time property transaction costs as percentage of price (e.g. 4.0) */
  propertyTransactionCost: number;
  /** Effective tax rate on rental income as percentage (default: 10.5) */
  rentalTaxRate: number;
}

export interface InvestmentYearResult {
  year: number;
  /** Current property market value */
  propertyValue: number;
  /** Remaining mortgage balance */
  mortgageBalance: number;
  /** Property value minus mortgage balance */
  realEstateEquity: number;
  /** Cumulative net rental income (after tax and expenses) */
  cumulativeRentalNet: number;
  /** Real estate equity + cumulative net rental income */
  realEstateNetWorth: number;
  /** Net worth after applying capital gains tax on property sale */
  realEstateNetWorthAfterTax: number;
  /** Current stock portfolio value */
  stockPortfolioValue: number;
  /** Stock portfolio value after capital gains tax */
  stockNetWorthAfterTax: number;
  /** Property value / equity ratio */
  leverageRatio: number;
}

/**
 * Calculate capital gains tax on stock sale under Czech tax rules.
 *
 * - Holding < 3 years: 15% tax on gains (simplified; ignores 23% bracket)
 * - Holding ≥ 3 years: 0% tax (time test exemption)
 *
 * @param gain - Capital gain in CZK (sale price minus cost basis)
 * @param holdingYears - Number of whole years held
 * @returns Tax amount in CZK
 *
 * @example calculateStockTax(100_000, 2) // 15_000
 * @example calculateStockTax(100_000, 3) // 0
 */
export function calculateStockTax(gain: number, holdingYears: number): number {
  if (gain <= 0) return 0;
  if (holdingYears >= 3) return 0;
  return gain * 0.15;
}

/**
 * Calculate capital gains tax on investment property sale under Czech tax rules.
 *
 * - Holding < 10 years: 15% tax on gains (simplified; ignores 23% bracket)
 * - Holding ≥ 10 years: 0% tax (time test exemption)
 *
 * @param gain - Capital gain in CZK (sale price minus purchase price)
 * @param holdingYears - Number of whole years held
 * @returns Tax amount in CZK
 *
 * @example calculatePropertySaleTax(500_000, 5) // 75_000
 * @example calculatePropertySaleTax(500_000, 10) // 0
 */
export function calculatePropertySaleTax(
  gain: number,
  holdingYears: number,
): number {
  if (gain <= 0) return 0;
  if (holdingYears >= 10) return 0;
  return gain * 0.15;
}

/**
 * Calculate effective tax on annual rental income using Czech flat-rate expense deduction.
 *
 * Czech rules allow a 30% flat-rate expense deduction on rental income.
 * The remaining 70% is taxed at 15%, yielding an effective rate of ~10.5%.
 *
 * @param annualRent - Gross annual rental income in CZK
 * @returns Tax amount in CZK
 *
 * @example calculateRentalIncomeTax(120_000) // 12_600
 */
export function calculateRentalIncomeTax(annualRent: number): number {
  if (annualRent <= 0) return 0;
  // 30% flat-rate deduction → taxable base is 70% of income
  // 15% tax on the taxable base → effective rate = 0.70 × 0.15 = 0.105
  return annualRent * 0.7 * 0.15;
}
