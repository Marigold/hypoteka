import { describe, it, expect } from 'vitest';
import {
  calculateTotalCostOfOwnership,
  getPragueDefaults,
  getRegionalDefaults,
  type TCOParams,
} from './totalCostOfOwnership';

describe('calculateTotalCostOfOwnership', () => {
  const baseParams: TCOParams = {
    propertyPrice: 5_000_000,
    downPayment: 1_000_000,
    mortgageRate: 4.5,
    mortgageYears: 30,
    propertyArea: 70,
    fondOpravPerSqmMonth: 15,
    propertyInsuranceAnnual: 3_000,
    propertyTaxAnnual: 2_400,
    maintenanceReserveRate: 1.0,
    energyCostsMonthly: 3_000,
    transactionCosts: {
      notary: 15_000,
      valuation: 5_000,
      bankFee: 10_000,
      agentCommission: 150_000,
    },
  };

  describe('basic calculation', () => {
    it('should calculate monthly mortgage payment correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // For a 4,000,000 CZK loan at 4.5% for 30 years
      // Monthly payment should be approximately 20,267 CZK
      expect(result.monthlyMortgagePayment).toBeGreaterThan(20_000);
      expect(result.monthlyMortgagePayment).toBeLessThan(21_000);
    });

    it('should calculate total monthly cost including all expenses', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // Should include mortgage + all other costs
      expect(result.totalMonthlyCost).toBeGreaterThan(result.monthlyMortgagePayment);

      // Total should equal mortgage + mandatory + variable costs
      const expectedTotal =
        result.monthlyMortgagePayment +
        result.costBreakdown.mandatoryCosts.total +
        result.costBreakdown.variableCosts.total;
      expect(result.totalMonthlyCost).toBe(expectedTotal);
    });

    it('should calculate hidden monthly costs correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // Hidden costs = total - mortgage payment
      const expectedHidden =
        result.totalMonthlyCost - result.monthlyMortgagePayment;
      expect(result.hiddenMonthlyCosts).toBe(expectedHidden);

      // Hidden costs should be positive
      expect(result.hiddenMonthlyCosts).toBeGreaterThan(0);
    });

    it('should calculate hidden costs percentage correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // Percentage should be (hidden / mortgage) * 100
      const expectedPercentage =
        (result.hiddenMonthlyCosts / result.monthlyMortgagePayment) * 100;

      // Allow for rounding differences (rounded to 2 decimal places)
      expect(result.hiddenCostsPercentage).toBeCloseTo(expectedPercentage, 1);

      // Should be positive
      expect(result.hiddenCostsPercentage).toBeGreaterThan(0);
    });
  });

  describe('mandatory costs', () => {
    it('should calculate fond oprav correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // 70 m² × 15 CZK/m²/month = 1,050 CZK
      expect(result.costBreakdown.mandatoryCosts.fondOprav).toBe(1_050);
    });

    it('should calculate monthly insurance correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // 3,000 CZK annual / 12 = 250 CZK monthly
      expect(result.costBreakdown.mandatoryCosts.insurance).toBe(250);
    });

    it('should calculate monthly tax correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // 2,400 CZK annual / 12 = 200 CZK monthly
      expect(result.costBreakdown.mandatoryCosts.tax).toBe(200);
    });

    it('should sum mandatory costs correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      const expectedTotal =
        result.costBreakdown.mandatoryCosts.fondOprav +
        result.costBreakdown.mandatoryCosts.insurance +
        result.costBreakdown.mandatoryCosts.tax;

      expect(result.costBreakdown.mandatoryCosts.total).toBe(expectedTotal);
    });

    it('should calculate mandatory costs percentage correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      const expectedPercentage =
        (result.costBreakdown.mandatoryCosts.total / result.totalMonthlyCost) * 100;

      expect(result.costBreakdown.mandatoryCosts.percentage).toBeCloseTo(
        expectedPercentage,
        1
      );
    });
  });

  describe('variable costs', () => {
    it('should calculate monthly maintenance reserve correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // 5,000,000 CZK × 1.0% / 12 = 4,167 CZK monthly (rounded)
      expect(result.costBreakdown.variableCosts.maintenance).toBeCloseTo(4_167, -1);
    });

    it('should use energy costs as provided', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      expect(result.costBreakdown.variableCosts.energy).toBe(3_000);
    });

    it('should sum variable costs correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      const expectedTotal =
        result.costBreakdown.variableCosts.maintenance +
        result.costBreakdown.variableCosts.energy;

      expect(result.costBreakdown.variableCosts.total).toBe(expectedTotal);
    });

    it('should calculate variable costs percentage correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      const expectedPercentage =
        (result.costBreakdown.variableCosts.total / result.totalMonthlyCost) * 100;

      expect(result.costBreakdown.variableCosts.percentage).toBeCloseTo(
        expectedPercentage,
        1
      );
    });
  });

  describe('transaction costs', () => {
    it('should sum all transaction costs correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // 15,000 + 5,000 + 10,000 + 150,000 = 180,000
      expect(result.costBreakdown.transactionCostsTotal).toBe(180_000);
    });

    it('should handle zero transaction costs', () => {
      const params = {
        ...baseParams,
        transactionCosts: {
          notary: 0,
          valuation: 0,
          bankFee: 0,
          agentCommission: 0,
        },
      };

      const result = calculateTotalCostOfOwnership(params);

      expect(result.costBreakdown.transactionCostsTotal).toBe(0);
    });
  });

  describe('lifetime costs', () => {
    it('should calculate total mortgage payments correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // Monthly payment × 360 months (approximate due to rounding)
      const expectedTotal = result.monthlyMortgagePayment * 360;

      // Allow for small rounding differences (within 1000 CZK)
      expect(result.lifetimeCosts.totalMortgagePayments).toBeCloseTo(expectedTotal, -3);

      // Should be a large positive value
      expect(result.lifetimeCosts.totalMortgagePayments).toBeGreaterThan(7_000_000);
    });

    it('should calculate total ownership costs correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // (Mandatory + variable) × 360 months (approximate due to rounding)
      const monthlyOwnershipCosts =
        result.costBreakdown.mandatoryCosts.total +
        result.costBreakdown.variableCosts.total;
      const expectedTotal = monthlyOwnershipCosts * 360;

      // Allow for small rounding differences (within 1000 CZK)
      expect(result.lifetimeCosts.totalOwnershipCosts).toBeCloseTo(expectedTotal, -3);

      // Should be a large positive value
      expect(result.lifetimeCosts.totalOwnershipCosts).toBeGreaterThan(3_000_000);
    });

    it('should calculate lifetime total without inflation correctly', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      const expectedTotal =
        result.lifetimeCosts.totalMortgagePayments +
        result.lifetimeCosts.totalOwnershipCosts +
        result.costBreakdown.transactionCostsTotal;

      expect(result.lifetimeCosts.totalWithoutInflation).toBe(expectedTotal);
    });

    it('should handle zero inflation rate', () => {
      const params = { ...baseParams, inflationRate: 0 };
      const result = calculateTotalCostOfOwnership(params);

      // With zero inflation, both totals should be the same
      expect(result.lifetimeCosts.totalWithInflation).toBe(
        result.lifetimeCosts.totalWithoutInflation
      );
    });

    it('should calculate higher costs with inflation', () => {
      const params = { ...baseParams, inflationRate: 3.0 };
      const result = calculateTotalCostOfOwnership(params);

      // With inflation, total should be higher
      expect(result.lifetimeCosts.totalWithInflation).toBeGreaterThan(
        result.lifetimeCosts.totalWithoutInflation
      );
    });

    it('should apply inflation only to ownership costs, not mortgage', () => {
      const params = { ...baseParams, inflationRate: 3.0 };
      const result = calculateTotalCostOfOwnership(params);

      // Mortgage payments should be the same in both calculations
      const noInflationResult = calculateTotalCostOfOwnership({
        ...params,
        inflationRate: 0,
      });

      // The difference should be only in ownership costs
      const inflationImpact =
        result.lifetimeCosts.totalWithInflation -
        result.lifetimeCosts.totalWithoutInflation;

      expect(inflationImpact).toBeGreaterThan(0);

      // Transaction costs should be included in both
      expect(result.lifetimeCosts.totalWithInflation).toBeGreaterThan(
        result.lifetimeCosts.totalMortgagePayments +
          result.costBreakdown.transactionCostsTotal
      );
    });
  });

  describe('edge cases', () => {
    it('should return zero values for invalid property price', () => {
      const params = { ...baseParams, propertyPrice: 0 };
      const result = calculateTotalCostOfOwnership(params);

      expect(result.monthlyMortgagePayment).toBe(0);
      expect(result.totalMonthlyCost).toBe(0);
      expect(result.hiddenMonthlyCosts).toBe(0);
      expect(result.hiddenCostsPercentage).toBe(0);
    });

    it('should return zero values for negative property price', () => {
      const params = { ...baseParams, propertyPrice: -1_000_000 };
      const result = calculateTotalCostOfOwnership(params);

      expect(result.monthlyMortgagePayment).toBe(0);
      expect(result.totalMonthlyCost).toBe(0);
    });

    it('should return zero values for invalid mortgage years', () => {
      const params = { ...baseParams, mortgageYears: 0 };
      const result = calculateTotalCostOfOwnership(params);

      expect(result.monthlyMortgagePayment).toBe(0);
      expect(result.totalMonthlyCost).toBe(0);
    });

    it('should return zero values for negative down payment', () => {
      const params = { ...baseParams, downPayment: -100_000 };
      const result = calculateTotalCostOfOwnership(params);

      expect(result.monthlyMortgagePayment).toBe(0);
      expect(result.totalMonthlyCost).toBe(0);
    });

    it('should handle zero mortgage rate', () => {
      const params = { ...baseParams, mortgageRate: 0 };
      const result = calculateTotalCostOfOwnership(params);

      // Should still calculate payment (simple division)
      expect(result.monthlyMortgagePayment).toBeGreaterThan(0);

      // 4,000,000 / 360 months ≈ 11,111 CZK
      expect(result.monthlyMortgagePayment).toBeCloseTo(11_111, -2);
    });

    it('should handle 100% down payment', () => {
      const params = { ...baseParams, downPayment: 5_000_000 };
      const result = calculateTotalCostOfOwnership(params);

      // No loan = no mortgage payment
      expect(result.monthlyMortgagePayment).toBe(0);

      // But still have ownership costs
      expect(result.totalMonthlyCost).toBeGreaterThan(0);
      expect(result.totalMonthlyCost).toBe(
        result.costBreakdown.mandatoryCosts.total +
          result.costBreakdown.variableCosts.total
      );
    });

    it('should handle zero property area', () => {
      const params = { ...baseParams, propertyArea: 0 };
      const result = calculateTotalCostOfOwnership(params);

      // Fond oprav should be 0
      expect(result.costBreakdown.mandatoryCosts.fondOprav).toBe(0);

      // But other costs should still be calculated
      expect(result.monthlyMortgagePayment).toBeGreaterThan(0);
    });

    it('should handle zero maintenance rate', () => {
      const params = { ...baseParams, maintenanceReserveRate: 0 };
      const result = calculateTotalCostOfOwnership(params);

      expect(result.costBreakdown.variableCosts.maintenance).toBe(0);
    });

    it('should handle zero energy costs', () => {
      const params = { ...baseParams, energyCostsMonthly: 0 };
      const result = calculateTotalCostOfOwnership(params);

      expect(result.costBreakdown.variableCosts.energy).toBe(0);
    });
  });

  describe('realistic scenarios', () => {
    it('should calculate correctly for small property with high rate', () => {
      const params: TCOParams = {
        propertyPrice: 2_500_000,
        downPayment: 500_000,
        mortgageRate: 6.0,
        mortgageYears: 20,
        propertyArea: 45,
        fondOpravPerSqmMonth: 20,
        propertyInsuranceAnnual: 2_500,
        propertyTaxAnnual: 1_500,
        maintenanceReserveRate: 1.5,
        energyCostsMonthly: 2_500,
        transactionCosts: {
          notary: 10_000,
          valuation: 4_000,
          bankFee: 8_000,
          agentCommission: 75_000,
        },
      };

      const result = calculateTotalCostOfOwnership(params);

      expect(result.monthlyMortgagePayment).toBeGreaterThan(0);
      expect(result.totalMonthlyCost).toBeGreaterThan(result.monthlyMortgagePayment);
      expect(result.hiddenCostsPercentage).toBeGreaterThan(0);
    });

    it('should calculate correctly for expensive property with low rate', () => {
      const params: TCOParams = {
        propertyPrice: 15_000_000,
        downPayment: 3_000_000,
        mortgageRate: 3.5,
        mortgageYears: 30,
        propertyArea: 120,
        fondOpravPerSqmMonth: 25,
        propertyInsuranceAnnual: 8_000,
        propertyTaxAnnual: 6_000,
        maintenanceReserveRate: 0.5,
        energyCostsMonthly: 5_000,
        transactionCosts: {
          notary: 25_000,
          valuation: 8_000,
          bankFee: 15_000,
          agentCommission: 450_000,
        },
        inflationRate: 2.5,
      };

      const result = calculateTotalCostOfOwnership(params);

      expect(result.monthlyMortgagePayment).toBeGreaterThan(0);
      expect(result.totalMonthlyCost).toBeGreaterThan(result.monthlyMortgagePayment);
      expect(result.lifetimeCosts.totalWithInflation).toBeGreaterThan(
        result.lifetimeCosts.totalWithoutInflation
      );
    });
  });

  describe('rounding', () => {
    it('should round all monetary values to integers', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      expect(Number.isInteger(result.monthlyMortgagePayment)).toBe(true);
      expect(Number.isInteger(result.totalMonthlyCost)).toBe(true);
      expect(Number.isInteger(result.hiddenMonthlyCosts)).toBe(true);
      expect(Number.isInteger(result.costBreakdown.mortgagePayment)).toBe(true);
      expect(Number.isInteger(result.costBreakdown.mandatoryCosts.fondOprav)).toBe(true);
      expect(Number.isInteger(result.costBreakdown.mandatoryCosts.insurance)).toBe(true);
      expect(Number.isInteger(result.costBreakdown.mandatoryCosts.tax)).toBe(true);
      expect(Number.isInteger(result.costBreakdown.mandatoryCosts.total)).toBe(true);
      expect(Number.isInteger(result.costBreakdown.variableCosts.maintenance)).toBe(true);
      expect(Number.isInteger(result.costBreakdown.variableCosts.energy)).toBe(true);
      expect(Number.isInteger(result.costBreakdown.variableCosts.total)).toBe(true);
      expect(Number.isInteger(result.lifetimeCosts.totalWithoutInflation)).toBe(true);
      expect(Number.isInteger(result.lifetimeCosts.totalWithInflation)).toBe(true);
      expect(Number.isInteger(result.lifetimeCosts.totalMortgagePayments)).toBe(true);
      expect(Number.isInteger(result.lifetimeCosts.totalOwnershipCosts)).toBe(true);
    });

    it('should round percentages to 2 decimal places', () => {
      const result = calculateTotalCostOfOwnership(baseParams);

      // Check that percentages have at most 2 decimal places
      const hiddenCostsDecimals = (result.hiddenCostsPercentage.toString().split('.')[1] || '').length;
      expect(hiddenCostsDecimals).toBeLessThanOrEqual(2);

      const mandatoryDecimals = (result.costBreakdown.mandatoryCosts.percentage.toString().split('.')[1] || '').length;
      expect(mandatoryDecimals).toBeLessThanOrEqual(2);

      const variableDecimals = (result.costBreakdown.variableCosts.percentage.toString().split('.')[1] || '').length;
      expect(variableDecimals).toBeLessThanOrEqual(2);
    });
  });
});

describe('getPragueDefaults', () => {
  it('should return Prague-specific defaults', () => {
    const defaults = getPragueDefaults();

    expect(defaults.fondOpravPerSqmMonth).toBe(18);
    expect(defaults.propertyInsuranceAnnual).toBe(3_500);
    expect(defaults.propertyTaxAnnual).toBe(3_000);
    expect(defaults.energyCostsMonthly).toBe(3_500);
  });

  it('should return values higher than regional defaults', () => {
    const pragueDefaults = getPragueDefaults();
    const regionalDefaults = getRegionalDefaults();

    expect(pragueDefaults.fondOpravPerSqmMonth).toBeGreaterThan(
      regionalDefaults.fondOpravPerSqmMonth
    );
    expect(pragueDefaults.propertyInsuranceAnnual).toBeGreaterThan(
      regionalDefaults.propertyInsuranceAnnual
    );
    expect(pragueDefaults.propertyTaxAnnual).toBeGreaterThan(
      regionalDefaults.propertyTaxAnnual
    );
    expect(pragueDefaults.energyCostsMonthly).toBeGreaterThan(
      regionalDefaults.energyCostsMonthly
    );
  });
});

describe('getRegionalDefaults', () => {
  it('should return regional defaults', () => {
    const defaults = getRegionalDefaults();

    expect(defaults.fondOpravPerSqmMonth).toBe(12);
    expect(defaults.propertyInsuranceAnnual).toBe(2_500);
    expect(defaults.propertyTaxAnnual).toBe(2_000);
    expect(defaults.energyCostsMonthly).toBe(2_800);
  });

  it('should return lower values than Prague defaults', () => {
    const regionalDefaults = getRegionalDefaults();
    const pragueDefaults = getPragueDefaults();

    expect(regionalDefaults.fondOpravPerSqmMonth).toBeLessThan(
      pragueDefaults.fondOpravPerSqmMonth
    );
    expect(regionalDefaults.propertyInsuranceAnnual).toBeLessThan(
      pragueDefaults.propertyInsuranceAnnual
    );
    expect(regionalDefaults.propertyTaxAnnual).toBeLessThan(
      pragueDefaults.propertyTaxAnnual
    );
    expect(regionalDefaults.energyCostsMonthly).toBeLessThan(
      pragueDefaults.energyCostsMonthly
    );
  });
});
