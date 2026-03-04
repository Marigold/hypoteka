import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Format function for displaying the current value */
  formatValue?: (value: number) => string;
  /** Labels shown below the slider at min/max positions */
  minLabel?: string;
  maxLabel?: string;
  /** Show a number input for direct value entry */
  showInput?: boolean;
  /** Suffix displayed after the value (e.g. "Kč", "%", "let") */
  suffix?: string;
}

export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
  minLabel,
  maxLabel,
  showInput = false,
  suffix,
}: SliderProps) {
  const displayValue = formatValue ? formatValue(value) : `${value}${suffix ? ` ${suffix}` : ''}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (!isNaN(raw)) {
      const clamped = Math.min(max, Math.max(min, raw));
      onChange(clamped);
    }
  };

  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text font-medium">{label}</span>
        {!showInput && (
          <span className="label-text-alt font-semibold text-primary">{displayValue}</span>
        )}
      </label>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="range range-primary flex-1"
        />
        {showInput && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleInputChange}
              className="input input-bordered input-sm w-28 text-right"
            />
            {suffix && <span className="text-sm text-base-content/60">{suffix}</span>}
          </div>
        )}
      </div>

      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-base-content/50">{minLabel ?? ''}</span>
          <span className="text-xs text-base-content/50">{maxLabel ?? ''}</span>
        </div>
      )}
    </div>
  );
}
