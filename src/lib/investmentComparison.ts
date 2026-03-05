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

/**
 * Compare real estate investment (buy-to-let with mortgage) vs. stock market investing.
 *
 * Real estate scenario: investor buys property with mortgage, collects rental income
 * (after tax and maintenance), property appreciates over time.
 *
 * Stock scenario: investor puts the same initial capital (down payment + transaction costs)
 * into a stock portfolio that compounds annually. Monthly mortgage payments minus net rental
 * income represent the ongoing cash outflow for the property investor; the stock investor
 * adds that same amount monthly to their portfolio.
 *
 * @returns Year-by-year array comparing net worth for both strategies
 */
export function compareInvestments(
  params: InvestmentComparisonParams,
): InvestmentYearResult[] {
  const {
    propertyPrice,
    downPaymentPercent,
    mortgageRate,
    mortgageYears,
    propertyAppreciation,
    monthlyRentalIncome,
    holdingPeriod,
    stockReturnRate,
    propertyMaintenanceRate,
    propertyTransactionCost,
  } = params;

  if (propertyPrice <= 0 || holdingPeriod <= 0) return [];

  const downPayment = propertyPrice * (downPaymentPercent / 100);
  const transactionCostAmount = propertyPrice * (propertyTransactionCost / 100);
  const loanAmount = propertyPrice - downPayment;
  const monthlyMortgage = calculateMonthlyPayment(loanAmount, mortgageRate, mortgageYears);
  const monthlyMortgageRate = mortgageRate / 100 / 12;
  const monthlyStockReturn = stockReturnRate / 100 / 12;

  // Initial capital is the same for both strategies
  const initialCapital = downPayment + transactionCostAmount;

  const results: InvestmentYearResult[] = [];

  // Real estate state
  let mortgageBalance = loanAmount;
  let propertyValue = propertyPrice;
  let cumulativeRentalNet = 0;

  // Stock state: investor starts with the same initial capital
  let stockPortfolio = initialCapital;
  const stockCostBasis = initialCapital;

  for (let year = 1; year <= holdingPeriod; year++) {
    let yearlyRentalGross = 0;

    for (let month = 1; month <= 12; month++) {
      // --- Real estate: mortgage amortization ---
      const interestThisMonth = mortgageBalance * monthlyMortgageRate;
      const principalThisMonth = monthlyMortgage - interestThisMonth;
      mortgageBalance = Math.max(0, mortgageBalance - principalThisMonth);

      // --- Real estate: rental income ---
      yearlyRentalGross += monthlyRentalIncome;

      // --- Real estate: monthly cash outflow ---
      const maintenanceMonthly = propertyValue * (propertyMaintenanceRate / 100) / 12;
      const propertyCashOutflow = monthlyMortgage + maintenanceMonthly;
      const propertyNetCashflow = monthlyRentalIncome - propertyCashOutflow;

      // --- Stock: invest the equivalent monthly outflow ---
      // Stock investor contributes the same cash the property investor spends
      // net of rental income. If property generates positive cashflow, stock
      // investor contributes nothing extra (they don't receive rental income).
      if (propertyNetCashflow < 0) {
        stockPortfolio += Math.abs(propertyNetCashflow);
      }

      // Stock portfolio grows monthly
      stockPortfolio *= 1 + monthlyStockReturn;
    }

    // Annual property appreciation
    propertyValue *= 1 + propertyAppreciation / 100;

    // Annual rental income tax and maintenance
    const yearlyMaintenance = propertyPrice * Math.pow(1 + propertyAppreciation / 100, year - 1)
      * (propertyMaintenanceRate / 100);
    const rentalTax = calculateRentalIncomeTax(yearlyRentalGross);
    const netRentalIncome = yearlyRentalGross - rentalTax - yearlyMaintenance;
    cumulativeRentalNet += netRentalIncome;

    // Real estate net worth
    const realEstateEquity = propertyValue - mortgageBalance;
    const realEstateNetWorth = realEstateEquity + cumulativeRentalNet;

    // After-tax values (if sold this year)
    const propertyGain = propertyValue - propertyPrice;
    const propertySaleTax = calculatePropertySaleTax(propertyGain, year);
    const realEstateNetWorthAfterTax = realEstateNetWorth - propertySaleTax;

    const stockGain = stockPortfolio - stockCostBasis;
    const stockTax = calculateStockTax(stockGain, year);
    const stockNetWorthAfterTax = stockPortfolio - stockTax;

    // Leverage ratio: property value / equity (how leveraged the investment is)
    const leverageRatio = realEstateEquity > 0
      ? propertyValue / realEstateEquity
      : Infinity;

    results.push({
      year,
      propertyValue: Math.round(propertyValue),
      mortgageBalance: Math.round(mortgageBalance),
      realEstateEquity: Math.round(realEstateEquity),
      cumulativeRentalNet: Math.round(cumulativeRentalNet),
      realEstateNetWorth: Math.round(realEstateNetWorth),
      realEstateNetWorthAfterTax: Math.round(realEstateNetWorthAfterTax),
      stockPortfolioValue: Math.round(stockPortfolio),
      stockNetWorthAfterTax: Math.round(stockNetWorthAfterTax),
      leverageRatio: Math.round(leverageRatio * 100) / 100,
    });
  }

  return results;
}
