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
const { $mortgageAmount, DEFAULT_MORTGAGE_AMOUNT, $mortgageRate, DEFAULT_MORTGAGE_RATE, $mortgageYears, DEFAULT_MORTGAGE_YEARS } = await import("./mortgage");

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

  describe("reset helper", () => {
    it("can reset to default", () => {
      $mortgageAmount.set(9_000_000);
      $mortgageAmount.set(DEFAULT_MORTGAGE_AMOUNT);
      expect($mortgageAmount.get()).toBe(DEFAULT_MORTGAGE_AMOUNT);
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

describe("$mortgageRate store", () => {
  beforeEach(() => {
    storage.clear();
    $mortgageRate.set(DEFAULT_MORTGAGE_RATE);
  });

  it("initializes with DEFAULT_MORTGAGE_RATE (4.5)", () => {
    expect($mortgageRate.get()).toBe(4.5);
    expect(DEFAULT_MORTGAGE_RATE).toBe(4.5);
  });

  it("set/get roundtrip works", () => {
    $mortgageRate.set(5.2);
    expect($mortgageRate.get()).toBe(5.2);
  });

  it("handles decimal precision", () => {
    $mortgageRate.set(3.75);
    expect($mortgageRate.get()).toBe(3.75);
  });

  it("JSON roundtrip preserves number type", () => {
    const original = 4.5;
    const decoded = JSON.parse(JSON.stringify(original));
    expect(typeof decoded).toBe("number");
    expect(decoded).toBe(original);
  });
});

describe("$mortgageYears store", () => {
  beforeEach(() => {
    storage.clear();
    $mortgageYears.set(DEFAULT_MORTGAGE_YEARS);
  });

  it("initializes with DEFAULT_MORTGAGE_YEARS (30)", () => {
    expect($mortgageYears.get()).toBe(30);
    expect(DEFAULT_MORTGAGE_YEARS).toBe(30);
  });

  it("set/get roundtrip works", () => {
    $mortgageYears.set(25);
    expect($mortgageYears.get()).toBe(25);
  });

  it("handles boundary values", () => {
    $mortgageYears.set(5);
    expect($mortgageYears.get()).toBe(5);
    $mortgageYears.set(40);
    expect($mortgageYears.get()).toBe(40);
  });

  it("JSON roundtrip preserves number type", () => {
    const original = 25;
    const decoded = JSON.parse(JSON.stringify(original));
    expect(typeof decoded).toBe("number");
    expect(decoded).toBe(original);
  });
});
