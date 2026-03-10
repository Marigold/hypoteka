import { describe, it, expect } from "vitest";
import {
  compareInvestments,
  calculateStockTax,
  calculatePropertySaleTax,
  calculateRentalIncomeTax,
  calculateLeverageRatio,
  calculateDownsideScenario,
  getLeverageRiskLevel,
  type InvestmentComparisonParams,
} from "./investmentComparison";
import { calculateMonthlyPayment } from "./mortgage";

const DEFAULT_PARAMS: InvestmentComparisonParams = {
  propertyPrice: 4_000_000,
  downPaymentPercent: 20,
  mortgageRate: 4.5,
  mortgageYears: 25,
  propertyAppreciation: 3,
  monthlyRentalIncome: 12_000,
  holdingPeriod: 15,
  stockReturnRate: 8,
  propertyMaintenanceRate: 1,
  propertyTransactionCost: 4,
  rentalTaxRate: 10.5,
};

describe("compareInvestments", () => {
  describe("basic comparison", () => {
    it("returns an array with length equal to holding period", () => {
      const results = compareInvestments(DEFAULT_PARAMS);
      expect(results).toHaveLength(15);
    });

    it("returns array for holding period of 1", () => {
      const results = compareInvestments({ ...DEFAULT_PARAMS, holdingPeriod: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].year).toBe(1);
    });

    it("all values are finite numbers", () => {
      const results = compareInvestments(DEFAULT_PARAMS);
      for (const r of results) {
        expect(typeof r.year).toBe("number");
        expect(typeof r.propertyValue).toBe("number");
        expect(Number.isFinite(r.propertyValue)).toBe(true);
        expect(typeof r.mortgageBalance).toBe("number");
        expect(Number.isFinite(r.mortgageBalance)).toBe(true);
        expect(typeof r.realEstateEquity).toBe("number");
        expect(typeof r.cumulativeRentalNet).toBe("number");
        expect(typeof r.realEstateNetWorth).toBe("number");
        expect(typeof r.realEstateNetWorthAfterTax).toBe("number");
        expect(typeof r.stockPortfolioValue).toBe("number");
        expect(Number.isFinite(r.stockPortfolioValue)).toBe(true);
        expect(typeof r.stockNetWorthAfterTax).toBe("number");
        expect(typeof r.leverageRatio).toBe("number");
      }
    });

    it("returns empty array for zero property price", () => {
      expect(compareInvestments({ ...DEFAULT_PARAMS, propertyPrice: 0 })).toEqual([]);
    });

    it("returns empty array for zero holding period", () => {
      expect(compareInvestments({ ...DEFAULT_PARAMS, holdingPeriod: 0 })).toEqual([]);
    });

    it("year numbers are sequential 1..N", () => {
      const results = compareInvestments({ ...DEFAULT_PARAMS, holdingPeriod: 5 });
      expect(results.map((r) => r.year)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("leverage amplification", () => {
    it("5% appreciation with 20% down shows equity return > 5%", () => {
      const params: InvestmentComparisonParams = {
        ...DEFAULT_PARAMS,
        propertyAppreciation: 5,
        downPaymentPercent: 20,
        holdingPeriod: 1,
        monthlyRentalIncome: 0,
        propertyMaintenanceRate: 0,
        propertyTransactionCost: 0,
      };
      const results = compareInvestments(params);
      const r = results[0];
      const downPayment = params.propertyPrice * 0.2;
      // Equity return should be amplified by leverage (well above 5%)
      const equityReturnPct = ((r.realEstateEquity - downPayment) / downPayment) * 100;
      expect(equityReturnPct).toBeGreaterThan(5);
    });

    it("-5% appreciation with 20% down shows equity loss > 5%", () => {
      const params: InvestmentComparisonParams = {
        ...DEFAULT_PARAMS,
        propertyAppreciation: -5,
        downPaymentPercent: 20,
        holdingPeriod: 1,
        monthlyRentalIncome: 0,
        propertyMaintenanceRate: 0,
        propertyTransactionCost: 0,
      };
      const results = compareInvestments(params);
      const r = results[0];
      const downPayment = params.propertyPrice * 0.2;
      const equityReturnPct = ((r.realEstateEquity - downPayment) / downPayment) * 100;
      // Loss should be amplified (more negative than -5%)
      expect(equityReturnPct).toBeLessThan(-5);
    });
  });

  describe("tax thresholds", () => {
    it("stocks held < 3 years have tax applied", () => {
      const results = compareInvestments({ ...DEFAULT_PARAMS, holdingPeriod: 2 });
      const r = results[1]; // year 2
      expect(r.stockNetWorthAfterTax).toBeLessThan(r.stockPortfolioValue);
    });

    it("stocks held >= 3 years have no capital gains tax", () => {
      const results = compareInvestments({ ...DEFAULT_PARAMS, holdingPeriod: 3 });
      const r = results[2]; // year 3
      expect(r.stockNetWorthAfterTax).toBe(r.stockPortfolioValue);
    });

    it("property held < 10 years has sale tax applied", () => {
      const results = compareInvestments({
        ...DEFAULT_PARAMS,
        holdingPeriod: 9,
        propertyAppreciation: 5, // ensure gain
      });
      const r = results[8]; // year 9
      expect(r.realEstateNetWorthAfterTax).toBeLessThan(r.realEstateNetWorth);
    });

    it("property held >= 10 years has no sale tax", () => {
      const results = compareInvestments({
        ...DEFAULT_PARAMS,
        holdingPeriod: 10,
        propertyAppreciation: 5,
      });
      const r = results[9]; // year 10
      expect(r.realEstateNetWorthAfterTax).toBe(r.realEstateNetWorth);
    });
  });

  describe("rental income tax", () => {
    it("rental income is taxed at ~10.5% effective rate", () => {
      const params: InvestmentComparisonParams = {
        ...DEFAULT_PARAMS,
        holdingPeriod: 1,
        propertyAppreciation: 0,
        propertyMaintenanceRate: 0,
        propertyTransactionCost: 0,
        monthlyRentalIncome: 10_000,
      };
      const results = compareInvestments(params);
      const annualGross = 10_000 * 12;
      const expectedTax = annualGross * 0.7 * 0.15; // = 12,600
      const expectedNet = annualGross - expectedTax; // = 107,400
      expect(results[0].cumulativeRentalNet).toBeCloseTo(expectedNet, -2);
    });
  });

  describe("monthly payment consistency with mortgage.ts", () => {
    it("uses the same monthly payment as calculateMonthlyPayment", () => {
      const loanAmount = DEFAULT_PARAMS.propertyPrice * (1 - DEFAULT_PARAMS.downPaymentPercent / 100);
      const expectedPayment = calculateMonthlyPayment(
        loanAmount,
        DEFAULT_PARAMS.mortgageRate,
        DEFAULT_PARAMS.mortgageYears,
      );
      // Verify the mortgage balance decreases consistently with the expected payment
      expect(expectedPayment).toBeGreaterThan(0);

      // After 1 year of payments, check mortgage balance is reasonable
      const results = compareInvestments({ ...DEFAULT_PARAMS, holdingPeriod: 1 });
      const monthlyRate = DEFAULT_PARAMS.mortgageRate / 100 / 12;
      // Simulate 12 months manually
      let balance = loanAmount;
      for (let m = 0; m < 12; m++) {
        const interest = balance * monthlyRate;
        const principal = expectedPayment - interest;
        balance = Math.max(0, balance - principal);
      }
      expect(results[0].mortgageBalance).toBe(Math.round(balance));
    });
  });

  describe("edge cases", () => {
    it("zero down payment (100% financing)", () => {
      const results = compareInvestments({
        ...DEFAULT_PARAMS,
        downPaymentPercent: 0,
        holdingPeriod: 5,
      });
      expect(results).toHaveLength(5);
      // With 0 down, leverage ratio should be very high initially
      expect(results[0].leverageRatio).toBeGreaterThan(10);
    });

    it("zero rental income", () => {
      const results = compareInvestments({
        ...DEFAULT_PARAMS,
        monthlyRentalIncome: 0,
        holdingPeriod: 5,
      });
      expect(results).toHaveLength(5);
      // No rental income means cumulative rental net is negative (maintenance costs)
      expect(results[0].cumulativeRentalNet).toBeLessThanOrEqual(0);
    });

    it("negative appreciation makes equity decrease", () => {
      const results = compareInvestments({
        ...DEFAULT_PARAMS,
        propertyAppreciation: -5,
        holdingPeriod: 5,
      });
      // Property value should decrease each year
      expect(results[4].propertyValue).toBeLessThan(results[0].propertyValue);
      // With large enough decline, equity can go negative
      const highLeverageResults = compareInvestments({
        ...DEFAULT_PARAMS,
        propertyAppreciation: -10,
        downPaymentPercent: 10,
        holdingPeriod: 3,
      });
      expect(highLeverageResults[2].realEstateEquity).toBeLessThan(
        highLeverageResults[0].realEstateEquity,
      );
    });

    it("very high leverage (5% down) triggers danger risk level", () => {
      expect(getLeverageRiskLevel(5)).toBe("danger");
    });

    it("100% down payment means no leverage", () => {
      const results = compareInvestments({
        ...DEFAULT_PARAMS,
        downPaymentPercent: 100,
        holdingPeriod: 1,
      });
      expect(results[0].mortgageBalance).toBe(0);
      expect(results[0].leverageRatio).toBeCloseTo(1, 0);
    });
  });
});

describe("stock cost basis and yield accuracy", () => {
    it("0% stock yield means portfolio equals total invested", () => {
      const params: InvestmentComparisonParams = {
        ...DEFAULT_PARAMS,
        stockReturnRate: 0,
        holdingPeriod: 5,
      };
      const results = compareInvestments(params);
      for (const r of results) {
        expect(r.stockPortfolioValue).toBe(r.stockTotalInvested);
      }
    });

    it("cost basis tracks initial capital plus contributions", () => {
      const params: InvestmentComparisonParams = {
        ...DEFAULT_PARAMS,
        holdingPeriod: 1,
        stockReturnRate: 0,
      };
      const results = compareInvestments(params);
      const downPayment = params.propertyPrice * (params.downPaymentPercent / 100);
      const transactionCost = params.propertyPrice * (params.propertyTransactionCost / 100);
      const initialCapital = downPayment + transactionCost;
      // With 0% return, portfolio = cost basis = total invested
      // Total invested must be >= initial capital (contributions add to it)
      expect(results[0].stockTotalInvested).toBeGreaterThanOrEqual(initialCapital);
      expect(results[0].stockPortfolioValue).toBe(results[0].stockTotalInvested);
    });

    it("7% yield produces approximately 7% return after 1 year", () => {
      // Use 100% down payment to eliminate mortgage contributions and isolate return
      const params: InvestmentComparisonParams = {
        ...DEFAULT_PARAMS,
        downPaymentPercent: 100,
        propertyTransactionCost: 0,
        stockReturnRate: 7,
        holdingPeriod: 1,
        monthlyRentalIncome: 0,
        propertyMaintenanceRate: 0,
      };
      const results = compareInvestments(params);
      const initialCapital = params.propertyPrice; // 100% down, 0% transaction
      // With monthly compounding, effective annual return is (1+0.07/12)^12 - 1 ≈ 7.23%
      const expectedValue = initialCapital * Math.pow(1 + 0.07 / 12, 12);
      expect(results[0].stockPortfolioValue).toBeCloseTo(expectedValue, -2);
      // Return should be approximately 7% (within 0.5% due to compounding)
      const actualReturn = (results[0].stockPortfolioValue - initialCapital) / initialCapital * 100;
      expect(actualReturn).toBeGreaterThan(6.5);
      expect(actualReturn).toBeLessThan(7.5);
    });

    it("stock tax uses correct cost basis (not full portfolio value)", () => {
      // With 100% down and no contributions, cost basis = initial capital
      const params: InvestmentComparisonParams = {
        ...DEFAULT_PARAMS,
        downPaymentPercent: 100,
        propertyTransactionCost: 0,
        stockReturnRate: 10,
        holdingPeriod: 2, // < 3 years, so tax applies
        monthlyRentalIncome: 0,
        propertyMaintenanceRate: 0,
      };
      const results = compareInvestments(params);
      const r = results[1]; // year 2
      const expectedGain = r.stockPortfolioValue - r.stockTotalInvested;
      const expectedTax = expectedGain * 0.15;
      const expectedAfterTax = r.stockPortfolioValue - expectedTax;
      expect(r.stockNetWorthAfterTax).toBe(Math.round(expectedAfterTax));
    });
});

describe("calculateStockTax", () => {
  it("applies 15% tax for holding < 3 years", () => {
    expect(calculateStockTax(100_000, 2)).toBe(15_000);
    expect(calculateStockTax(100_000, 1)).toBe(15_000);
  });

  it("applies 0% tax for holding >= 3 years", () => {
    expect(calculateStockTax(100_000, 3)).toBe(0);
    expect(calculateStockTax(100_000, 10)).toBe(0);
  });

  it("returns 0 for negative or zero gain", () => {
    expect(calculateStockTax(-50_000, 1)).toBe(0);
    expect(calculateStockTax(0, 1)).toBe(0);
  });
});

describe("calculatePropertySaleTax", () => {
  it("applies 15% tax for holding < 10 years", () => {
    expect(calculatePropertySaleTax(500_000, 5)).toBe(75_000);
    expect(calculatePropertySaleTax(500_000, 9)).toBe(75_000);
  });

  it("applies 0% tax for holding >= 10 years", () => {
    expect(calculatePropertySaleTax(500_000, 10)).toBe(0);
    expect(calculatePropertySaleTax(500_000, 20)).toBe(0);
  });

  it("returns 0 for negative or zero gain", () => {
    expect(calculatePropertySaleTax(-100_000, 5)).toBe(0);
    expect(calculatePropertySaleTax(0, 5)).toBe(0);
  });
});

describe("calculateRentalIncomeTax", () => {
  it("calculates ~10.5% effective rate", () => {
    expect(calculateRentalIncomeTax(120_000)).toBe(12_600);
    expect(calculateRentalIncomeTax(100_000)).toBe(10_500);
  });

  it("returns 0 for zero or negative income", () => {
    expect(calculateRentalIncomeTax(0)).toBe(0);
    expect(calculateRentalIncomeTax(-10_000)).toBe(0);
  });
});

describe("calculateLeverageRatio", () => {
  it("returns correct ratio", () => {
    expect(calculateLeverageRatio(5_000_000, 1_000_000)).toBe(5);
    expect(calculateLeverageRatio(4_000_000, 4_000_000)).toBe(1);
  });

  it("returns Infinity for zero or negative equity", () => {
    expect(calculateLeverageRatio(5_000_000, 0)).toBe(Infinity);
    expect(calculateLeverageRatio(5_000_000, -100_000)).toBe(Infinity);
  });
});

describe("getLeverageRiskLevel", () => {
  it("returns safe for down >= 20%", () => {
    expect(getLeverageRiskLevel(20)).toBe("safe");
    expect(getLeverageRiskLevel(30)).toBe("safe");
  });

  it("returns warning for down 10-19%", () => {
    expect(getLeverageRiskLevel(15)).toBe("warning");
    expect(getLeverageRiskLevel(10)).toBe("warning");
  });

  it("returns danger for down < 10%", () => {
    expect(getLeverageRiskLevel(5)).toBe("danger");
    expect(getLeverageRiskLevel(0)).toBe("danger");
  });
});

describe("calculateDownsideScenario", () => {
  it("10% drop with 20% down wipes 50% of equity", () => {
    const result = calculateDownsideScenario(5_000_000, 4_000_000, 10);
    expect(result.newPropertyValue).toBe(4_500_000);
    expect(result.remainingEquity).toBe(500_000);
    expect(result.equityChangePercent).toBe(-50);
  });

  it("20% drop with 20% down wipes 100% of equity", () => {
    const result = calculateDownsideScenario(5_000_000, 4_000_000, 20);
    expect(result.remainingEquity).toBe(0);
    expect(result.equityChangePercent).toBe(-100);
  });

  it("handles zero equity gracefully", () => {
    const result = calculateDownsideScenario(5_000_000, 5_000_000, 10);
    expect(result.equityChangePercent).toBe(0);
  });
});
