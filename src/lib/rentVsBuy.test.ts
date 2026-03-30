import { describe, it, expect } from 'vitest';
import { compareRentVsBuy, type RentVsBuyParams } from './rentVsBuy';

const baseParams: RentVsBuyParams = {
  propertyPrice: 5_000_000,
  downPayment: 1_000_000,
  mortgageRate: 4.5,
  mortgageYears: 30,
  monthlyRent: 16_667,
  propertyAppreciation: 5,
  investmentReturnRate: 7,
  ownershipCostPercent: 1.45, // fond oprav + insurance + tax + maintenance
  transactionCosts: {
    notary: 20_000,
    valuation: 7_000,
    bankFee: 12_000,
    agentCommission: 0,
  },
  taxDeductionCap: 150_000,
};

describe('compareRentVsBuy', () => {
  describe('basic behavior', () => {
    it('should return results for each year of the mortgage', () => {
      const results = compareRentVsBuy(baseParams);
      expect(results).toHaveLength(30);
      expect(results[0].year).toBe(1);
      expect(results[29].year).toBe(30);
    });

    it('should return empty array for invalid property price', () => {
      expect(compareRentVsBuy({ ...baseParams, propertyPrice: 0 })).toEqual([]);
      expect(compareRentVsBuy({ ...baseParams, propertyPrice: -1 })).toEqual([]);
    });

    it('should return empty array for invalid mortgage years', () => {
      expect(compareRentVsBuy({ ...baseParams, mortgageYears: 0 })).toEqual([]);
    });
  });

  describe('property appreciation', () => {
    it('should increase property value over time', () => {
      const results = compareRentVsBuy(baseParams);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].propertyValue).toBeGreaterThan(results[i - 1].propertyValue);
      }
    });

    it('should not appreciate with 0% rate', () => {
      const results = compareRentVsBuy({ ...baseParams, propertyAppreciation: 0 });
      for (const r of results) {
        expect(r.propertyValue).toBe(5_000_000);
      }
    });
  });

  describe('mortgage balance', () => {
    it('should decrease over time', () => {
      const results = compareRentVsBuy(baseParams);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].mortgageBalance).toBeLessThan(results[i - 1].mortgageBalance);
      }
    });

    it('should be zero or near zero at end of term', () => {
      const results = compareRentVsBuy(baseParams);
      expect(results[results.length - 1].mortgageBalance).toBeLessThan(100);
    });
  });

  describe('ownership cost percent', () => {
    it('should have higher buying costs with higher ownership %', () => {
      const low = compareRentVsBuy({ ...baseParams, ownershipCostPercent: 0 });
      const high = compareRentVsBuy({ ...baseParams, ownershipCostPercent: 2.5 });

      expect(high[0].buyingMonthlyCost).toBeGreaterThan(low[0].buyingMonthlyCost);
    });

    it('should scale with property value', () => {
      const results = compareRentVsBuy(baseParams);
      // Monthly ownership cost = propertyPrice * 1.45% / 12 ≈ 6042
      const expectedMonthly = Math.round(5_000_000 * 0.0145 / 12);
      // Buying cost year 1 = mortgage + ownership
      // Mortgage for 4M at 4.5% for 30y ≈ 20267
      const buyingCost = results[0].buyingMonthlyCost;
      expect(buyingCost).toBeGreaterThan(20_000 + expectedMonthly - 2000); // approximate, tax savings reduce it
    });
  });

  describe('rent growth (tracks property appreciation)', () => {
    it('should grow rent at the same rate as property appreciation', () => {
      const results = compareRentVsBuy(baseParams);
      const rentYear1 = results[0].rentingMonthlyCost;
      const rentYear10 = results[9].rentingMonthlyCost;
      // Rent grows at 5% (same as property appreciation), applied at end of each year
      const expectedRent10 = Math.round(16_667 * Math.pow(1.05, 9));

      expect(rentYear10).toBeCloseTo(expectedRent10, -2);
      expect(rentYear10).toBeGreaterThan(rentYear1);
    });

    it('should not grow rent when appreciation is 0', () => {
      const results = compareRentVsBuy({ ...baseParams, propertyAppreciation: 0 });
      expect(results[0].rentingMonthlyCost).toBe(results[29].rentingMonthlyCost);
    });
  });

  describe('transaction costs', () => {
    it('should give renter the transaction costs as initial investment', () => {
      const results = compareRentVsBuy(baseParams);
      // Renter starts with downPayment + txCosts = 1,000,000 + 39,000 = 1,039,000
      expect(results[0].renterPortfolio).toBeGreaterThan(1_039_000);
    });

    it('should affect net worth comparison', () => {
      const lowTx = compareRentVsBuy({
        ...baseParams,
        transactionCosts: { notary: 0, valuation: 0, bankFee: 0, agentCommission: 0 },
      });
      const highTx = compareRentVsBuy({
        ...baseParams,
        transactionCosts: { notary: 20_000, valuation: 7_000, bankFee: 12_000, agentCommission: 200_000 },
      });

      expect(highTx[0].renterPortfolio).toBeGreaterThan(lowTx[0].renterPortfolio);
    });
  });

  describe('tax deduction', () => {
    it('should benefit the buyer (increase portfolio)', () => {
      const withDeduction = compareRentVsBuy(baseParams);
      const withoutDeduction = compareRentVsBuy({ ...baseParams, taxDeductionCap: 0 });

      expect(withDeduction[0].buyerPortfolio).toBeGreaterThan(withoutDeduction[0].buyerPortfolio);
    });
  });

  describe('net worth comparison', () => {
    it('should eventually favor buying with high appreciation and low costs', () => {
      const results = compareRentVsBuy({
        ...baseParams,
        ownershipCostPercent: 0,
      });
      const last = results[results.length - 1];
      expect(last.buyingNetWorth).toBeGreaterThan(last.rentingNetWorth);
    });

    it('should favor renting with 0% appreciation and high investment returns', () => {
      const results = compareRentVsBuy({
        ...baseParams,
        propertyAppreciation: 0,
        investmentReturnRate: 10,
      });
      const last = results[results.length - 1];
      expect(last.rentingNetWorth).toBeGreaterThan(last.buyingNetWorth);
    });
  });

  describe('rounding', () => {
    it('should round all monetary values to integers', () => {
      const results = compareRentVsBuy(baseParams);
      for (const r of results) {
        expect(Number.isInteger(r.buyingNetWorth)).toBe(true);
        expect(Number.isInteger(r.rentingNetWorth)).toBe(true);
        expect(Number.isInteger(r.buyingMonthlyCost)).toBe(true);
        expect(Number.isInteger(r.rentingMonthlyCost)).toBe(true);
        expect(Number.isInteger(r.propertyValue)).toBe(true);
        expect(Number.isInteger(r.mortgageBalance)).toBe(true);
        expect(Number.isInteger(r.buyerPortfolio)).toBe(true);
        expect(Number.isInteger(r.renterPortfolio)).toBe(true);
      }
    });
  });
});
