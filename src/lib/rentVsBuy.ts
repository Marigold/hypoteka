/**
 * Rent vs. buy comparison logic.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%),
 * and durations are in years.
 */

import { calculateMonthlyPayment } from "./mortgage";

export interface RentVsBuyParams {
  /** Property purchase price in CZK */
  propertyPrice: number;
  /** Down payment in CZK */
  downPayment: number;
  /** Annual mortgage interest rate as percentage (e.g. 4.5) */
  mortgageRate: number;
  /** Mortgage duration in years */
  mortgageYears: number;
  /** Current monthly rent in CZK */
  monthlyRent: number;
  /** Annual rent growth rate as percentage (e.g. 3.0) */
  rentGrowthRate: number;
  /** Annual property appreciation rate as percentage (e.g. 3.0) */
  propertyAppreciation: number;
  /** Annual return on investments as percentage (e.g. 6.0) */
  investmentReturnRate: number;
  /** Annual maintenance cost as percentage of property value (e.g. 1.0) */
  maintenanceRate: number;
  /** One-time transaction costs as percentage of property price (e.g. 4.0) */
  transactionCosts: number;
  /** Annual mortgage interest tax deduction cap in CZK (e.g. 150_000) */
  taxDeductionCap: number;
}

export interface RentVsBuyYearResult {
  year: number;
  buyingNetWorth: number;
  rentingNetWorth: number;
  buyingMonthlyCost: number;
  rentingMonthlyCost: number;
}

/**
 * Compare the financial outcome of renting + investing vs. buying over time.
 *
 * Buying scenario: buyer pays down payment + transaction costs, takes a mortgage,
 * pays monthly mortgage + maintenance. Property appreciates over time.
 *
 * Renting scenario: renter invests the down payment + transaction costs,
 * pays monthly rent (growing annually), and invests the difference between
 * buying costs and renting costs each month (if buying is more expensive).
 *
 * @returns Year-by-year array comparing net worth and monthly costs for both scenarios
 */
export function compareRentVsBuy(
  params: RentVsBuyParams,
): RentVsBuyYearResult[] {
  const {
    propertyPrice,
    downPayment,
    mortgageRate,
    mortgageYears,
    monthlyRent,
    rentGrowthRate,
    propertyAppreciation,
    investmentReturnRate,
    maintenanceRate,
    transactionCosts,
    taxDeductionCap,
  } = params;

  if (propertyPrice <= 0 || mortgageYears <= 0) return [];

  const loanAmount = propertyPrice - downPayment;
  const monthlyMortgage = calculateMonthlyPayment(loanAmount, mortgageRate, mortgageYears);
  const monthlyInvestmentReturn = investmentReturnRate / 100 / 12;
  const monthlyMortgageRate = mortgageRate / 100 / 12;
  const transactionCostAmount = propertyPrice * (transactionCosts / 100);

  const results: RentVsBuyYearResult[] = [];

  // Buying state
  let mortgageBalance = loanAmount;
  let propertyValue = propertyPrice;

  // Renting state: renter invests down payment + transaction costs upfront
  let renterPortfolio = downPayment + transactionCostAmount;

  let currentRent = monthlyRent;

  for (let year = 1; year <= mortgageYears; year++) {
    let yearlyBuyingCost = 0;
    let yearlyRentingCost = 0;
    let yearlyInterestPaid = 0;

    for (let month = 1; month <= 12; month++) {
      // --- Buying costs ---
      const interestThisMonth = mortgageBalance * monthlyMortgageRate;
      const principalThisMonth = monthlyMortgage - interestThisMonth;
      mortgageBalance = Math.max(0, mortgageBalance - principalThisMonth);
      yearlyInterestPaid += interestThisMonth;

      const maintenanceMonthly = propertyValue * (maintenanceRate / 100) / 12;
      const buyingMonthly = monthlyMortgage + maintenanceMonthly;
      yearlyBuyingCost += buyingMonthly;

      // --- Renting costs ---
      yearlyRentingCost += currentRent;

      // Renter invests the difference (if buying is more expensive)
      const monthlySavings = buyingMonthly - currentRent;
      if (monthlySavings > 0) {
        renterPortfolio += monthlySavings;
      }

      // Renter's portfolio grows monthly
      renterPortfolio *= 1 + monthlyInvestmentReturn;
    }

    // Annual adjustments
    propertyValue *= 1 + propertyAppreciation / 100;
    currentRent *= 1 + rentGrowthRate / 100;

    // Tax benefit: deduct mortgage interest (capped) at 15% marginal rate
    const deductibleInterest = Math.min(yearlyInterestPaid, taxDeductionCap);
    const taxSaving = deductibleInterest * 0.15;

    // Buyer net worth = property value - remaining mortgage
    const buyingNetWorth = propertyValue - mortgageBalance;

    // Renter net worth = investment portfolio
    // Add back tax saving difference: buyer gets tax benefit, reduce buyer cost
    const rentingNetWorth = renterPortfolio;

    // Adjust buying net worth for tax savings (treated as reducing cost)
    const adjustedBuyingNetWorth = buyingNetWorth + taxSaving * year;

    results.push({
      year,
      buyingNetWorth: Math.round(adjustedBuyingNetWorth),
      rentingNetWorth: Math.round(rentingNetWorth),
      buyingMonthlyCost: Math.round((yearlyBuyingCost - taxSaving) / 12),
      rentingMonthlyCost: Math.round(yearlyRentingCost / 12),
    });
  }

  return results;
}
