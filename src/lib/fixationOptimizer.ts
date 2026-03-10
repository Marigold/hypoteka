/**
 * Fixation period optimizer for Czech mortgages.
 *
 * Helps borrowers choose the optimal fixation period by comparing total costs
 * under different rate scenarios at refixation. Models 1, 3, 5, 7, 10, 15, and 20-year
 * fixation periods over a user's planned holding period.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%),
 * and durations are in years.
 */

import { calculateMonthlyPayment } from "./mortgage";

export type RiskTolerance = "conservative" | "moderate" | "aggressive";

export interface FixationRateMap {
  [years: number]: number;
}

export interface FixationScenarioParams {
  /** Loan amount in CZK */
  loanAmount: number;
  /** Remaining loan term in years */
  remainingYears: number;
  /** Map of fixation period (years) to current rate offers (e.g., {3: 4.5, 5: 4.7}) */
  fixationRates: FixationRateMap;
  /** How long the user plans to hold the property (years) */
  holdingPeriod: number;
  /** Risk profile affecting rate change assumptions */
  riskTolerance: RiskTolerance;
}

export interface FixationPeriodResult {
  /** Fixation period length in years */
  fixationYears: number;
  /** Initial interest rate */
  initialRate: number;
  /** Total interest paid over holding period */
  totalInterest: number;
  /** Total amount paid (principal + interest) over holding period */
  totalPaid: number;
  /** Average monthly payment over holding period */
  averageMonthlyPayment: number;
  /** Number of times the rate needs to be refixed during holding period */
  refixationCount: number;
  /** Rate scenario used at refixation (optimistic/base/pessimistic) */
  rateScenario: "optimistic" | "base" | "pessimistic";
  /** Rate change assumption at refixation */
  rateChangeAtRefixation: number;
}

export interface FixationOptimizerResult {
  scenarios: FixationPeriodResult[];
  recommendation: {
    fixationYears: number;
    reason: string;
  };
  summary: {
    lowestCost: number;
    highestCost: number;
    costSpread: number;
  };
}

/**
 * Get rate change assumptions based on risk tolerance.
 * Conservative assumes rates will rise, aggressive assumes they'll fall.
 *
 * @returns Rate change in percentage points for optimistic/base/pessimistic scenarios
 */
function getRateChangeAssumptions(tolerance: RiskTolerance): {
  optimistic: number;
  base: number;
  pessimistic: number;
} {
  switch (tolerance) {
    case "conservative":
      return { optimistic: 0, base: 1, pessimistic: 2.5 };
    case "moderate":
      return { optimistic: -1, base: 0, pessimistic: 2 };
    case "aggressive":
      return { optimistic: -1.5, base: -0.5, pessimistic: 1 };
  }
}

/**
 * Calculate the total cost of a mortgage with a specific fixation period
 * over a given holding period, accounting for rate changes at refixation.
 */
function calculateFixationPeriodCost(
  loanAmount: number,
  remainingYears: number,
  fixationYears: number,
  initialRate: number,
  holdingPeriod: number,
  rateChangeAtRefixation: number,
  rateScenario: "optimistic" | "base" | "pessimistic",
): FixationPeriodResult {
  let totalInterest = 0;
  let totalPrincipalPaid = 0;
  let remainingBalance = loanAmount;
  let elapsedYears = 0;
  let refixationCount = 0;
  let currentRate = initialRate;
  const monthlyPayments: number[] = [];

  while (elapsedYears < holdingPeriod && remainingBalance > 0) {
    const yearsThisPeriod = Math.min(
      fixationYears,
      holdingPeriod - elapsedYears,
      remainingYears - elapsedYears,
    );

    if (yearsThisPeriod <= 0) break;

    // Calculate payment for this fixation period
    const remainingLoanYears = remainingYears - elapsedYears;
    const monthlyPayment = calculateMonthlyPayment(
      remainingBalance,
      currentRate,
      remainingLoanYears,
    );

    const monthsThisPeriod = yearsThisPeriod * 12;

    // Simulate month-by-month payment
    const r = currentRate / 100 / 12;
    for (let month = 0; month < monthsThisPeriod; month++) {
      const interestPayment = remainingBalance * r;
      const principalPayment = monthlyPayment - interestPayment;

      totalInterest += interestPayment;
      totalPrincipalPaid += principalPayment;
      remainingBalance = Math.max(0, remainingBalance - principalPayment);
      monthlyPayments.push(monthlyPayment);

      if (remainingBalance === 0) break;
    }

    elapsedYears += yearsThisPeriod;

    // If we need to refix and haven't reached the end
    if (
      elapsedYears < holdingPeriod &&
      remainingBalance > 0 &&
      yearsThisPeriod === fixationYears
    ) {
      refixationCount++;
      currentRate += rateChangeAtRefixation;
      currentRate = Math.max(0, currentRate); // Rate can't go negative
    }
  }

  const averageMonthlyPayment =
    monthlyPayments.length > 0
      ? monthlyPayments.reduce((sum, p) => sum + p, 0) / monthlyPayments.length
      : 0;

  return {
    fixationYears,
    initialRate,
    totalInterest,
    totalPaid: totalPrincipalPaid + totalInterest,
    averageMonthlyPayment,
    refixationCount,
    rateScenario,
    rateChangeAtRefixation,
  };
}

/**
 * Calculate and compare all fixation period scenarios.
 *
 * @param params - Loan parameters, available fixation rates, holding period, and risk tolerance
 * @returns Comparison of all scenarios with recommendation
 *
 * @example
 * calculateFixationScenarios({
 *   loanAmount: 4_000_000,
 *   remainingYears: 30,
 *   fixationRates: { 3: 4.5, 5: 4.7, 10: 5.0 },
 *   holdingPeriod: 10,
 *   riskTolerance: 'moderate'
 * })
 */
export function calculateFixationScenarios(
  params: FixationScenarioParams,
): FixationOptimizerResult {
  const {
    loanAmount,
    remainingYears,
    fixationRates,
    holdingPeriod,
    riskTolerance,
  } = params;

  // Validation
  if (
    loanAmount <= 0 ||
    remainingYears <= 0 ||
    holdingPeriod <= 0 ||
    Object.keys(fixationRates).length === 0
  ) {
    return {
      scenarios: [],
      recommendation: {
        fixationYears: 0,
        reason: "Neplatné vstupní parametry",
      },
      summary: {
        lowestCost: 0,
        highestCost: 0,
        costSpread: 0,
      },
    };
  }

  const rateAssumptions = getRateChangeAssumptions(riskTolerance);
  const scenarios: FixationPeriodResult[] = [];

  // Calculate scenarios for each available fixation period under each rate assumption
  for (const [fixationYearsStr, initialRate] of Object.entries(fixationRates)) {
    const fixationYears = Number(fixationYearsStr);

    // Base scenario (most likely)
    scenarios.push(
      calculateFixationPeriodCost(
        loanAmount,
        remainingYears,
        fixationYears,
        initialRate,
        holdingPeriod,
        rateAssumptions.base,
        "base",
      ),
    );

    // Pessimistic scenario (rates rise)
    scenarios.push(
      calculateFixationPeriodCost(
        loanAmount,
        remainingYears,
        fixationYears,
        initialRate,
        holdingPeriod,
        rateAssumptions.pessimistic,
        "pessimistic",
      ),
    );

    // Optimistic scenario (rates fall)
    scenarios.push(
      calculateFixationPeriodCost(
        loanAmount,
        remainingYears,
        fixationYears,
        initialRate,
        holdingPeriod,
        rateAssumptions.optimistic,
        "optimistic",
      ),
    );
  }

  // Sort by total interest cost
  scenarios.sort((a, b) => a.totalInterest - b.totalInterest);

  // Generate recommendation
  const baseScenarios = scenarios.filter((s) => s.rateScenario === "base");
  const bestBaseScenario = baseScenarios.reduce((best, current) =>
    current.totalInterest < best.totalInterest ? current : best
  );

  let reason = `Při ${riskTolerance === "conservative" ? "konzervativním" : riskTolerance === "moderate" ? "vyváženém" : "agresivním"} přístupu nabízí fixace na ${bestBaseScenario.fixationYears} ${bestBaseScenario.fixationYears === 1 ? "rok" : bestBaseScenario.fixationYears < 5 ? "roky" : "let"} nejlepší poměr mezi náklady a rizikem.`;

  if (bestBaseScenario.refixationCount === 0) {
    reason +=
      ` Po dobu ${holdingPeriod} ${holdingPeriod === 1 ? "roku" : holdingPeriod < 5 ? "let" : "let"} nebudete muset řešit refixaci.`;
  } else {
    reason +=
      ` Během ${holdingPeriod} ${holdingPeriod === 1 ? "roku" : holdingPeriod < 5 ? "let" : "let"} budete refixovat ${bestBaseScenario.refixationCount}× s celkovými úroky ${Math.round(bestBaseScenario.totalInterest).toLocaleString("cs-CZ")} Kč.`;
  }

  const lowestCost = scenarios[0].totalInterest;
  const highestCost = scenarios[scenarios.length - 1].totalInterest;

  return {
    scenarios,
    recommendation: {
      fixationYears: bestBaseScenario.fixationYears,
      reason,
    },
    summary: {
      lowestCost,
      highestCost,
      costSpread: highestCost - lowestCost,
    },
  };
}
