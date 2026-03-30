import { describe, it, expect } from 'vitest';
import {
  calculateAffordability,
  calculateMaxLoanByDSTI,
  calculateMaxLoanByDTI,
  calculateApplicableLTV,
  type AffordabilityParams,
  type BuyerType,
} from './affordability';

const baseParams: AffordabilityParams = {
  monthlyIncome: 50_000,
  partnerIncome: 0,
  existingDebts: 0,
  dependents: 0,
  lifestyleBuffer: 5_000,
  age: 30,
  buyerType: 'first-home',
  annualRate: 4.5,
  years: 30,
};

describe('calculateMaxLoanByDSTI', () => {
  describe('basic behavior', () => {
    it('should return max loan based on 45% DSTI limit', () => {
      const maxLoan = calculateMaxLoanByDSTI(50_000, 0, 5_000, 4.5, 30);
      // 50k * 45% = 22.5k, minus 5k buffer = 17.5k available for mortgage
      // At 4.5% for 30 years, this gives roughly 3.45M loan
      expect(maxLoan).toBeGreaterThan(3_000_000);
      expect(maxLoan).toBeLessThan(4_000_000);
    });

    it('should return 0 for invalid income', () => {
      expect(calculateMaxLoanByDSTI(0, 0, 0, 4.5, 30)).toBe(0);
      expect(calculateMaxLoanByDSTI(-1, 0, 0, 4.5, 30)).toBe(0);
    });

    it('should return 0 for invalid years', () => {
      expect(calculateMaxLoanByDSTI(50_000, 0, 0, 4.5, 0)).toBe(0);
      expect(calculateMaxLoanByDSTI(50_000, 0, 0, 4.5, -1)).toBe(0);
    });

    it('should return 0 for negative rate', () => {
      expect(calculateMaxLoanByDSTI(50_000, 0, 0, -1, 30)).toBe(0);
    });

    it('should return 0 when existing debts + buffer exceed 45% limit', () => {
      const maxLoan = calculateMaxLoanByDSTI(50_000, 20_000, 10_000, 4.5, 30);
      // 50k * 45% = 22.5k, minus 20k debts and 10k buffer = -7.5k (negative)
      expect(maxLoan).toBe(0);
    });
  });

  describe('impact of existing debts', () => {
    it('should reduce max loan when existing debts increase', () => {
      const noDebts = calculateMaxLoanByDSTI(50_000, 0, 5_000, 4.5, 30);
      const withDebts = calculateMaxLoanByDSTI(50_000, 10_000, 5_000, 4.5, 30);
      expect(withDebts).toBeLessThan(noDebts);
    });
  });

  describe('impact of lifestyle buffer', () => {
    it('should reduce max loan when lifestyle buffer increases', () => {
      const lowBuffer = calculateMaxLoanByDSTI(50_000, 0, 5_000, 4.5, 30);
      const highBuffer = calculateMaxLoanByDSTI(50_000, 0, 15_000, 4.5, 30);
      expect(highBuffer).toBeLessThan(lowBuffer);
    });
  });

  describe('impact of loan term', () => {
    it('should increase max loan with longer term', () => {
      const short = calculateMaxLoanByDSTI(50_000, 0, 5_000, 4.5, 15);
      const long = calculateMaxLoanByDSTI(50_000, 0, 5_000, 4.5, 30);
      expect(long).toBeGreaterThan(short);
    });
  });

  describe('impact of interest rate', () => {
    it('should decrease max loan with higher rate', () => {
      const lowRate = calculateMaxLoanByDSTI(50_000, 0, 5_000, 3.0, 30);
      const highRate = calculateMaxLoanByDSTI(50_000, 0, 5_000, 6.0, 30);
      expect(highRate).toBeLessThan(lowRate);
    });

    it('should handle 0% interest rate', () => {
      const maxLoan = calculateMaxLoanByDSTI(50_000, 0, 5_000, 0, 30);
      // At 0% rate: available payment * months
      // (50k * 45% - 5k) * 30 * 12 = 17.5k * 360 = 6.3M
      expect(maxLoan).toBeCloseTo(6_300_000, -3);
    });
  });
});

describe('calculateMaxLoanByDTI', () => {
  describe('basic behavior', () => {
    it('should return max loan based on 8.5x annual income', () => {
      const maxLoan = calculateMaxLoanByDTI(50_000, 0);
      // 50k * 12 * 8.5 = 5,100,000
      expect(maxLoan).toBe(5_100_000);
    });

    it('should return 0 for invalid income', () => {
      expect(calculateMaxLoanByDTI(0, 0)).toBe(0);
      expect(calculateMaxLoanByDTI(-1, 0)).toBe(0);
    });
  });

  describe('impact of existing debts', () => {
    it('should reduce max loan when existing debts present', () => {
      const noDebts = calculateMaxLoanByDTI(50_000, 0);
      const withDebts = calculateMaxLoanByDTI(50_000, 5_000);
      // Existing debts are approximated as 5-year loans
      // 5k * 12 * 5 = 300k total debt
      expect(withDebts).toBe(noDebts - 300_000);
    });

    it('should return 0 if existing debts exceed DTI limit', () => {
      const maxLoan = calculateMaxLoanByDTI(50_000, 100_000);
      // 100k * 12 * 5 = 6M debt, which exceeds 8.5x limit of 5.1M
      expect(maxLoan).toBe(0);
    });
  });

  describe('scaling with income', () => {
    it('should scale linearly with income', () => {
      const income50k = calculateMaxLoanByDTI(50_000, 0);
      const income100k = calculateMaxLoanByDTI(100_000, 0);
      expect(income100k).toBe(income50k * 2);
    });
  });
});

describe('calculateApplicableLTV', () => {
  describe('first-home buyer rules', () => {
    it('should return 90% LTV for first-home buyer under 36', () => {
      const ltv = calculateApplicableLTV('first-home', 25);
      expect(ltv.maxLTV).toBe(90);
      expect(ltv.type).toBe('first-home');
      expect(ltv.description).toBe('První bydlení, věk do 36 let');
    });

    it('should return 90% LTV for first-home buyer at age 35', () => {
      const ltv = calculateApplicableLTV('first-home', 35);
      expect(ltv.maxLTV).toBe(90);
    });

    it('should return 80% LTV for first-home buyer at age 36', () => {
      const ltv = calculateApplicableLTV('first-home', 36);
      expect(ltv.maxLTV).toBe(80);
      expect(ltv.description).toBe('První bydlení, standardní');
    });

    it('should return 80% LTV for first-home buyer over 36', () => {
      const ltv = calculateApplicableLTV('first-home', 45);
      expect(ltv.maxLTV).toBe(80);
      expect(ltv.description).toBe('První bydlení, standardní');
    });
  });

  describe('investment property rules', () => {
    it('should return 70% LTV for investment property regardless of age', () => {
      const young = calculateApplicableLTV('investment', 25);
      const old = calculateApplicableLTV('investment', 45);

      expect(young.maxLTV).toBe(70);
      expect(young.type).toBe('investment');
      expect(young.description).toBe('Investiční nemovitost');

      expect(old.maxLTV).toBe(70);
      expect(old.description).toBe('Investiční nemovitost');
    });
  });
});

describe('calculateAffordability', () => {
  describe('basic behavior', () => {
    it('should return complete affordability result', () => {
      const result = calculateAffordability(baseParams);

      expect(result.maxLoanByDSTI).toBeGreaterThan(0);
      expect(result.maxLoanByDTI).toBeGreaterThan(0);
      expect(result.ltvRule).toBeDefined();
      expect(result.maxLoan).toBeGreaterThan(0);
      expect(result.bindingConstraint).toBeDefined();
      expect(result.constraintExplanation).toBeDefined();
      expect(result.maxPropertyPrice).toBeGreaterThan(0);
      expect(result.downPaymentPercent).toBeGreaterThan(0);
      expect(result.downPaymentAmount).toBeGreaterThan(0);
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.totalMonthlyIncome).toBe(50_000);
      expect(result.availableMonthlyIncome).toBeGreaterThan(0);
    });

    it('should include partner income in total', () => {
      const withPartner = calculateAffordability({
        ...baseParams,
        partnerIncome: 30_000,
      });

      expect(withPartner.totalMonthlyIncome).toBe(80_000);
      expect(withPartner.maxLoan).toBeGreaterThan(
        calculateAffordability(baseParams).maxLoan
      );
    });
  });

  describe('binding constraints', () => {
    it('should identify binding constraint correctly', () => {
      const result = calculateAffordability(baseParams);
      // Binding constraint should be one of dsti, dti, or ltv
      expect(['dsti', 'dti', 'ltv']).toContain(result.bindingConstraint);
      expect(result.constraintExplanation).toBeDefined();
      expect(result.constraintExplanation.length).toBeGreaterThan(0);
    });

    it('should calculate both DSTI and DTI limits correctly', () => {
      const result = calculateAffordability({
        ...baseParams,
        monthlyIncome: 100_000,
        years: 30,
        lifestyleBuffer: 10_000,
        existingDebts: 5_000,
      });
      // Both limits should be calculated and positive
      expect(result.maxLoanByDSTI).toBeGreaterThan(0);
      expect(result.maxLoanByDTI).toBeGreaterThan(0);
      // The binding constraint should be the smaller of the two (or LTV)
      expect(result.maxLoan).toBeLessThanOrEqual(result.maxLoanByDSTI);
      expect(result.maxLoan).toBeLessThanOrEqual(result.maxLoanByDTI);
    });

    it('should have DSTI as binding constraint with high debts', () => {
      const result = calculateAffordability({
        ...baseParams,
        existingDebts: 15_000,
        lifestyleBuffer: 10_000,
      });
      // High debts reduce available DSTI capacity
      expect(result.bindingConstraint).toBe('dsti');
      expect(result.constraintExplanation).toContain('DSTI');
      expect(result.maxLoan).toBe(result.maxLoanByDSTI);
    });
  });

  describe('LTV rules application', () => {
    it('should apply 90% LTV for first-home buyer under 36', () => {
      const result = calculateAffordability({
        ...baseParams,
        age: 30,
        buyerType: 'first-home',
      });

      expect(result.ltvRule.maxLTV).toBe(90);
      expect(result.downPaymentPercent).toBe(10);
    });

    it('should apply 80% LTV for first-home buyer over 36', () => {
      const result = calculateAffordability({
        ...baseParams,
        age: 40,
        buyerType: 'first-home',
      });

      expect(result.ltvRule.maxLTV).toBe(80);
      expect(result.downPaymentPercent).toBe(20);
    });

    it('should apply 70% LTV for investment property', () => {
      const result = calculateAffordability({
        ...baseParams,
        age: 30,
        buyerType: 'investment',
      });

      expect(result.ltvRule.maxLTV).toBe(70);
      expect(result.downPaymentPercent).toBe(30);
    });

    it('should respect minDownPaymentPercent override', () => {
      const result = calculateAffordability({
        ...baseParams,
        age: 30,
        buyerType: 'first-home',
        minDownPaymentPercent: 25,
      });

      expect(result.downPaymentPercent).toBe(25);
      expect(result.downPaymentPercent).toBeGreaterThan(10); // Override is more than standard 10%
    });
  });

  describe('impact of existing debts', () => {
    it('should reduce max loan when existing debts present', () => {
      const noDebts = calculateAffordability(baseParams);
      const withDebts = calculateAffordability({
        ...baseParams,
        existingDebts: 10_000,
      });

      expect(withDebts.maxLoan).toBeLessThan(noDebts.maxLoan);
      expect(withDebts.maxPropertyPrice).toBeLessThan(noDebts.maxPropertyPrice);
    });
  });

  describe('impact of lifestyle buffer', () => {
    it('should reduce max loan with higher lifestyle buffer', () => {
      const lowBuffer = calculateAffordability({
        ...baseParams,
        lifestyleBuffer: 5_000,
      });
      const highBuffer = calculateAffordability({
        ...baseParams,
        lifestyleBuffer: 15_000,
      });

      expect(highBuffer.maxLoan).toBeLessThan(lowBuffer.maxLoan);
    });
  });

  describe('property price and down payment calculation', () => {
    it('should calculate property price correctly from max loan and LTV', () => {
      const result = calculateAffordability(baseParams);
      // maxPropertyPrice = maxLoan / (LTV / 100)
      const expectedPropertyPrice = result.maxLoan / (result.ltvRule.maxLTV / 100);
      expect(result.maxPropertyPrice).toBeCloseTo(expectedPropertyPrice, -2);
    });

    it('should calculate down payment correctly', () => {
      const result = calculateAffordability(baseParams);
      const expectedDownPayment = result.maxPropertyPrice * (result.downPaymentPercent / 100);
      expect(result.downPaymentAmount).toBeCloseTo(expectedDownPayment, -2);
    });

    it('should have loan + down payment = property price', () => {
      const result = calculateAffordability(baseParams);
      const reconstructedPrice = result.maxLoan + result.downPaymentAmount;
      expect(reconstructedPrice).toBeCloseTo(result.maxPropertyPrice, -2);
    });
  });

  describe('monthly payment consistency', () => {
    it('should calculate monthly payment from max loan', () => {
      const result = calculateAffordability(baseParams);
      // Monthly payment should be consistent with mortgage calculation
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.monthlyPayment).toBeLessThanOrEqual(result.availableMonthlyIncome);
    });

    it('should have payment within 45% DSTI limit when DSTI binds', () => {
      const result = calculateAffordability(baseParams);
      if (result.bindingConstraint === 'dsti') {
        const totalDebtService = result.monthlyPayment + result.existingDebts;
        const dstiRatio = totalDebtService / result.totalMonthlyIncome;
        expect(dstiRatio).toBeLessThanOrEqual(0.45 + 0.01); // Allow small rounding error
      }
    });
  });

  describe('available monthly income calculation', () => {
    it('should calculate available income as 45% minus debts and buffer', () => {
      const result = calculateAffordability(baseParams);
      const expected = (50_000 * 0.45) - 0 - 5_000;
      expect(result.availableMonthlyIncome).toBe(expected);
    });

    it('should include partner income in calculation', () => {
      const result = calculateAffordability({
        ...baseParams,
        partnerIncome: 30_000,
      });
      const expected = (80_000 * 0.45) - 0 - 5_000;
      expect(result.availableMonthlyIncome).toBe(expected);
    });

    it('should be 0 if debts and buffer exceed 45% limit', () => {
      const result = calculateAffordability({
        ...baseParams,
        existingDebts: 20_000,
        lifestyleBuffer: 10_000,
      });
      expect(result.availableMonthlyIncome).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero partner income', () => {
      const result = calculateAffordability({
        ...baseParams,
        partnerIncome: 0,
      });
      expect(result.totalMonthlyIncome).toBe(50_000);
    });

    it('should handle undefined partner income', () => {
      const { partnerIncome, ...paramsWithoutPartner } = baseParams;
      const result = calculateAffordability(paramsWithoutPartner);
      expect(result.totalMonthlyIncome).toBe(50_000);
    });

    it('should handle zero lifestyle buffer', () => {
      const result = calculateAffordability({
        ...baseParams,
        lifestyleBuffer: 0,
      });
      expect(result.maxLoan).toBeGreaterThan(0);
    });

    it('should handle zero existing debts', () => {
      const result = calculateAffordability({
        ...baseParams,
        existingDebts: 0,
      });
      expect(result.maxLoan).toBeGreaterThan(0);
    });

    it('should handle high interest rate', () => {
      const result = calculateAffordability({
        ...baseParams,
        annualRate: 10.0,
      });
      expect(result.maxLoan).toBeGreaterThan(0);
      expect(result.maxLoan).toBeLessThan(
        calculateAffordability(baseParams).maxLoan
      );
    });

    it('should handle short loan term', () => {
      const result = calculateAffordability({
        ...baseParams,
        years: 10,
      });
      expect(result.maxLoan).toBeGreaterThan(0);
      expect(result.maxLoan).toBeLessThan(
        calculateAffordability(baseParams).maxLoan
      );
    });

    it('should handle long loan term', () => {
      const result = calculateAffordability({
        ...baseParams,
        years: 35,
      });
      expect(result.maxLoan).toBeGreaterThan(
        calculateAffordability(baseParams).maxLoan
      );
    });
  });

  describe('realistic scenarios', () => {
    it('should calculate affordability for young single buyer', () => {
      const result = calculateAffordability({
        monthlyIncome: 45_000,
        existingDebts: 0,
        dependents: 0,
        lifestyleBuffer: 10_000,
        age: 28,
        buyerType: 'first-home',
        annualRate: 4.5,
        years: 30,
      });

      expect(result.ltvRule.maxLTV).toBe(90);
      expect(result.downPaymentPercent).toBe(10);
      expect(result.maxLoan).toBeGreaterThan(2_000_000);
      expect(result.maxPropertyPrice).toBeGreaterThan(2_200_000);
    });

    it('should calculate affordability for couple with debts', () => {
      const result = calculateAffordability({
        monthlyIncome: 60_000,
        partnerIncome: 40_000,
        existingDebts: 8_000,
        dependents: 1,
        lifestyleBuffer: 15_000,
        age: 35,
        buyerType: 'first-home',
        annualRate: 4.5,
        years: 25,
      });

      expect(result.totalMonthlyIncome).toBe(100_000);
      expect(result.ltvRule.maxLTV).toBe(90);
      expect(result.maxLoan).toBeGreaterThan(3_900_000);
    });

    it('should calculate affordability for investment property buyer', () => {
      const result = calculateAffordability({
        monthlyIncome: 80_000,
        existingDebts: 5_000,
        dependents: 0,
        lifestyleBuffer: 10_000,
        age: 40,
        buyerType: 'investment',
        annualRate: 5.0,
        years: 20,
      });

      expect(result.ltvRule.maxLTV).toBe(70);
      expect(result.downPaymentPercent).toBe(30);
      expect(result.maxPropertyPrice).toBeGreaterThan(3_000_000);
    });

    it('should calculate affordability for older first-home buyer', () => {
      const result = calculateAffordability({
        monthlyIncome: 70_000,
        existingDebts: 0,
        dependents: 2,
        lifestyleBuffer: 20_000,
        age: 42,
        buyerType: 'first-home',
        annualRate: 4.5,
        years: 20,
      });

      expect(result.ltvRule.maxLTV).toBe(80);
      expect(result.downPaymentPercent).toBe(20);
      // High lifestyle buffer reduces affordability
      expect(result.maxLoan).toBeGreaterThan(1_800_000);
    });
  });

  describe('constraint explanations', () => {
    it('should provide Czech explanation for DSTI constraint', () => {
      const result = calculateAffordability(baseParams);
      if (result.bindingConstraint === 'dsti') {
        expect(result.constraintExplanation).toContain('DSTI');
        expect(result.constraintExplanation).toContain('45');
        expect(result.constraintExplanation).toContain('příjmu');
      }
    });

    it('should provide Czech explanation for DTI constraint', () => {
      const result = calculateAffordability({
        ...baseParams,
        monthlyIncome: 150_000,
        years: 10,
      });
      if (result.bindingConstraint === 'dti') {
        expect(result.constraintExplanation).toContain('DTI');
        expect(result.constraintExplanation).toContain('8.5');
        expect(result.constraintExplanation).toContain('roční příjem');
      }
    });
  });
});
