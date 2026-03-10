import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import GlobalMortgageBanner from '../ui/GlobalMortgageBanner';
import Slider from '../ui/Slider';
import ResultCard from '../ui/ResultCard';
import { compareRentVsBuy } from '../../lib/rentVsBuy';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '../../lib/formatters';
import { $mortgageAmount, DEFAULT_MORTGAGE_AMOUNT } from '../../stores/mortgage';

interface Params {
  propertyPrice: number;
  downPaymentPercent: number;
  mortgageRate: number;
  mortgageYears: number;
  monthlyRent: number;
  rentGrowthRate: number;
  propertyAppreciation: number;
  investmentReturnRate: number;
}

const URL_KEYS: Record<keyof Params, string> = {
  propertyPrice: 'cena',
  downPaymentPercent: 'akontace',
  mortgageRate: 'urok',
  mortgageYears: 'roky',
  monthlyRent: 'najem',
  rentGrowthRate: 'rust_najmu',
  propertyAppreciation: 'rust_ceny',
  investmentReturnRate: 'vynosy',
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
  mortgageYears: 30,
  monthlyRent: 18_000,
  rentGrowthRate: 4,
  propertyAppreciation: 5,
  investmentReturnRate: 7,
};

export default function RentVsBuy() {
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const storeAmount = useStore($mortgageAmount);
  // Reverse-derive propertyPrice from store mortgage amount: propertyPrice = mortgageAmount / (1 - dp/100)
  const defaultDp = urlParams.downPaymentPercent ?? DEFAULTS.downPaymentPercent;
  const derivedPropertyPrice = Math.round((storeAmount ?? DEFAULT_MORTGAGE_AMOUNT) / (1 - defaultDp / 100));
  const [propertyPrice, setPropertyPrice] = useState(urlParams.propertyPrice ?? derivedPropertyPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(urlParams.downPaymentPercent ?? DEFAULTS.downPaymentPercent);
  const [mortgageRate, setMortgageRate] = useState(urlParams.mortgageRate ?? DEFAULTS.mortgageRate);
  const [mortgageYears, setMortgageYears] = useState(urlParams.mortgageYears ?? DEFAULTS.mortgageYears);
  const [monthlyRent, setMonthlyRent] = useState(urlParams.monthlyRent ?? DEFAULTS.monthlyRent);
  const [rentGrowthRate, setRentGrowthRate] = useState(urlParams.rentGrowthRate ?? DEFAULTS.rentGrowthRate);
  const [propertyAppreciation, setPropertyAppreciation] = useState(urlParams.propertyAppreciation ?? DEFAULTS.propertyAppreciation);
  const [investmentReturnRate, setInvestmentReturnRate] = useState(urlParams.investmentReturnRate ?? DEFAULTS.investmentReturnRate);

  const params: Params = {
    propertyPrice,
    downPaymentPercent,
    mortgageRate,
    mortgageYears,
    monthlyRent,
    rentGrowthRate,
    propertyAppreciation,
    investmentReturnRate,
  };

  // Sync to URL
  useEffect(() => {
    setParamsToURL(params);
  }, [propertyPrice, downPaymentPercent, mortgageRate, mortgageYears, monthlyRent, rentGrowthRate, propertyAppreciation, investmentReturnRate]);

  // Sync mortgage amount to global store
  useEffect(() => {
    const mortgageAmount = Math.round(propertyPrice * (1 - downPaymentPercent / 100));
    $mortgageAmount.set(mortgageAmount);
  }, [propertyPrice, downPaymentPercent]);

  const downPayment = Math.round(propertyPrice * (downPaymentPercent / 100));

  const results = useMemo(
    () =>
      compareRentVsBuy({
        propertyPrice,
        downPayment,
        mortgageRate,
        mortgageYears,
        monthlyRent,
        rentGrowthRate,
        propertyAppreciation,
        investmentReturnRate,
        maintenanceRate: 1,
        transactionCosts: 4,
        taxDeductionCap: 150_000,
      }),
    [propertyPrice, downPayment, mortgageRate, mortgageYears, monthlyRent, rentGrowthRate, propertyAppreciation, investmentReturnRate],
  );

  // Find breakeven year
  const breakevenYear = useMemo(() => {
    for (const r of results) {
      if (r.buyingNetWorth >= r.rentingNetWorth) return r.year;
    }
    return null;
  }, [results]);

  // Summary stats at 10, 20, 30 years
  const summaryAt = useCallback(
    (year: number) => {
      const r = results.find((r) => r.year === year);
      if (!r) return null;
      return r.buyingNetWorth - r.rentingNetWorth;
    },
    [results],
  );

  const diff10 = summaryAt(10);
  const diff20 = summaryAt(20);
  const diff30 = summaryAt(30);

  // Last available year for the takeaway
  const lastResult = results[results.length - 1];
  const finalDiff = lastResult ? lastResult.buyingNetWorth - lastResult.rentingNetWorth : 0;
  const isBuyingBetter = finalDiff > 0;

  const tooltipFormatter = useCallback(
    (value: number | undefined) => formatCurrency(Math.round(value ?? 0)),
    [],
  );

  return (
    <div className="space-y-8">
      <GlobalMortgageBanner
        currentValue={Math.round(propertyPrice * (1 - downPaymentPercent / 100))}
        onApply={(v) => setPropertyPrice(Math.round(v / (1 - downPaymentPercent / 100)))}
      />

      {/* Input Panel */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry srovnání</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buying params */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">Koupě</h3>

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
                label="Úroková sazba"
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
            </div>

            {/* Renting params */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">Nájem + investice</h3>

              <Slider
                label="Měsíční nájem"
                value={monthlyRent}
                min={5_000}
                max={40_000}
                step={500}
                onChange={setMonthlyRent}
                formatValue={(v) => formatCurrency(v)}
                minLabel="5 000 Kč"
                maxLabel="40 000 Kč"
                showInput
                suffix="Kč"
              />

              <Slider
                label="Roční růst nájmu"
                value={rentGrowthRate}
                min={0}
                max={10}
                step={0.5}
                onChange={setRentGrowthRate}
                formatValue={(v) => formatPercent(v)}
                minLabel="0 %"
                maxLabel="10 %"
                showInput
                suffix="%"
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
                label="Roční výnos investic"
                value={investmentReturnRate}
                min={0}
                max={15}
                step={0.5}
                onChange={setInvestmentReturnRate}
                formatValue={(v) => formatPercent(v)}
                minLabel="0 %"
                maxLabel="15 %"
                showInput
                suffix="%"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key takeaway */}
      {lastResult && (
        <div className={`alert ${isBuyingBetter ? 'alert-success' : 'alert-info'} shadow-sm`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">
            Při těchto parametrech je výhodnější{' '}
            <strong>{isBuyingBetter ? 'vlastní bydlení' : 'nájem'}</strong>{' '}
            o {formatCurrency(Math.abs(finalDiff))} za {lastResult.year} let.
          </span>
        </div>
      )}

      {/* Summary stats */}
      <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
        <ResultCard
          label="Bod zvratu"
          value={breakevenYear ? `${breakevenYear}. rok` : 'Nenastane'}
          color={breakevenYear ? 'success' : 'warning'}
          description={breakevenYear ? 'Kdy se koupě vyplatí' : `Koupě se za ${mortgageYears} let nevyplatí`}
        />
        {diff10 !== null && (
          <ResultCard
            label="Rozdíl za 10 let"
            value={formatCurrencyCompact(Math.abs(diff10))}
            color={diff10 > 0 ? 'success' : 'warning'}
            description={diff10 > 0 ? 'Ve prospěch koupě' : 'Ve prospěch nájmu'}
          />
        )}
        {diff20 !== null && (
          <ResultCard
            label="Rozdíl za 20 let"
            value={formatCurrencyCompact(Math.abs(diff20))}
            color={diff20 > 0 ? 'success' : 'warning'}
            description={diff20 > 0 ? 'Ve prospěch koupě' : 'Ve prospěch nájmu'}
          />
        )}
        {diff30 !== null && (
          <ResultCard
            label="Rozdíl za 30 let"
            value={formatCurrencyCompact(Math.abs(diff30))}
            color={diff30 > 0 ? 'success' : 'warning'}
            description={diff30 > 0 ? 'Ve prospěch koupě' : 'Ve prospěch nájmu'}
          />
        )}
      </div>

      {/* Chart */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Vývoj čistého jmění v čase</h2>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results}>
                <defs>
                  <linearGradient id="gradBuying" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a43b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00a43b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradRenting" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0090b5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0090b5" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  tickFormatter={(v: number) => `${v}. rok`}
                />
                <YAxis tickFormatter={(v: number) => formatCurrencyCompact(v)} width={100} />
                <Tooltip
                  formatter={tooltipFormatter as never}
                  labelFormatter={(v) => `${v}. rok`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="buyingNetWorth"
                  name="Koupě – čisté jmění"
                  stroke="#00a43b"
                  fill="url(#gradBuying)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="rentingNetWorth"
                  name="Nájem + investice – čisté jmění"
                  stroke="#0090b5"
                  fill="url(#gradRenting)"
                  fillOpacity={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-base-content/50 border-t border-base-200 pt-4">
        <p>
          <strong>Právní upozornění:</strong> Tato kalkulačka slouží pouze k orientačním výpočtům
          a nepředstavuje finanční poradenství. Výpočet zohledňuje náklady na údržbu (1 % ročně z
          hodnoty nemovitosti), transakční náklady (4 % z ceny nemovitosti) a daňový odpočet úroků
          (max. 150 000 Kč/rok). Skutečné výsledky se mohou výrazně lišit v závislosti na vývoji
          trhu, konkrétních podmínkách hypotéky a dalších faktorech. Před rozhodnutím se poraďte
          s nezávislým finančním poradcem.
        </p>
      </div>
    </div>
  );
}
