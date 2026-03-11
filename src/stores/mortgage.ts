import { persistentAtom } from '@nanostores/persistent';
import { computed } from 'nanostores';

export const DEFAULT_PROPERTY_PRICE = 5_000_000;
export const DEFAULT_DOWN_PAYMENT_PERCENT = 20;
export const DEFAULT_MORTGAGE_RATE = 4.5;
export const DEFAULT_MORTGAGE_YEARS = 30;

export const $propertyPrice = persistentAtom<number>(
  'hypoteka:property-price',
  DEFAULT_PROPERTY_PRICE,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);

export const $downPaymentPercent = persistentAtom<number>(
  'hypoteka:down-payment-percent',
  DEFAULT_DOWN_PAYMENT_PERCENT,
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

export const $mortgageAmount = computed(
  [$propertyPrice, $downPaymentPercent],
  (price, dp) => Math.round(price * (1 - dp / 100)),
);
