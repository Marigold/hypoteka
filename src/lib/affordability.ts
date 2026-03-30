/**
 * Affordability calculations for Czech mortgage lending.
 *
 * Implements Czech regulatory limits (as of April 2026):
 * - DSTI (Debt Service to Income): max 45%
 * - DTI (Debt to Income): max 8.5x annual income
 * - LTV (Loan to Value): varies by buyer type and age
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%).
 */

import { calculateMonthlyPayment } from "./mortgage";

export type BuyerType = "first-home" | "investment";
export type BindingConstraint = "dsti" | "dti" | "ltv";

export interface LTVRule {
  /** Buyer category */
  type: BuyerType;
  /** Age threshold for special LTV rules */
  ageThreshold?: number;
  /** Maximum LTV percentage (0-100) */
  maxLTV: number;
  /** Human-readable description in Czech */
  description: string;
}

export interface AffordabilityParams {
  /** Net monthly income of primary borrower (CZK) */
  monthlyIncome: number;
  /** Net monthly income of partner/co-borrower (CZK), if any */
  partnerIncome?: number;
  /** Existing monthly debt payments (CZK) */
  existingDebts: number;
  /** Number of dependent children/family members */
  dependents: number;
  /** Desired monthly lifestyle buffer (CZK) */
  lifestyleBuffer: number;
  /** Age of primary borrower (for LTV rules) */
  age: number;
  /** Buyer type (first-time or investment) */
  buyerType: BuyerType;
  /** Expected annual interest rate (%) */
  annualRate: number;
  /** Loan duration in years */
  years: number;
  /** Minimum down payment percentage (0-100), optional override */
  minDownPaymentPercent?: number;
}

export interface AffordabilityResult {
  /** Maximum loan amount based on DSTI limit (CZK) */
  maxLoanByDSTI: number;
  /** Maximum loan amount based on DTI limit (CZK) */
  maxLoanByDTI: number;
  /** Applicable LTV rule */
  ltvRule: LTVRule;
  /** Maximum loan amount (binding constraint) (CZK) */
  maxLoan: number;
  /** Which limit is the binding constraint */
  bindingConstraint: BindingConstraint;
  /** Explanation of binding constraint in Czech */
  constraintExplanation: string;
  /** Maximum property price (maxLoan / (1 - downPaymentPercent)) (CZK) */
  maxPropertyPrice: number;
  /** Required down payment percentage (0-100) */
  downPaymentPercent: number;
  /** Required down payment amount (CZK) */
  downPaymentAmount: number;
  /** Monthly payment at max loan (CZK) */
  monthlyPayment: number;
  /** Total monthly income (CZK) */
  totalMonthlyIncome: number;
  /** Available monthly income for mortgage (after debts and buffer) (CZK) */
  availableMonthlyIncome: number;
}

/** Czech regulatory LTV rules (April 2026) */
const LTV_RULES: LTVRule[] = [
  {
    type: "first-home",
    ageThreshold: 36,
    maxLTV: 90,
    description: "První bydlení, věk do 36 let",
  },
  {
    type: "first-home",
    maxLTV: 80,
    description: "První bydlení, standardní",
  },
  {
    type: "investment",
    maxLTV: 70,
    description: "Investiční nemovitost",
  },
];

/** Maximum DSTI (Debt Service to Income) ratio as percentage */
const MAX_DSTI_PERCENT = 45;

/** Maximum DTI (Debt to Income) ratio as multiplier */
const MAX_DTI_MULTIPLIER = 8.5;

/**
 * Calculate maximum loan amount based on DSTI (Debt Service to Income) limit.
 *
 * DSTI = (monthly mortgage payment + existing debts) / monthly income
 * Czech regulation caps DSTI at 45%.
 *
 * @param totalMonthlyIncome - Combined net monthly income (CZK)
 * @param existingDebts - Existing monthly debt payments (CZK)
 * @param lifestyleBuffer - Desired monthly lifestyle buffer (CZK)
 * @param annualRate - Annual interest rate (%)
 * @param years - Loan duration in years
 * @returns Maximum loan amount under DSTI constraint
 */
export function calculateMaxLoanByDSTI(
  totalMonthlyIncome: number,
  existingDebts: number,
  lifestyleBuffer: number,
  annualRate: number,
  years: number,
): number {
  if (totalMonthlyIncome <= 0 || years <= 0 || annualRate < 0) return 0;

  // Available income for mortgage = 45% of gross income - existing debts - lifestyle buffer
  const maxDebtService = (totalMonthlyIncome * MAX_DSTI_PERCENT) / 100;
  const availableForMortgage = Math.max(
    0,
    maxDebtService - existingDebts - lifestyleBuffer,
  );

  if (availableForMortgage <= 0) return 0;

  // Reverse the monthly payment formula to get principal
  // M = P * [r(1+r)^n] / [(1+r)^n - 1]
  // P = M * [(1+r)^n - 1] / [r(1+r)^n]

  if (annualRate === 0) {
    return availableForMortgage * years * 12;
  }

  const months = years * 12;
  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, months);

  return availableForMortgage * (factor - 1) / (r * factor);
}

/**
 * Calculate maximum loan amount based on DTI (Debt to Income) limit.
 *
 * DTI = total debt / annual income
 * Czech regulation caps DTI at 8.5x annual income.
 *
 * @param totalMonthlyIncome - Combined net monthly income (CZK)
 * @param existingDebts - Existing monthly debt payments (CZK)
 * @returns Maximum loan amount under DTI constraint
 */
export function calculateMaxLoanByDTI(
  totalMonthlyIncome: number,
  existingDebts: number,
): number {
  if (totalMonthlyIncome <= 0) return 0;

  const annualIncome = totalMonthlyIncome * 12;
  const maxTotalDebt = annualIncome * MAX_DTI_MULTIPLIER;

  // Approximate existing debt as 5-year loans for total debt calculation
  // This is a simplification; banks would use actual remaining debt
  const estimatedExistingDebtTotal = existingDebts * 12 * 5;

  return Math.max(0, maxTotalDebt - estimatedExistingDebtTotal);
}

/**
 * Determine the applicable LTV rule based on buyer type and age.
 *
 * April 2026 rules:
 * - First-time buyer under 36: 90% LTV
 * - First-time buyer 36+: 80% LTV
 * - Investment property: 70% LTV
 *
 * @param buyerType - Type of buyer (first-home or investment)
 * @param age - Age of primary borrower
 * @returns Applicable LTV rule
 */
export function calculateApplicableLTV(
  buyerType: BuyerType,
  age: number,
): LTVRule {
  if (buyerType === "investment") {
    return LTV_RULES.find((rule) => rule.type === "investment")!;
  }

  // First-time buyer
  if (age < 36) {
    return LTV_RULES.find(
      (rule) =>
        rule.type === "first-home" &&
        rule.ageThreshold !== undefined &&
        age < rule.ageThreshold
    )!;
  }

  return LTV_RULES.find(
    (rule) => rule.type === "first-home" && rule.ageThreshold === undefined
  )!;
}

/**
 * Calculate maximum affordable mortgage based on Czech regulatory limits.
 *
 * Evaluates all three constraints (DSTI, DTI, LTV) and returns the most restrictive.
 *
 * @param params - Affordability calculation parameters
 * @returns Complete affordability analysis with max loan, binding constraint, and property price
 */
export function calculateAffordability(
  params: AffordabilityParams,
): AffordabilityResult {
  const {
    monthlyIncome,
    partnerIncome = 0,
    existingDebts,
    dependents,
    lifestyleBuffer,
    age,
    buyerType,
    annualRate,
    years,
    minDownPaymentPercent,
  } = params;

  const totalMonthlyIncome = monthlyIncome + partnerIncome;
  const availableMonthlyIncome = Math.max(
    0,
    (totalMonthlyIncome * MAX_DSTI_PERCENT) / 100 - existingDebts - lifestyleBuffer,
  );

  // Calculate max loan under each constraint
  const maxLoanByDSTI = calculateMaxLoanByDSTI(
    totalMonthlyIncome,
    existingDebts,
    lifestyleBuffer,
    annualRate,
    years,
  );

  const maxLoanByDTI = calculateMaxLoanByDTI(totalMonthlyIncome, existingDebts);

  // Determine applicable LTV rule
  const ltvRule = calculateApplicableLTV(buyerType, age);
  const downPaymentPercent = minDownPaymentPercent ?? (100 - ltvRule.maxLTV);

  // Find binding constraint (most restrictive)
  let maxLoan: number;
  let bindingConstraint: BindingConstraint;
  let constraintExplanation: string;

  // Start with DSTI and DTI, then apply LTV if needed
  if (maxLoanByDSTI <= maxLoanByDTI) {
    maxLoan = maxLoanByDSTI;
    bindingConstraint = "dsti";
    constraintExplanation = `Limitováno pravidlem DSTI (max. ${MAX_DSTI_PERCENT} % příjmu na splátky). Zvyšte příjem nebo snižte stávající dluhy.`;
  } else {
    maxLoan = maxLoanByDTI;
    bindingConstraint = "dti";
    constraintExplanation = `Limitováno pravidlem DTI (max. ${MAX_DTI_MULTIPLIER}× roční příjem). Zvyšte příjem nebo splaťte stávající dluhy.`;
  }

  // Calculate max property price from max loan
  const maxPropertyPriceFromIncome = maxLoan / (ltvRule.maxLTV / 100);

  // Check if LTV becomes binding constraint due to down payment requirement
  // (This happens when user's income allows a bigger loan than LTV permits)
  const maxPropertyPrice = maxPropertyPriceFromIncome;
  const downPaymentAmount = maxPropertyPrice * (downPaymentPercent / 100);
  const loanAmount = maxPropertyPrice - downPaymentAmount;

  // If the LTV-constrained loan is smaller than income-constrained loan,
  // LTV is the binding constraint (this usually doesn't happen in practice
  // since we calculate from max loan backwards, but worth checking)
  if (loanAmount < maxLoan) {
    maxLoan = loanAmount;
    bindingConstraint = "ltv";
    constraintExplanation = `Limitováno pravidlem LTV (${ltvRule.description}). Potřebujete ${downPaymentPercent} % vlastních prostředků.`;
  }

  const monthlyPayment = calculateMonthlyPayment(maxLoan, annualRate, years);

  return {
    maxLoanByDSTI,
    maxLoanByDTI,
    ltvRule,
    maxLoan,
    bindingConstraint,
    constraintExplanation,
    maxPropertyPrice,
    downPaymentPercent,
    downPaymentAmount,
    monthlyPayment,
    totalMonthlyIncome,
    availableMonthlyIncome,
  };
}
