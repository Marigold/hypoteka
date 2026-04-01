/**
 * Shared default values for calculators.
 *
 * These ensure consistent assumptions across all tools so that switching
 * between calculators doesn't surprise users with different numbers.
 *
 * Sources / rationale:
 *  - Property appreciation 3 %: long-term CZ average (ČSÚ, nominal, conservative)
 *  - Rental yield 4 %: Prague gross yield ~3.5-4.5 % (Deloitte Property Index)
 *  - Investment return 7 %: global equity real return ~7 % (MSCI World long-term)
 *  - Maintenance 1 %: rule-of-thumb annual upkeep as % of property value
 *  - Transaction cost 4 %: notary + valuation + bank fee + misc.
 *  - Rental tax 10.5 %: effective CZ rate (30 % flat deduction → 70 % × 15 %)
 */

/** Annual property price growth, nominal (%) — ~3 % real + ~2 % inflation (ČNB target) */
export const DEFAULT_PROPERTY_APPRECIATION = 5;

/** Gross rental yield — annual rent as % of property price */
export const DEFAULT_RENTAL_YIELD = 4;

/** Annual return on equity investments (%) */
export const DEFAULT_INVESTMENT_RETURN = 7;

/** Annual maintenance cost as % of property value */
export const DEFAULT_MAINTENANCE_RATE = 1;

/** One-time transaction costs as % of property price */
export const DEFAULT_TRANSACTION_COST_PERCENT = 4;

/** Effective rental income tax rate (%) */
export const DEFAULT_RENTAL_TAX_RATE = 10.5;
