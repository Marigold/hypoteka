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
const {
  $propertyPrice, DEFAULT_PROPERTY_PRICE,
  $downPaymentPercent, DEFAULT_DOWN_PAYMENT_PERCENT,
  $mortgageAmount,
  $mortgageRate, DEFAULT_MORTGAGE_RATE,
  $mortgageYears, DEFAULT_MORTGAGE_YEARS,
} = await import("./mortgage");

describe("$propertyPrice store", () => {
  beforeEach(() => {
    storage.clear();
    $propertyPrice.set(DEFAULT_PROPERTY_PRICE);
  });

  it("initializes with DEFAULT_PROPERTY_PRICE (5_000_000)", () => {
    expect($propertyPrice.get()).toBe(5_000_000);
    expect(DEFAULT_PROPERTY_PRICE).toBe(5_000_000);
  });

  it("set/get roundtrip works", () => {
    $propertyPrice.set(8_000_000);
    expect($propertyPrice.get()).toBe(8_000_000);
  });
});

describe("$downPaymentPercent store", () => {
  beforeEach(() => {
    storage.clear();
    $downPaymentPercent.set(DEFAULT_DOWN_PAYMENT_PERCENT);
  });

  it("initializes with DEFAULT_DOWN_PAYMENT_PERCENT (20)", () => {
    expect($downPaymentPercent.get()).toBe(20);
    expect(DEFAULT_DOWN_PAYMENT_PERCENT).toBe(20);
  });

  it("set/get roundtrip works", () => {
    $downPaymentPercent.set(30);
    expect($downPaymentPercent.get()).toBe(30);
  });
});

describe("$mortgageAmount computed store", () => {
  beforeEach(() => {
    storage.clear();
    $propertyPrice.set(DEFAULT_PROPERTY_PRICE);
    $downPaymentPercent.set(DEFAULT_DOWN_PAYMENT_PERCENT);
  });

  it("computes from propertyPrice and downPaymentPercent", () => {
    // 5_000_000 * (1 - 20/100) = 4_000_000
    expect($mortgageAmount.get()).toBe(4_000_000);
  });

  it("updates when propertyPrice changes", () => {
    $propertyPrice.set(10_000_000);
    // 10_000_000 * (1 - 20/100) = 8_000_000
    expect($mortgageAmount.get()).toBe(8_000_000);
  });

  it("updates when downPaymentPercent changes", () => {
    $downPaymentPercent.set(10);
    // 5_000_000 * (1 - 10/100) = 4_500_000
    expect($mortgageAmount.get()).toBe(4_500_000);
  });

  it("handles 50% down payment", () => {
    $downPaymentPercent.set(50);
    expect($mortgageAmount.get()).toBe(2_500_000);
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
