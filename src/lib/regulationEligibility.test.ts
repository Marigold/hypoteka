import { describe, it, expect } from 'vitest';
import { evaluateRegulationCompliance, type UserProfile } from './regulationEligibility';

const baseProfile: UserProfile = {
  age: 30,
  monthlyIncome: 50_000,
  propertyValue: 5_000_000,
  loanAmount: 4_000_000,
  propertyType: 'primary-residence',
  isFirstTimeBuyer: true,
  monthlyPayment: 20_000,
  totalMonthlyDebt: 20_000,
  existingProperties: 0,
};

describe('evaluateRegulationCompliance', () => {
  describe('LTV limits for primary residence', () => {
    it('should allow 90% LTV for under-36 first-time buyer', () => {
      const profile: UserProfile = {
        ...baseProfile,
        age: 34,
        loanAmount: 4_500_000, // 90% LTV
        propertyValue: 5_000_000,
      };
      const result = evaluateRegulationCompliance(profile);
      const ltvCheck = result.checks.find((c) => c.id === 'primary-ltv');

      expect(ltvCheck).toBeDefined();
      expect(ltvCheck!.status).toBe('compliant');
      expect(ltvCheck!.currentValue).toBe(90);
      expect(ltvCheck!.maxAllowed).toBe(90);
    });

    it('should limit to 80% LTV for 37-year-old buyer', () => {
      const profile: UserProfile = {
        ...baseProfile,
        age: 37,
        loanAmount: 4_500_000, // 90% LTV
        propertyValue: 5_000_000,
      };
      const result = evaluateRegulationCompliance(profile);
      const ltvCheck = result.checks.find((c) => c.id === 'primary-ltv');

      expect(ltvCheck).toBeDefined();
      expect(ltvCheck!.status).toBe('non-compliant');
      expect(ltvCheck!.currentValue).toBe(90);
      expect(ltvCheck!.maxAllowed).toBe(80);
    });
  });

  describe('LTV limits for investment property', () => {
    it('should cap LTV at 70% for investment properties', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'investment',
        loanAmount: 3_500_000, // 70% LTV
        propertyValue: 5_000_000,
      };
      const result = evaluateRegulationCompliance(profile);
      const ltvCheck = result.checks.find((c) => c.id === 'investment-ltv');

      expect(ltvCheck).toBeDefined();
      expect(ltvCheck!.status).toBe('compliant');
      expect(ltvCheck!.currentValue).toBe(70);
      expect(ltvCheck!.maxAllowed).toBe(70);
    });

    it('should reject >70% LTV for investment properties', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'investment',
        loanAmount: 4_000_000, // 80% LTV
        propertyValue: 5_000_000,
      };
      const result = evaluateRegulationCompliance(profile);
      const ltvCheck = result.checks.find((c) => c.id === 'investment-ltv');

      expect(ltvCheck).toBeDefined();
      expect(ltvCheck!.status).toBe('non-compliant');
      expect(ltvCheck!.currentValue).toBe(80);
      expect(ltvCheck!.maxAllowed).toBe(70);
    });
  });

  describe('DTI limits', () => {
    it('should apply stricter DTI limit (8x) for investment properties', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'investment',
        monthlyIncome: 50_000,
        totalMonthlyDebt: 25_000, // 6x annual income (25k * 12 / 50k / 12 = 6)
      };
      const result = evaluateRegulationCompliance(profile);
      const dtiCheck = result.checks.find((c) => c.id === 'dti-ratio');

      expect(dtiCheck).toBeDefined();
      expect(dtiCheck!.maxAllowed).toBe(8);
    });

    it('should apply standard DTI limit (9x) for primary residence', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'primary-residence',
      };
      const result = evaluateRegulationCompliance(profile);
      const dtiCheck = result.checks.find((c) => c.id === 'dti-ratio');

      expect(dtiCheck).toBeDefined();
      expect(dtiCheck!.maxAllowed).toBe(9);
    });
  });

  describe('DSTI limits', () => {
    it('should apply 40% DSTI limit for investment properties', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'investment',
        monthlyIncome: 50_000,
        monthlyPayment: 19_000, // 38% DSTI
      };
      const result = evaluateRegulationCompliance(profile);
      const dstiCheck = result.checks.find((c) => c.id === 'dsti-ratio');

      expect(dstiCheck).toBeDefined();
      expect(dstiCheck!.status).toBe('compliant');
      expect(dstiCheck!.maxAllowed).toBe(40);
    });

    it('should apply 45% DSTI limit for primary residence', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'primary-residence',
        monthlyIncome: 50_000,
        monthlyPayment: 22_000, // 44% DSTI
      };
      const result = evaluateRegulationCompliance(profile);
      const dstiCheck = result.checks.find((c) => c.id === 'dsti-ratio');

      expect(dstiCheck).toBeDefined();
      expect(dstiCheck!.status).toBe('compliant');
      expect(dstiCheck!.maxAllowed).toBe(45);
    });
  });

  describe('overall compliance', () => {
    it('should return compliant status when all checks pass', () => {
      const profile: UserProfile = {
        ...baseProfile,
        age: 30,
        propertyType: 'primary-residence',
        loanAmount: 3_500_000, // 70% LTV
        monthlyPayment: 18_000, // 36% DSTI
        totalMonthlyDebt: 18_000,
      };
      const result = evaluateRegulationCompliance(profile);

      expect(result.overallStatus).toBe('compliant');
      expect(result.isLikelyApproved).toBe(true);
    });

    it('should return non-compliant status when any check fails', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'investment',
        loanAmount: 4_000_000, // 80% LTV - exceeds 70% limit
      };
      const result = evaluateRegulationCompliance(profile);

      expect(result.overallStatus).toBe('non-compliant');
      expect(result.isLikelyApproved).toBe(false);
    });

    it('should provide recommendations when checks fail', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'investment',
        loanAmount: 4_000_000, // 80% LTV - exceeds 70% limit
      };
      const result = evaluateRegulationCompliance(profile);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes('vlastní kapitál'))).toBe(true);
    });
  });

  describe('before/after comparison', () => {
    it('should include before/after comparison for investment properties', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'investment',
      };
      const result = evaluateRegulationCompliance(profile);

      expect(result.beforeAfterComparison).toBeDefined();
      expect(result.beforeAfterComparison.length).toBeGreaterThan(0);

      // Should mention LTV change from 80% to 70%
      const ltvComparison = result.beforeAfterComparison.find((c) =>
        c.category.includes('investiční'),
      );
      expect(ltvComparison).toBeDefined();
      expect(ltvComparison!.before).toBe('80 %');
      expect(ltvComparison!.after).toBe('70 %');
    });

    it('should include before/after comparison for primary residence (over 36)', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'primary-residence',
        age: 40,
      };
      const result = evaluateRegulationCompliance(profile);

      expect(result.beforeAfterComparison).toBeDefined();
      expect(result.beforeAfterComparison.length).toBeGreaterThan(0);

      // Should mention LTV staying at 80%
      const ltvComparison = result.beforeAfterComparison.find((c) =>
        c.category.includes('primární'),
      );
      expect(ltvComparison).toBeDefined();
      expect(ltvComparison!.before).toBe('80 %');
      expect(ltvComparison!.after).toBe('80 %');
    });

    it('should show under-36 exception in comparison', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyType: 'primary-residence',
        age: 34,
      };
      const result = evaluateRegulationCompliance(profile);

      const under36Comparison = result.beforeAfterComparison.find((c) =>
        c.category.includes('36'),
      );
      expect(under36Comparison).toBeDefined();
      expect(under36Comparison!.before).toBe('90 %');
      expect(under36Comparison!.after).toBe('90 %');
    });
  });

  describe('edge cases', () => {
    it('should handle zero property value', () => {
      const profile: UserProfile = {
        ...baseProfile,
        propertyValue: 0,
        loanAmount: 4_000_000,
      };
      const result = evaluateRegulationCompliance(profile);

      expect(result.checks.length).toBeGreaterThan(0);
      // LTV should be 0 when property value is 0
      const ltvCheck = result.checks.find((c) => c.id.includes('ltv'));
      expect(ltvCheck!.currentValue).toBe(0);
    });

    it('should handle zero income', () => {
      const profile: UserProfile = {
        ...baseProfile,
        monthlyIncome: 0,
      };
      const result = evaluateRegulationCompliance(profile);

      expect(result.checks.length).toBeGreaterThan(0);
      // DTI and DSTI should be 0 when income is 0
      const dtiCheck = result.checks.find((c) => c.id === 'dti-ratio');
      const dstiCheck = result.checks.find((c) => c.id === 'dsti-ratio');
      expect(dtiCheck!.currentValue).toBe(0);
      expect(dstiCheck!.currentValue).toBe(0);
    });
  });
});
