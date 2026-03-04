/**
 * Czech formatting utilities using Intl.NumberFormat('cs-CZ').
 */

export interface FormatCurrencyOptions {
  /** Number of decimal places (default: 0) */
  decimals?: number;
}

export interface FormatPercentOptions {
  /** Number of decimal places (default: 1) */
  decimals?: number;
}

export interface FormatNumberOptions {
  /** Number of decimal places (default: 0) */
  decimals?: number;
}

const currencyFormatter = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('cs-CZ', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('cs-CZ', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a value as Czech currency.
 * @example formatCurrency(1234567) → '1 234 567 Kč'
 */
export function formatCurrency(
  value: number,
  options?: FormatCurrencyOptions,
): string {
  if (options?.decimals !== undefined) {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals,
    }).format(value);
  }
  return currencyFormatter.format(value);
}

/**
 * Format a value as a Czech percentage.
 * Input is a raw number (e.g. 4.5 for 4,5 %).
 * @example formatPercent(4.5) → '4,5 %'
 */
export function formatPercent(
  value: number,
  options?: FormatPercentOptions,
): string {
  const decimals = options?.decimals ?? 1;
  return new Intl.NumberFormat('cs-CZ', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format a number with Czech thousands separators.
 * @example formatNumber(1234567) → '1 234 567'
 */
export function formatNumber(
  value: number,
  options?: FormatNumberOptions,
): string {
  if (options?.decimals !== undefined) {
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals,
    }).format(value);
  }
  return numberFormatter.format(value);
}

/**
 * Format a currency value in compact form.
 * @example formatCurrencyCompact(5000000) → '5 mil. Kč'
 * @example formatCurrencyCompact(1500000) → '1,5 mil. Kč'
 * @example formatCurrencyCompact(500000) → '500 000 Kč'
 */
export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const mld = abs / 1_000_000_000;
    const formatted = new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(mld);
    return `${sign}${formatted} mld. Kč`;
  }

  if (abs >= 1_000_000) {
    const mil = abs / 1_000_000;
    const formatted = new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(mil);
    return `${sign}${formatted} mil. Kč`;
  }

  return formatCurrency(value);
}
