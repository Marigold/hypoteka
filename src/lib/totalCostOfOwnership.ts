/**
 * Total Cost of Ownership calculation logic.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%),
 * and durations are in years.
 */

import { calculateMonthlyPayment } from "./mortgage";

export interface TCOParams {
  /** Property purchase price in CZK */
  propertyPrice: number;
  /** Down payment in CZK */
  downPayment: number;
  /** Annual mortgage interest rate as percentage (e.g. 4.5) */
  mortgageRate: number;
  /** Mortgage duration in years */
  mortgageYears: number;
  /** Property area in square meters */
  propertyArea: number;
  /** Fond oprav (repair fund) contribution in CZK per m² per month */
  fondOpravPerSqmMonth: number;
  /** Annual property insurance in CZK */
  propertyInsuranceAnnual: number;
  /** Annual property tax (daň z nemovitosti) in CZK */
  propertyTaxAnnual: number;
  /** Annual maintenance reserve as percentage of property value (e.g. 1.0) */
  maintenanceReserveRate: number;
  /** Estimated monthly energy costs in CZK */
  energyCostsMonthly: number;
  /** Transaction costs configuration */
  transactionCosts: TransactionCosts;
  /** Annual inflation rate as percentage (e.g. 3.0) for lifetime cost calculations */
  inflationRate?: number;
}

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

export interface TCOResult {
  /** Monthly mortgage payment in CZK */
  monthlyMortgagePayment: number;
  /** True total monthly cost including all ownership costs in CZK */
  totalMonthlyCost: number;
  /** Difference between total monthly cost and mortgage payment in CZK */
  hiddenMonthlyCosts: number;
  /** Hidden costs as percentage of mortgage payment */
  hiddenCostsPercentage: number;
  /** Detailed cost breakdown by category */
  costBreakdown: CostBreakdown;
  /** Total costs over the lifetime of the mortgage */
  lifetimeCosts: LifetimeCosts;
}

export interface CostBreakdown {
  /** Monthly mortgage payment in CZK */
  mortgagePayment: number;
  /** Mandatory costs (fond oprav, insurance, tax) */
  mandatoryCosts: MandatoryCosts;
  /** Variable costs (maintenance, energy) */
  variableCosts: VariableCosts;
  /** One-time transaction costs in CZK */
  transactionCostsTotal: number;
}

export interface MandatoryCosts {
  /** Monthly fond oprav contribution in CZK */
  fondOprav: number;
  /** Monthly property insurance (annual / 12) in CZK */
  insurance: number;
  /** Monthly property tax (annual / 12) in CZK */
  tax: number;
  /** Total monthly mandatory costs in CZK */
  total: number;
  /** Mandatory costs as percentage of total monthly cost */
  percentage: number;
}

export interface VariableCosts {
  /** Monthly maintenance reserve in CZK */
  maintenance: number;
  /** Monthly energy costs in CZK */
  energy: number;
  /** Total monthly variable costs in CZK */
  total: number;
  /** Variable costs as percentage of total monthly cost */
  percentage: number;
}

export interface LifetimeCosts {
  /** Total cost over mortgage term without inflation adjustment in CZK */
  totalWithoutInflation: number;
  /** Total cost over mortgage term with inflation adjustment in CZK */
  totalWithInflation: number;
  /** Total mortgage payments only (principal + interest) in CZK */
  totalMortgagePayments: number;
  /** Total additional ownership costs (non-mortgage) in CZK */
  totalOwnershipCosts: number;
}

export interface RegionalDefaults {
  /** Typical fond oprav in CZK per m² per month */
  fondOpravPerSqmMonth: number;
  /** Typical annual property insurance in CZK */
  propertyInsuranceAnnual: number;
  /** Typical annual property tax in CZK */
  propertyTaxAnnual: number;
  /** Typical monthly energy costs in CZK */
  energyCostsMonthly: number;
}

/**
 * Calculate the total cost of ownership for a property.
 *
 * This function computes the true monthly cost of owning a property including
 * mortgage payments, mandatory costs (fond oprav, insurance, tax), and variable
 * costs (maintenance, energy). It also calculates lifetime costs with optional
 * inflation adjustment.
 *
 * @param params - Total cost of ownership parameters
 * @returns Complete TCO analysis including monthly costs and lifetime totals
 *
 * @example
 * calculateTotalCostOfOwnership({
 *   propertyPrice: 5_000_000,
 *   downPayment: 1_000_000,
 *   mortgageRate: 4.5,
 *   mortgageYears: 30,
 *   propertyArea: 70,
 *   fondOpravPerSqmMonth: 15,
 *   propertyInsuranceAnnual: 3_000,
 *   propertyTaxAnnual: 2_400,
 *   maintenanceReserveRate: 1.0,
 *   energyCostsMonthly: 3_000,
 *   transactionCosts: { notary: 15_000, valuation: 5_000, bankFee: 10_000, agentCommission: 150_000 },
 *   inflationRate: 3.0
 * })
 */
export function calculateTotalCostOfOwnership(params: TCOParams): TCOResult {
  const {
    propertyPrice,
    downPayment,
    mortgageRate,
    mortgageYears,
    propertyArea,
    fondOpravPerSqmMonth,
    propertyInsuranceAnnual,
    propertyTaxAnnual,
    maintenanceReserveRate,
    energyCostsMonthly,
    transactionCosts,
    inflationRate = 0,
  } = params;

  // Validate inputs
  if (propertyPrice <= 0 || mortgageYears <= 0 || downPayment < 0) {
    return {
      monthlyMortgagePayment: 0,
      totalMonthlyCost: 0,
      hiddenMonthlyCosts: 0,
      hiddenCostsPercentage: 0,
      costBreakdown: {
        mortgagePayment: 0,
        mandatoryCosts: {
          fondOprav: 0,
          insurance: 0,
          tax: 0,
          total: 0,
          percentage: 0,
        },
        variableCosts: {
          maintenance: 0,
          energy: 0,
          total: 0,
          percentage: 0,
        },
        transactionCostsTotal: 0,
      },
      lifetimeCosts: {
        totalWithoutInflation: 0,
        totalWithInflation: 0,
        totalMortgagePayments: 0,
        totalOwnershipCosts: 0,
      },
    };
  }

  // Calculate mortgage payment
  const loanAmount = propertyPrice - downPayment;
  const monthlyMortgage = calculateMonthlyPayment(
    loanAmount,
    mortgageRate,
    mortgageYears,
  );

  // Calculate mandatory costs (monthly)
  const fondOprav = propertyArea * fondOpravPerSqmMonth;
  const insurance = propertyInsuranceAnnual / 12;
  const tax = propertyTaxAnnual / 12;
  const mandatoryTotal = fondOprav + insurance + tax;

  // Calculate variable costs (monthly)
  const maintenance = (propertyPrice * (maintenanceReserveRate / 100)) / 12;
  const energy = energyCostsMonthly;
  const variableTotal = maintenance + energy;

  // Calculate total monthly cost
  const totalMonthly = monthlyMortgage + mandatoryTotal + variableTotal;

  // Calculate hidden costs
  const hiddenCosts = mandatoryTotal + variableTotal;
  const hiddenCostsPercentage =
    monthlyMortgage > 0 ? (hiddenCosts / monthlyMortgage) * 100 : 0;

  // Calculate transaction costs total
  const transactionCostsTotal =
    transactionCosts.notary +
    transactionCosts.valuation +
    transactionCosts.bankFee +
    transactionCosts.agentCommission;

  // Calculate lifetime costs
  const months = mortgageYears * 12;
  const totalMortgagePayments = monthlyMortgage * months;
  const monthlyOwnershipCosts = mandatoryTotal + variableTotal;

  // Calculate lifetime costs without inflation
  let totalOwnershipCostsWithoutInflation = monthlyOwnershipCosts * months;
  const totalWithoutInflation =
    totalMortgagePayments + totalOwnershipCostsWithoutInflation + transactionCostsTotal;

  // Calculate lifetime costs with inflation
  let totalOwnershipCostsWithInflation = 0;
  if (inflationRate > 0) {
    const monthlyInflationRate = inflationRate / 100 / 12;
    for (let month = 1; month <= months; month++) {
      const inflationFactor = Math.pow(1 + monthlyInflationRate, month);
      totalOwnershipCostsWithInflation += monthlyOwnershipCosts * inflationFactor;
    }
  } else {
    totalOwnershipCostsWithInflation = totalOwnershipCostsWithoutInflation;
  }

  const totalWithInflation =
    totalMortgagePayments + totalOwnershipCostsWithInflation + transactionCostsTotal;

  // Calculate percentages for breakdown
  const mandatoryPercentage = totalMonthly > 0 ? (mandatoryTotal / totalMonthly) * 100 : 0;
  const variablePercentage = totalMonthly > 0 ? (variableTotal / totalMonthly) * 100 : 0;

  return {
    monthlyMortgagePayment: Math.round(monthlyMortgage),
    totalMonthlyCost: Math.round(totalMonthly),
    hiddenMonthlyCosts: Math.round(hiddenCosts),
    hiddenCostsPercentage: Math.round(hiddenCostsPercentage * 100) / 100,
    costBreakdown: {
      mortgagePayment: Math.round(monthlyMortgage),
      mandatoryCosts: {
        fondOprav: Math.round(fondOprav),
        insurance: Math.round(insurance),
        tax: Math.round(tax),
        total: Math.round(mandatoryTotal),
        percentage: Math.round(mandatoryPercentage * 100) / 100,
      },
      variableCosts: {
        maintenance: Math.round(maintenance),
        energy: Math.round(energy),
        total: Math.round(variableTotal),
        percentage: Math.round(variablePercentage * 100) / 100,
      },
      transactionCostsTotal: Math.round(transactionCostsTotal),
    },
    lifetimeCosts: {
      totalWithoutInflation: Math.round(totalWithoutInflation),
      totalWithInflation: Math.round(totalWithInflation),
      totalMortgagePayments: Math.round(totalMortgagePayments),
      totalOwnershipCosts: Math.round(totalOwnershipCostsWithoutInflation),
    },
  };
}

/**
 * Get typical cost defaults for Prague properties.
 *
 * Based on market averages for newer buildings in Prague with typical
 * amenities and services.
 *
 * @returns Regional defaults for Prague properties
 *
 * @example
 * const pragueDefaults = getPragueDefaults();
 * // Use these values to pre-fill form inputs for Prague properties
 */
export function getPragueDefaults(): RegionalDefaults {
  return {
    fondOpravPerSqmMonth: 18,
    propertyInsuranceAnnual: 3_500,
    propertyTaxAnnual: 3_000,
    energyCostsMonthly: 3_500,
  };
}

/**
 * Get typical cost defaults for regional properties (outside Prague).
 *
 * Based on market averages for properties outside Prague and major cities,
 * typically lower than Prague due to older buildings and lower service costs.
 *
 * @returns Regional defaults for properties outside Prague
 *
 * @example
 * const regionalDefaults = getRegionalDefaults();
 * // Use these values to pre-fill form inputs for non-Prague properties
 */
export function getRegionalDefaults(): RegionalDefaults {
  return {
    fondOpravPerSqmMonth: 12,
    propertyInsuranceAnnual: 2_500,
    propertyTaxAnnual: 2_000,
    energyCostsMonthly: 2_800,
  };
}
