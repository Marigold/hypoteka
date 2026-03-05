import { useState, useEffect, useMemo, useCallback } from 'react';
import Slider from '../ui/Slider';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '../../lib/formatters';

interface Params {
  propertyPrice: number;
  downPaymentPercent: number;
  mortgageRate: number;
  mortgageYears: number;
  propertyAppreciation: number;
  monthlyRentalIncome: number;
  holdingPeriod: number;
  stockReturnRate: number;
}

const URL_KEYS: Record<keyof Params, string> = {
  propertyPrice: 'cena',
  downPaymentPercent: 'akontace',
  mortgageRate: 'urok',
  mortgageYears: 'roky',
  propertyAppreciation: 'rust_ceny',
  monthlyRentalIncome: 'najem',
  holdingPeriod: 'horizont',
  stockReturnRate: 'vynosy_akcie',
};

function getParamsFromURL(): Partial<Params> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<Params> = {};
  for (const [key, urlKey] of Object.entries(URL_KEYS)) {
    const val = sp.get(urlKey);
    if (val) (result as Record<string, number>)[key] = Number(val);
  }
  return result;
}

function setParamsToURL(params: Params) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  for (const [key, urlKey] of Object.entries(URL_KEYS)) {
    sp.set(urlKey, String(params[key as keyof Params]));
  }
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

const DEFAULTS: Params = {
  propertyPrice: 5_000_000,
  downPaymentPercent: 20,
  mortgageRate: 4.5,
  mortgageYears: 25,
  propertyAppreciation: 3,
  monthlyRentalIncome: 15_000,
  holdingPeriod: 15,
  stockReturnRate: 7,
};

export default function InvestmentComparison() {
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const [propertyPrice, setPropertyPrice] = useState(urlParams.propertyPrice ?? DEFAULTS.propertyPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(urlParams.downPaymentPercent ?? DEFAULTS.downPaymentPercent);
  const [mortgageRate, setMortgageRate] = useState(urlParams.mortgageRate ?? DEFAULTS.mortgageRate);
  const [mortgageYears, setMortgageYears] = useState(urlParams.mortgageYears ?? DEFAULTS.mortgageYears);
  const [propertyAppreciation, setPropertyAppreciation] = useState(urlParams.propertyAppreciation ?? DEFAULTS.propertyAppreciation);
  const [monthlyRentalIncome, setMonthlyRentalIncome] = useState(urlParams.monthlyRentalIncome ?? DEFAULTS.monthlyRentalIncome);
  const [holdingPeriod, setHoldingPeriod] = useState(urlParams.holdingPeriod ?? DEFAULTS.holdingPeriod);
  const [stockReturnRate, setStockReturnRate] = useState(urlParams.stockReturnRate ?? DEFAULTS.stockReturnRate);

  const params: Params = {
    propertyPrice,
    downPaymentPercent,
    mortgageRate,
    mortgageYears,
    propertyAppreciation,
    monthlyRentalIncome,
    holdingPeriod,
    stockReturnRate,
  };

  // Sync to URL
  useEffect(() => {
    setParamsToURL(params);
  }, [propertyPrice, downPaymentPercent, mortgageRate, mortgageYears, propertyAppreciation, monthlyRentalIncome, holdingPeriod, stockReturnRate]);

  const downPayment = Math.round(propertyPrice * (downPaymentPercent / 100));
  const investmentAmount = useMemo(() => {
    const transactionCost = Math.round(propertyPrice * 0.04);
    return downPayment + transactionCost;
  }, [propertyPrice, downPayment]);

  return (
    <div className="space-y-8">
      {/* Input Panel */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry investic</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Estate inputs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">Nemovitost</h3>

              <Slider
                label="Cena nemovitosti"
                value={propertyPrice}
                min={1_000_000}
                max={15_000_000}
                step={100_000}
                onChange={setPropertyPrice}
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
                onChange={setDownPaymentPercent}
                formatValue={(v) => `${v} % (${formatCurrencyCompact(Math.round(propertyPrice * v / 100))})`}
                minLabel="10 %"
                maxLabel="50 %"
                showInput
                suffix="%"
              />

              <Slider
                label="Úroková sazba hypotéky"
                value={mortgageRate}
                min={1}
                max={10}
                step={0.1}
                onChange={setMortgageRate}
                formatValue={(v) => formatPercent(v)}
                minLabel="1 %"
                maxLabel="10 %"
                showInput
                suffix="%"
              />

              <Slider
                label="Doba splácení"
                value={mortgageYears}
                min={10}
                max={30}
                step={1}
                onChange={setMortgageYears}
                formatValue={(v) => `${v} let`}
                minLabel="10 let"
                maxLabel="30 let"
                showInput
                suffix="let"
              />

              <Slider
                label="Roční růst ceny nemovitosti"
                value={propertyAppreciation}
                min={0}
                max={10}
                step={0.5}
                onChange={setPropertyAppreciation}
                formatValue={(v) => formatPercent(v)}
                minLabel="0 %"
                maxLabel="10 %"
                showInput
                suffix="%"
              />

              <Slider
                label="Měsíční příjem z nájmu"
                value={monthlyRentalIncome}
                min={0}
                max={40_000}
                step={500}
                onChange={setMonthlyRentalIncome}
                formatValue={(v) => formatCurrency(v)}
                minLabel="0 Kč"
                maxLabel="40 000 Kč"
                showInput
                suffix="Kč"
              />
            </div>

            {/* Stock Market inputs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">Akciový trh</h3>

              <div className="bg-base-200/50 rounded-lg p-3 text-sm">
                <span className="text-base-content/70">Počáteční investice (= akontace + náklady): </span>
                <span className="font-semibold">{formatCurrency(investmentAmount)}</span>
              </div>

              <Slider
                label="Roční výnos akcií"
                value={stockReturnRate}
                min={0}
                max={15}
                step={0.5}
                onChange={setStockReturnRate}
                formatValue={(v) => formatPercent(v)}
                minLabel="0 %"
                maxLabel="15 %"
                showInput
                suffix="%"
              />
            </div>
          </div>

          {/* Shared holding period */}
          <div className="border-t border-base-200 pt-4">
            <Slider
              label="Investiční horizont"
              value={holdingPeriod}
              min={1}
              max={30}
              step={1}
              onChange={setHoldingPeriod}
              formatValue={(v) => `${v} let`}
              minLabel="1 rok"
              maxLabel="30 let"
              showInput
              suffix="let"
            />
          </div>
        </div>
      </div>

      {/* Placeholder for results, charts, and educational content (next subtasks) */}
    </div>
  );
}
