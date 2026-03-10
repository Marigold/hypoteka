import { persistentAtom } from '@nanostores/persistent';

export const DEFAULT_MORTGAGE_AMOUNT = 4_000_000;
export const DEFAULT_MORTGAGE_RATE = 4.5;
export const DEFAULT_MORTGAGE_YEARS = 30;

export const $mortgageAmount = persistentAtom<number>(
  'hypoteka:mortgage-amount',
  DEFAULT_MORTGAGE_AMOUNT,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);

export const $mortgageRate = persistentAtom<number>(
  'hypoteka:mortgage-rate',
  DEFAULT_MORTGAGE_RATE,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);

export const $mortgageYears = persistentAtom<number>(
  'hypoteka:mortgage-years',
  DEFAULT_MORTGAGE_YEARS,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);
