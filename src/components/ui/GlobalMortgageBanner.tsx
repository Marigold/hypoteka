import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $mortgageAmount } from '../../stores/mortgage';

interface GlobalMortgageBannerProps {
  currentValue: number;
  onApply: (storedValue: number) => void;
  /** Format function for displaying currency values */
  formatValue?: (value: number) => string;
}

const defaultFormat = (value: number) =>
  `${value.toLocaleString('cs-CZ')} Kč`;

export default function GlobalMortgageBanner({
  currentValue,
  onApply,
  formatValue = defaultFormat,
}: GlobalMortgageBannerProps) {
  const storedValue = useStore($mortgageAmount);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || storedValue === currentValue) {
    return null;
  }

  return (
    <div className="alert alert-info mb-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0 stroke-current"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>
        Máte uloženou výši hypotéky{' '}
        <strong>{formatValue(storedValue)}</strong>.
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => onApply(storedValue)}
        >
          Použít
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => setDismissed(true)}
        >
          Zavřít
        </button>
      </div>
    </div>
  );
}
