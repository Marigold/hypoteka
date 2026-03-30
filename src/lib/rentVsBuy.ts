/**
 * Rent vs. buy comparison logic.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%),
 * and durations are in years.
 */

import { calculateMonthlyPayment } from "./mortgage";

export interface TransactionCosts {
  /** Notary fees in CZK */
  notary: number;
  /** Property valuation (odhad) in CZK */
  valuation: number;
  /** Bank origination fee in CZK */
  bankFee: number;
  /** Real estate agent commission in CZK */
  agentCommission: number;
}

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

  /** Annual property appreciation rate as percentage (e.g. 3.0) */
  propertyAppreciation: number;
  /** Annual return on investments as percentage (e.g. 6.0) */
  investmentReturnRate: number;

  /**
   * Annual ownership costs as percentage of property value (e.g. 1.45).
   * Includes fond oprav, insurance, property tax, maintenance — excludes energy
   * (paid by both buyers and renters). Derived from TCO calculator.
   */
  ownershipCostPercent: number;
  /** One-time transaction costs at purchase */
  transactionCosts: TransactionCosts;

  /** Annual mortgage interest tax deduction cap in CZK (e.g. 150_000) */
  taxDeductionCap: number;
}

export interface RentVsBuyYearResult {
  year: number;
  buyingNetWorth: number;
  rentingNetWorth: number;
  buyingMonthlyCost: number;
  rentingMonthlyCost: number;
  /** Gross property value (appreciating) */
  propertyValue: number;
  /** Remaining mortgage balance (positive number) */
  mortgageBalance: number;
  /** Buyer's investment portfolio */
  buyerPortfolio: number;
  /** Renter's investment portfolio */
  renterPortfolio: number;
}
/**
 * Total one-time transaction costs at purchase.
 */
function totalTransactionCosts(tx: TransactionCosts): number {
  return tx.notary + tx.valuation + tx.bankFee + tx.agentCommission;
}

/**
 * Compare the financial outcome of renting + investing vs. buying over time.
 *
 * Buying scenario: buyer pays down payment + transaction costs, takes a mortgage,
 * pays monthly mortgage + ownership costs (as % of property value).
 * Property appreciates over time. Periodic reconstruction reduces buyer's portfolio.
 *
 * Renting scenario: renter invests the down payment + transaction costs,
 * pays monthly rent (growing independently), and invests the difference between
 * buying costs and renting costs each month (whoever spends less invests the difference).
 *
 * Capital gains tax: if property is sold before 10 years of ownership,
 * 15% tax applies to the profit (sale price - purchase price - transaction costs).
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
    propertyAppreciation,
    investmentReturnRate,
    ownershipCostPercent,
    transactionCosts,
    taxDeductionCap,
  } = params;

  if (propertyPrice <= 0 || mortgageYears <= 0) return [];

  const loanAmount = propertyPrice - downPayment;
  const monthlyMortgage = calculateMonthlyPayment(loanAmount, mortgageRate, mortgageYears);
  const monthlyInvestmentReturn = investmentReturnRate / 100 / 12;
  const monthlyMortgageRate = mortgageRate / 100 / 12;
  const txCostTotal = totalTransactionCosts(transactionCosts);

  const results: RentVsBuyYearResult[] = [];

  // Buying state
  let mortgageBalance = loanAmount;
  let propertyValue = propertyPrice;
  let buyerPortfolio = 0;

  // Renting state: renter invests down payment + transaction costs upfront
  let renterPortfolio = downPayment + txCostTotal;

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

      // Ownership costs: % of current property value / 12
      const ownershipMonthly = (propertyValue * (ownershipCostPercent / 100)) / 12;
      const buyingMonthly = monthlyMortgage + ownershipMonthly;
      yearlyBuyingCost += buyingMonthly;

      // --- Renting costs ---
      yearlyRentingCost += currentRent;

      // Both have the same monthly budget = max(buying, renting).
      // Whoever spends less invests the difference.
      const diff = buyingMonthly - currentRent;
      if (diff > 0) {
        renterPortfolio += diff;
      } else {
        buyerPortfolio += -diff;
      }

      // Both portfolios grow monthly
      renterPortfolio *= 1 + monthlyInvestmentReturn;
      buyerPortfolio *= 1 + monthlyInvestmentReturn;
    }

    // Annual adjustments
    propertyValue *= 1 + propertyAppreciation / 100;
    currentRent *= 1 + propertyAppreciation / 100;

    // Tax benefit: deduct mortgage interest (capped) at 15% marginal rate
    const deductibleInterest = Math.min(yearlyInterestPaid, taxDeductionCap);
    const taxSaving = deductibleInterest * 0.15;
    buyerPortfolio += taxSaving;

    // Net worth
    const buyingNetWorth = propertyValue - mortgageBalance + buyerPortfolio;
    const rentingNetWorth = renterPortfolio;

    results.push({
      year,
      buyingNetWorth: Math.round(buyingNetWorth),
      rentingNetWorth: Math.round(rentingNetWorth),
      buyingMonthlyCost: Math.round((yearlyBuyingCost - taxSaving) / 12),
      rentingMonthlyCost: Math.round(yearlyRentingCost / 12),
      propertyValue: Math.round(propertyValue),
      mortgageBalance: Math.round(mortgageBalance),
      buyerPortfolio: Math.round(buyerPortfolio),
      renterPortfolio: Math.round(renterPortfolio),
    });
  }

  return results;
}
