import { persistentAtom } from '@nanostores/persistent';

export const DEFAULT_MORTGAGE_AMOUNT = 4_000_000;

export const $mortgageAmount = persistentAtom<number>(
  'hypoteka:mortgage-amount',
  DEFAULT_MORTGAGE_AMOUNT,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);
