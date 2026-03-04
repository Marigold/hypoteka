/**
 * Core mortgage math functions.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%),
 * and durations are in years.
 */

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface TotalCostResult {
  totalPaid: number;
  totalInterest: number;
  /** totalPaid / principal */
  effectiveMultiplier: number;
}

export interface BankProfitResult {
  bankRevenue: number;
  bankFundingCost: number;
  bankProfit: number;
}

/**
 * Calculate monthly mortgage payment using the annuity formula:
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param principal - Loan amount in CZK
 * @param annualRate - Annual interest rate as percentage (e.g. 4.5)
 * @param years - Loan duration in years
 * @returns Monthly payment amount, or 0 for invalid inputs
 *
 * @example calculateMonthlyPayment(4_000_000, 4.5, 30) ≈ 20_267
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  if (principal <= 0 || years <= 0) return 0;

  const months = years * 12;

  if (annualRate === 0) {
    return principal / months;
  }

  if (annualRate < 0) return 0;

  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, months);
  return principal * (r * factor) / (factor - 1);
}

/**
 * Generate a month-by-month amortization schedule.
 */
export function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  years: number,
): AmortizationRow[] {
  if (principal <= 0 || years <= 0 || annualRate < 0) return [];

  const months = years * 12;
  const payment = calculateMonthlyPayment(principal, annualRate, years);
  const r = annualRate / 100 / 12;
  const schedule: AmortizationRow[] = [];
  let remaining = principal;

  for (let month = 1; month <= months; month++) {
    const interest = remaining * r;
    const principalPart = payment - interest;
    remaining = Math.max(0, remaining - principalPart);

    schedule.push({
      month,
      payment,
      principal: principalPart,
      interest,
      remainingBalance: remaining,
    });
  }

  return schedule;
}

/**
 * Calculate total cost of the mortgage.
 */
export function calculateTotalCost(
  principal: number,
  annualRate: number,
  years: number,
): TotalCostResult {
  if (principal <= 0 || years <= 0 || annualRate < 0) {
    return { totalPaid: 0, totalInterest: 0, effectiveMultiplier: 0 };
  }

  const payment = calculateMonthlyPayment(principal, annualRate, years);
  const months = years * 12;
  const totalPaid = payment * months;
  const totalInterest = totalPaid - principal;

  return {
    totalPaid,
    totalInterest,
    effectiveMultiplier: totalPaid / principal,
  };
}

/**
 * Calculate how much the bank earns on the mortgage.
 *
 * @param bankFundingRate - The bank's cost of capital as percentage (default: 3.5%)
 */
export function calculateBankProfit(
  principal: number,
  annualRate: number,
  years: number,
  bankFundingRate = 3.5,
): BankProfitResult {
  if (principal <= 0 || years <= 0 || annualRate < 0 || bankFundingRate < 0) {
    return { bankRevenue: 0, bankFundingCost: 0, bankProfit: 0 };
  }

  const { totalInterest: bankRevenue } = calculateTotalCost(
    principal,
    annualRate,
    years,
  );
  const { totalInterest: bankFundingCost } = calculateTotalCost(
    principal,
    bankFundingRate,
    years,
  );

  return {
    bankRevenue,
    bankFundingCost,
    bankProfit: bankRevenue - bankFundingCost,
  };
}
