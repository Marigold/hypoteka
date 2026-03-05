/**
 * Total Cost of Ownership calculation logic.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%),
 * and durations are in years.
 */

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
