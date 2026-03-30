import { persistentAtom } from '@nanostores/persistent';
import { computed } from 'nanostores';
import { $propertyPrice } from './mortgage';

// --- Ownership cost defaults ---

export interface OwnershipCostDefaults {
  propertyArea: number;
  fondOpravPerSqmMonth: number;
  insuranceAnnual: number;
  propertyTaxAnnual: number;
  maintenanceRate: number;
  energyMonthly: number;
  reconstructionIntervalYears: number;
  reconstructionCostPercent: number;
}

export const PRAGUE_DEFAULTS: OwnershipCostDefaults = {
  propertyArea: 60,
  fondOpravPerSqmMonth: 20,
  insuranceAnnual: 4_000,
  propertyTaxAnnual: 4_000,
  maintenanceRate: 1.0,
  energyMonthly: 3_500,
  reconstructionIntervalYears: 15,
  reconstructionCostPercent: 10,
};

export const REGIONAL_DEFAULTS: OwnershipCostDefaults = {
  propertyArea: 70,
  fondOpravPerSqmMonth: 12,
  insuranceAnnual: 2_500,
  propertyTaxAnnual: 1_500,
  maintenanceRate: 1.0,
  energyMonthly: 2_500,
  reconstructionIntervalYears: 15,
  reconstructionCostPercent: 10,
};

// --- Transaction cost defaults ---

export interface TransactionCostDefaults {
  notary: number;
  valuation: number;
  bankFee: number;
  agentCommission: number;
}

export const PRAGUE_TRANSACTION_DEFAULTS: TransactionCostDefaults = {
  notary: 20_000,
  valuation: 7_000,
  bankFee: 12_000,
  agentCommission: 0,
};

export const REGIONAL_TRANSACTION_DEFAULTS: TransactionCostDefaults = {
  notary: 15_000,
  valuation: 5_000,
  bankFee: 10_000,
  agentCommission: 0,
};

// --- Persistent stores ---

function persistNum(key: string, defaultValue: number) {
  return persistentAtom<number>(`hypoteka:${key}`, defaultValue, {
    encode: JSON.stringify,
    decode: JSON.parse,
  });
}

export type Region = 'prague' | 'regional';

export const $region = persistentAtom<Region>('hypoteka:region', 'prague', {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export const $propertyArea = persistNum('property-area', PRAGUE_DEFAULTS.propertyArea);
export const $fondOpravPerSqmMonth = persistNum('fond-oprav', PRAGUE_DEFAULTS.fondOpravPerSqmMonth);
export const $insuranceAnnual = persistNum('insurance-annual', PRAGUE_DEFAULTS.insuranceAnnual);
export const $propertyTaxAnnual = persistNum('property-tax-annual', PRAGUE_DEFAULTS.propertyTaxAnnual);
export const $maintenanceRate = persistNum('maintenance-rate', PRAGUE_DEFAULTS.maintenanceRate);
export const $energyMonthly = persistNum('energy-monthly', PRAGUE_DEFAULTS.energyMonthly);
export const $reconstructionIntervalYears = persistNum('reconstruction-interval', PRAGUE_DEFAULTS.reconstructionIntervalYears);
export const $reconstructionCostPercent = persistNum('reconstruction-cost-percent', PRAGUE_DEFAULTS.reconstructionCostPercent);

// Transaction costs
export const $notary = persistNum('notary', PRAGUE_TRANSACTION_DEFAULTS.notary);
export const $valuation = persistNum('valuation', PRAGUE_TRANSACTION_DEFAULTS.valuation);
export const $bankFee = persistNum('bank-fee', PRAGUE_TRANSACTION_DEFAULTS.bankFee);
export const $agentCommission = persistNum('agent-commission', PRAGUE_TRANSACTION_DEFAULTS.agentCommission);

/**
 * Apply region defaults to all ownership cost stores.
 */
export function applyRegionDefaults(region: Region) {
  const defaults = region === 'prague' ? PRAGUE_DEFAULTS : REGIONAL_DEFAULTS;
  const txDefaults = region === 'prague' ? PRAGUE_TRANSACTION_DEFAULTS : REGIONAL_TRANSACTION_DEFAULTS;

  $region.set(region);
  $propertyArea.set(defaults.propertyArea);
  $fondOpravPerSqmMonth.set(defaults.fondOpravPerSqmMonth);
  $insuranceAnnual.set(defaults.insuranceAnnual);
  $propertyTaxAnnual.set(defaults.propertyTaxAnnual);
  $maintenanceRate.set(defaults.maintenanceRate);
  $energyMonthly.set(defaults.energyMonthly);
  $reconstructionIntervalYears.set(defaults.reconstructionIntervalYears);
  $reconstructionCostPercent.set(defaults.reconstructionCostPercent);
  $notary.set(txDefaults.notary);
  $valuation.set(txDefaults.valuation);
  $bankFee.set(txDefaults.bankFee);
  $agentCommission.set(txDefaults.agentCommission);
}

/**
 * Computed: annual ownership costs (excluding energy — renters pay that too)
 * as a percentage of property price. Used by Rent vs Buy calculator.
 */
export const $ownershipCostPercent = computed(
  [$propertyPrice, $propertyArea, $fondOpravPerSqmMonth, $insuranceAnnual, $propertyTaxAnnual, $maintenanceRate],
  (price, area, fondOprav, insurance, tax, maintenance) => {
    if (price <= 0) return 0;
    const annualFondOprav = area * fondOprav * 12;
    const annualMaintenance = price * (maintenance / 100);
    const totalAnnual = annualFondOprav + insurance + tax + annualMaintenance;
    return Math.round((totalAnnual / price) * 10000) / 100; // round to 2 decimal places
  },
);
