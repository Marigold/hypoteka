/**
 * Stress test scenario calculations for mortgage resilience analysis.
 *
 * Evaluates how mortgage payments behave under adverse conditions:
 * rate increases, income drops, and combined scenarios.
 */

import { calculateMonthlyPayment } from "./mortgage";

export type RiskLevel = "safe" | "warning" | "danger";

export interface StressScenario {
  name: string;
  rateChange?: number;
  incomeChange?: number;
}

export interface StressResult {
  name: string;
  newPayment: number;
  paymentChange: number;
  percentOfIncome: number;
  riskLevel: RiskLevel;
}

export interface StressTestOutput {
  basePayment: number;
  basePercentOfIncome: number;
  scenarios: StressResult[];
  emergencyFundRecommendation: number;
}

export interface StressTestParams {
  principal: number;
  annualRate: number;
  years: number;
  monthlyIncome: number;
  scenarios?: StressScenario[];
}

const DEFAULT_SCENARIOS: StressScenario[] = [
  { name: "Sazba +1 %", rateChange: 1 },
  { name: "Sazba +2 %", rateChange: 2 },
  { name: "Sazba +3 %", rateChange: 3 },
  { name: "Příjem −20 %", incomeChange: -20 },
  { name: "Příjem −50 %", incomeChange: -50 },
  { name: "Sazba +2 % a příjem −20 %", rateChange: 2, incomeChange: -20 },
];

function getRiskLevel(percentOfIncome: number): RiskLevel {
  if (percentOfIncome > 40) return "danger";
  if (percentOfIncome >= 30) return "warning";
  return "safe";
}

/**
 * Run stress test scenarios against a mortgage.
 *
 * @param params - Mortgage parameters and monthly income
 * @returns Base payment info, per-scenario results, and emergency fund recommendation
 */
export function stressTest(params: StressTestParams): StressTestOutput {
  const { principal, annualRate, years, monthlyIncome } = params;
  const scenarios = params.scenarios ?? DEFAULT_SCENARIOS;

  const basePayment = calculateMonthlyPayment(principal, annualRate, years);
  const basePercentOfIncome =
    monthlyIncome > 0 ? (basePayment / monthlyIncome) * 100 : 0;

  const results: StressResult[] = scenarios.map((scenario) => {
    const newRate = annualRate + (scenario.rateChange ?? 0);
    const newIncome =
      monthlyIncome * (1 + (scenario.incomeChange ?? 0) / 100);

    const newPayment = calculateMonthlyPayment(principal, newRate, years);
    const paymentChange = newPayment - basePayment;
    const percentOfIncome =
      newIncome > 0 ? (newPayment / newIncome) * 100 : 0;

    return {
      name: scenario.name,
      newPayment,
      paymentChange,
      percentOfIncome,
      riskLevel: getRiskLevel(percentOfIncome),
    };
  });

  // Emergency fund: 6 months of the highest possible payment
  const maxPayment = Math.max(basePayment, ...results.map((r) => r.newPayment));
  const emergencyFundRecommendation = maxPayment * 6;

  return {
    basePayment,
    basePercentOfIncome,
    scenarios: results,
    emergencyFundRecommendation,
  };
}
