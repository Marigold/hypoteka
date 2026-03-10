import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage before importing the store
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  get length() { return storage.size; },
  key: vi.fn((index: number) => [...storage.keys()][index] ?? null),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

// Now import the store (it reads localStorage on init)
const { $mortgageAmount, DEFAULT_MORTGAGE_AMOUNT } = await import("./mortgage");

describe("$mortgageAmount store", () => {
  beforeEach(() => {
    storage.clear();
    $mortgageAmount.set(DEFAULT_MORTGAGE_AMOUNT);
  });

  describe("default value", () => {
    it("initializes with DEFAULT_MORTGAGE_AMOUNT", () => {
      expect($mortgageAmount.get()).toBe(DEFAULT_MORTGAGE_AMOUNT);
    });

    it("DEFAULT_MORTGAGE_AMOUNT is 4_000_000", () => {
      expect(DEFAULT_MORTGAGE_AMOUNT).toBe(4_000_000);
    });
  });

  describe("set/get roundtrip", () => {
    it("returns the value that was set", () => {
      $mortgageAmount.set(5_500_000);
      expect($mortgageAmount.get()).toBe(5_500_000);
    });

    it("handles zero", () => {
      $mortgageAmount.set(0);
      expect($mortgageAmount.get()).toBe(0);
    });

    it("handles large values", () => {
      $mortgageAmount.set(50_000_000);
      expect($mortgageAmount.get()).toBe(50_000_000);
    });
  });

  describe("JSON encode/decode", () => {
    it("encode produces valid JSON number string", () => {
      const encoded = JSON.stringify(3_000_000);
      expect(encoded).toBe("3000000");
    });

    it("decode produces number type, not string", () => {
      const decoded = JSON.parse("3000000");
      expect(typeof decoded).toBe("number");
      expect(decoded).toBe(3_000_000);
    });

    it("roundtrip through JSON preserves number type", () => {
      const original = 2_750_000;
      const decoded = JSON.parse(JSON.stringify(original));
      expect(typeof decoded).toBe("number");
      expect(decoded).toBe(original);
    });
  });
});
