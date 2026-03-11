import { useRef, useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import Slider from './Slider';
import {
  $propertyPrice,
  $downPaymentPercent,
  $mortgageAmount,
  $mortgageRate,
  $mortgageYears,
} from '../../stores/mortgage';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';

interface SharedMortgageInputsProps {
  showAmount?: boolean;
  showRate?: boolean;
  yearsMin?: number;
  yearsMax?: number;
  yearsLabel?: string;
}

export default function SharedMortgageInputs({
  showAmount = true,
  showRate = true,
  yearsMin = 5,
  yearsMax = 30,
  yearsLabel = 'Doba splácení',
}: SharedMortgageInputsProps) {
  const propertyPrice = useStore($propertyPrice);
  const downPaymentPercent = useStore($downPaymentPercent);
  const amount = useStore($mortgageAmount);
  const rate = useStore($mortgageRate);
  const years = useStore($mortgageYears);

  const cardRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Input Card */}
      <div
        ref={cardRef}
        className="card bg-base-100 border border-base-200 shadow-sm"
      >
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry hypotéky</h2>

          <Slider
            label="Cena nemovitosti"
            value={propertyPrice}
            min={1_000_000}
            max={15_000_000}
            step={100_000}
            onChange={(v) => $propertyPrice.set(v)}
            formatValue={(v) => formatCurrencyCompact(v)}
            minLabel="1 mil. Kč"
            maxLabel="15 mil. Kč"
            showInput
            suffix="Kč"
          />

          <Slider
            label="Vlastní prostředky"
            value={downPaymentPercent}
            min={10}
            max={50}
            step={1}
            onChange={(v) => $downPaymentPercent.set(v)}
            formatValue={(v) => `${v} % (${formatCurrencyCompact(Math.round(propertyPrice * v / 100))})`}
            minLabel="10 %"
            maxLabel="50 %"
            showInput
            suffix="%"
          />

          {showAmount && (
            <div className="bg-base-200/50 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-base-content/70">Výše úvěru</span>
              <span className="font-semibold text-lg">{formatCurrencyCompact(amount)}</span>
            </div>
          )}

          {showRate && (
            <Slider
              label="Úroková sazba"
              value={rate}
              min={1}
              max={10}
              step={0.1}
              onChange={(v) => $mortgageRate.set(v)}
              formatValue={(v) => formatPercent(v)}
              minLabel="1 %"
              maxLabel="10 %"
              showInput
              suffix="%"
            />
          )}

          <Slider
            label={yearsLabel}
            value={years}
            min={yearsMin}
            max={yearsMax}
            step={1}
            onChange={(v) => $mortgageYears.set(v)}
            formatValue={(v) => `${v} let`}
            minLabel={`${yearsMin} ${yearsMin === 1 ? 'rok' : 'let'}`}
            maxLabel={`${yearsMax} let`}
            showInput
            suffix="let"
          />
        </div>
      </div>

      {/* Sticky Summary Strip */}
      {isSticky && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-sm border-b border-base-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-base-content/50 hidden sm:inline">Cena:</span>
              <span className="font-semibold">{formatCurrencyCompact(propertyPrice)}</span>
            </div>
            <div className="text-base-content/20">|</div>
            <div className="flex items-center gap-1.5">
              <span className="text-base-content/50 hidden sm:inline">Úvěr:</span>
              <span className="font-semibold">{formatCurrencyCompact(amount)}</span>
            </div>
            {showRate && (
              <>
                <div className="text-base-content/20">|</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base-content/50 hidden sm:inline">Sazba:</span>
                  <span className="font-semibold">{formatPercent(rate)}</span>
                </div>
              </>
            )}
            <div className="text-base-content/20">|</div>
            <div className="flex items-center gap-1.5">
              <span className="text-base-content/50 hidden sm:inline">Doba:</span>
              <span className="font-semibold">{years} let</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
