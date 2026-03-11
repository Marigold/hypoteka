import { describe, it, expect } from "vitest";
import {
  calculateFixationScenarios,
  type FixationScenarioParams,
  type FixationRateMap,
} from "./fixationOptimizer";

const baseParams: FixationScenarioParams = {
  loanAmount: 4_000_000,
  remainingYears: 30,
  fixationRates: { 3: 4.5, 5: 4.7, 10: 5.0 },
  holdingPeriod: 10,
  riskTolerance: "moderate",
};

describe("calculateFixationScenarios", () => {
  describe("basic scenarios", () => {
    it("returns 3 scenarios per fixation period (optimistic/base/pessimistic)", () => {
      const result = calculateFixationScenarios(baseParams);
      // 3 fixation periods × 3 scenarios = 9
      expect(result.scenarios).toHaveLength(9);
    });

    it("returns scenarios sorted by totalInterest ascending", () => {
      const result = calculateFixationScenarios(baseParams);
      for (let i = 1; i < result.scenarios.length; i++) {
        expect(result.scenarios[i].totalInterest).toBeGreaterThanOrEqual(
          result.scenarios[i - 1].totalInterest,
        );
      }
    });

    it("all scenario values are finite numbers", () => {
      const result = calculateFixationScenarios(baseParams);
      for (const s of result.scenarios) {
        expect(Number.isFinite(s.totalInterest)).toBe(true);
        expect(Number.isFinite(s.totalPaid)).toBe(true);
        expect(Number.isFinite(s.averageMonthlyPayment)).toBe(true);
        expect(s.totalInterest).toBeGreaterThan(0);
        expect(s.totalPaid).toBeGreaterThan(s.totalInterest);
      }
    });
  });

  describe("scenario labeling", () => {
    it.each(["conservative", "moderate", "aggressive"] as const)(
      "for %s risk tolerance, each fixation has all 3 scenario labels",
      (tolerance) => {
        const result = calculateFixationScenarios({
          ...baseParams,
          riskTolerance: tolerance,
        });
        const fixationYears = Object.keys(baseParams.fixationRates).map(Number);
        for (const fy of fixationYears) {
          const forFixation = result.scenarios.filter(
            (s) => s.fixationYears === fy,
          );
          const labels = forFixation.map((s) => s.rateScenario).sort();
          expect(labels).toEqual(["base", "optimistic", "pessimistic"]);
        }
      },
    );
  });

  describe("holdingPeriod capping", () => {
    it("caps holdingPeriod to remainingYears when holdingPeriod > remainingYears", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        remainingYears: 5,
        holdingPeriod: 20,
        fixationRates: { 3: 4.5 },
      });
      const uncapped = calculateFixationScenarios({
        ...baseParams,
        remainingYears: 5,
        holdingPeriod: 5,
        fixationRates: { 3: 4.5 },
      });
      // Should produce identical results
      expect(result.scenarios.length).toBe(uncapped.scenarios.length);
      for (let i = 0; i < result.scenarios.length; i++) {
        expect(result.scenarios[i].totalInterest).toBeCloseTo(
          uncapped.scenarios[i].totalInterest,
          0,
        );
      }
    });
  });

  describe("invalid inputs", () => {
    it("returns default result for loanAmount = 0", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        loanAmount: 0,
      });
      expect(result.scenarios).toEqual([]);
      expect(result.recommendation.fixationYears).toBe(0);
      expect(result.summary.costSpread).toBe(0);
    });

    it("returns default result for remainingYears = 0", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        remainingYears: 0,
      });
      expect(result.scenarios).toEqual([]);
    });

    it("returns default result for holdingPeriod = 0", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        holdingPeriod: 0,
      });
      expect(result.scenarios).toEqual([]);
    });

    it("returns default result for empty fixationRates", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        fixationRates: {},
      });
      expect(result.scenarios).toEqual([]);
      expect(result.recommendation.fixationYears).toBe(0);
    });
  });

  describe("single fixation period", () => {
    it("produces 3 scenarios and a recommendation", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        fixationRates: { 5: 4.7 },
      });
      expect(result.scenarios).toHaveLength(3);
      expect(result.recommendation.fixationYears).toBe(5);
      expect(result.recommendation.reason.length).toBeGreaterThan(0);
    });
  });

  describe("fixation filtering", () => {
    it("excludes fixation periods longer than remainingYears", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        remainingYears: 4,
        fixationRates: { 3: 4.5, 5: 4.7, 10: 5.0 },
      });
      // Only 3-year fixation should be included (5 and 10 > 4)
      const fixationYears = [...new Set(result.scenarios.map((s) => s.fixationYears))];
      expect(fixationYears).toEqual([3]);
      expect(result.scenarios).toHaveLength(3);
    });

    it("excludes all fixation periods if all are longer than remainingYears", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        remainingYears: 2,
        fixationRates: { 3: 4.5, 5: 4.7 },
      });
      expect(result.scenarios).toEqual([]);
    });
  });

  describe("recommendation logic", () => {
    it("selects lowest-cost base scenario for recommendation", () => {
      const result = calculateFixationScenarios(baseParams);
      const baseScenarios = result.scenarios.filter(
        (s) => s.rateScenario === "base",
      );
      const lowestBase = baseScenarios.reduce((best, cur) =>
        cur.totalInterest < best.totalInterest ? cur : best,
      );
      expect(result.recommendation.fixationYears).toBe(lowestBase.fixationYears);
    });

    it("recommendation reason includes risk tolerance description", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        riskTolerance: "conservative",
      });
      expect(result.recommendation.reason).toContain("konzervativním");
    });

    it("recommendation mentions no refixation when fixation covers holding period", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        holdingPeriod: 5,
        fixationRates: { 5: 4.7 },
      });
      expect(result.recommendation.reason).toContain("nebudete muset řešit refixaci");
    });

    it("recommendation mentions refixation count when needed", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        holdingPeriod: 10,
        fixationRates: { 3: 4.5 },
      });
      expect(result.recommendation.reason).toContain("refixovat");
    });
  });

  describe("cost spread", () => {
    it("costSpread equals highestCost minus lowestCost", () => {
      const result = calculateFixationScenarios(baseParams);
      expect(result.summary.costSpread).toBe(
        result.summary.highestCost - result.summary.lowestCost,
      );
    });

    it("lowestCost matches first scenario totalInterest", () => {
      const result = calculateFixationScenarios(baseParams);
      expect(result.summary.lowestCost).toBe(result.scenarios[0].totalInterest);
    });

    it("highestCost matches last scenario totalInterest", () => {
      const result = calculateFixationScenarios(baseParams);
      expect(result.summary.highestCost).toBe(
        result.scenarios[result.scenarios.length - 1].totalInterest,
      );
    });

    it("costSpread is non-negative", () => {
      const result = calculateFixationScenarios(baseParams);
      expect(result.summary.costSpread).toBeGreaterThanOrEqual(0);
    });
  });

  describe("edge cases", () => {
    it("handles very high rates", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        fixationRates: { 3: 20.0 },
      });
      expect(result.scenarios).toHaveLength(3);
      for (const s of result.scenarios) {
        expect(s.initialRate).toBe(20.0);
        expect(Number.isFinite(s.totalInterest)).toBe(true);
        expect(s.totalInterest).toBeGreaterThan(0);
      }
    });

    it("handles holdingPeriod === remainingYears", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        remainingYears: 10,
        holdingPeriod: 10,
        fixationRates: { 5: 4.7 },
      });
      expect(result.scenarios).toHaveLength(3);
      expect(result.recommendation.fixationYears).toBe(5);
    });

    it("handles remainingYears === 1", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        remainingYears: 1,
        holdingPeriod: 1,
        fixationRates: { 1: 4.5 },
      });
      expect(result.scenarios).toHaveLength(3);
      // With 1 year remaining and 1 year fixation, no refixation needed
      for (const s of result.scenarios) {
        expect(s.refixationCount).toBe(0);
      }
    });

    it("refixation count increases with shorter fixation periods", () => {
      const short = calculateFixationScenarios({
        ...baseParams,
        holdingPeriod: 15,
        fixationRates: { 3: 4.5 },
      });
      const long = calculateFixationScenarios({
        ...baseParams,
        holdingPeriod: 15,
        fixationRates: { 10: 5.0 },
      });
      const shortBase = short.scenarios.find((s) => s.rateScenario === "base")!;
      const longBase = long.scenarios.find((s) => s.rateScenario === "base")!;
      expect(shortBase.refixationCount).toBeGreaterThan(longBase.refixationCount);
    });

    it("pessimistic scenario costs more than optimistic for same fixation", () => {
      const result = calculateFixationScenarios({
        ...baseParams,
        fixationRates: { 3: 4.5 },
        holdingPeriod: 15,
      });
      const pessimistic = result.scenarios.find(
        (s) => s.rateScenario === "pessimistic",
      )!;
      const optimistic = result.scenarios.find(
        (s) => s.rateScenario === "optimistic",
      )!;
      expect(pessimistic.totalInterest).toBeGreaterThan(optimistic.totalInterest);
    });
  });
});
