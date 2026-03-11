import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import SharedMortgageInputs from '../ui/SharedMortgageInputs';
import Slider from '../ui/Slider';
import ResultCard from '../ui/ResultCard';
import { stressTest, type RiskLevel } from '../../lib/stressTest';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
} from '../../lib/formatters';
import { $propertyPrice, $downPaymentPercent, $mortgageAmount, $mortgageRate, $mortgageYears } from '../../stores/mortgage';

interface Params {
  propertyPrice: number;
  downPaymentPercent: number;
  rate: number;
  years: number;
  income: number;
}

function getParamsFromURL(): Partial<Params> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<Params> = {};
  const pp = sp.get('cena');
  const dp = sp.get('akontace');
  const r = sp.get('urok');
  const y = sp.get('roky');
  const i = sp.get('prijem');
  if (pp) result.propertyPrice = Number(pp);
  if (dp) result.downPaymentPercent = Number(dp);
  if (r) result.rate = Number(r);
  if (y) result.years = Number(y);
  if (i) result.income = Number(i);
  return result;
}

function setParamsToURL(params: Params) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  sp.set('cena', String(params.propertyPrice));
  sp.set('akontace', String(params.downPaymentPercent));
  sp.set('urok', String(params.rate));
  sp.set('roky', String(params.years));
  sp.set('prijem', String(params.income));
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

const DEFAULT_INCOME = 60_000;

const RISK_STYLES: Record<RiskLevel, { border: string; badge: string; badgeLabel: string }> = {
  safe: {
    border: 'border-success',
    badge: 'badge-success',
    badgeLabel: 'Bezpečné',
  },
  warning: {
    border: 'border-warning',
    badge: 'badge-warning',
    badgeLabel: 'Varování',
  },
  danger: {
    border: 'border-error',
    badge: 'badge-error',
    badgeLabel: 'Nebezpečné',
  },
};

export default function StressTest() {
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const propertyPrice = useStore($propertyPrice);
  const downPaymentPercent = useStore($downPaymentPercent);
  const principal = useStore($mortgageAmount);
  const rate = useStore($mortgageRate);
  const years = useStore($mortgageYears);
  const [income, setIncome] = useState(urlParams.income ?? DEFAULT_INCOME);

  // Initialize store from URL params (once on mount)
  useEffect(() => {
    if (urlParams.propertyPrice != null) $propertyPrice.set(urlParams.propertyPrice);
    if (urlParams.downPaymentPercent != null) $downPaymentPercent.set(urlParams.downPaymentPercent);
    if (urlParams.rate != null) $mortgageRate.set(urlParams.rate);
    if (urlParams.years != null) $mortgageYears.set(urlParams.years);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to URL
  useEffect(() => {
    setParamsToURL({ propertyPrice, downPaymentPercent, rate, years, income });
  }, [propertyPrice, downPaymentPercent, rate, years, income]);

  const results = useMemo(
    () =>
      stressTest({
        principal,
        annualRate: rate,
        years,
        monthlyIncome: income,
      }),
    [principal, rate, years, income],
  );

  const baseRiskLevel = useMemo((): RiskLevel => {
    if (results.basePercentOfIncome > 40) return 'danger';
    if (results.basePercentOfIncome >= 30) return 'warning';
    return 'safe';
  }, [results.basePercentOfIncome]);

  // Chart data: rate increase scenarios for the line chart
  const chartData = useMemo(() => {
    const points: { rate: string; payment: number }[] = [];
    for (let r = rate; r <= rate + 5; r += 0.5) {
      const rRounded = Math.round(r * 10) / 10;
      const { basePayment } = stressTest({
        principal,
        annualRate: rRounded,
        years,
        monthlyIncome: income,
      });
      points.push({
        rate: `${formatNumber(rRounded, { decimals: 1 })} %`,
        payment: Math.round(basePayment),
      });
    }
    return points;
  }, [principal, rate, years, income]);

  const tooltipFormatter = useCallback(
    (value: number | undefined) => formatCurrency(Math.round(value ?? 0)),
    [],
  );

  return (
    <div className="space-y-8">
      <SharedMortgageInputs />

      {/* Additional Parameters */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry stresového testu</h2>

          <Slider
            label="Měsíční příjem domácnosti"
            value={income}
            min={20_000}
            max={200_000}
            step={1_000}
            onChange={setIncome}
            formatValue={(v) => formatCurrencyCompact(v)}
            minLabel="20 tis. Kč"
            maxLabel="200 tis. Kč"
            showInput
            suffix="Kč"
          />
        </div>
      </div>

      {/* Current payment summary */}
      <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
        <ResultCard
          label="Aktuální splátka"
          value={formatCurrency(Math.round(results.basePayment))}
          color="primary"
        />
        <ResultCard
          label="Podíl na příjmu"
          value={`${formatNumber(results.basePercentOfIncome, { decimals: 1 })} %`}
          color={baseRiskLevel === 'safe' ? 'success' : baseRiskLevel === 'warning' ? 'warning' : 'error'}
          description={RISK_STYLES[baseRiskLevel].badgeLabel}
        />
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.scenarios.map((scenario) => {
          const style = RISK_STYLES[scenario.riskLevel];
          return (
            <div
              key={scenario.name}
              className={`card bg-base-100 border-2 ${style.border} shadow-sm`}
            >
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{scenario.name}</h3>
                  <span className={`badge ${style.badge} badge-sm`}>
                    {style.badgeLabel}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-lg font-bold">
                    {formatCurrency(Math.round(scenario.newPayment))}
                  </div>
                  <div className="text-sm text-base-content/60">
                    {scenario.paymentChange >= 0 ? '+' : ''}
                    {formatCurrency(Math.round(scenario.paymentChange))} oproti současnosti
                  </div>
                  <div className="text-sm text-base-content/60">
                    {formatNumber(scenario.percentOfIncome, { decimals: 1 })} % příjmu
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Splátka při růstu úrokové sazby</h2>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="rate" />
                <YAxis
                  tickFormatter={(v: number) => formatCurrencyCompact(v)}
                  width={100}
                />
                <Tooltip formatter={tooltipFormatter as never} />
                <Legend />
                <ReferenceLine
                  y={income * 0.3}
                  stroke="#fdc700"
                  strokeDasharray="5 5"
                  label={{ value: '30 % příjmu', position: 'right', fill: '#fdc700' }}
                />
                <ReferenceLine
                  y={income * 0.4}
                  stroke="#ff6266"
                  strokeDasharray="5 5"
                  label={{ value: '40 % příjmu', position: 'right', fill: '#ff6266' }}
                />
                <Line
                  type="monotone"
                  dataKey="payment"
                  name="Měsíční splátka"
                  stroke="#0082ce"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Emergency fund recommendation */}
      <div className="alert alert-info shadow-sm">
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
        <div>
          <h3 className="font-bold">Doporučená finanční rezerva</h3>
          <div className="text-sm">
            Doporučujeme mít naspořeno alespoň{' '}
            <strong>{formatCurrency(Math.round(results.emergencyFundRecommendation))}</strong>{' '}
            (6× nejvyšší možná splátka). To odpovídá{' '}
            {formatNumber(Math.ceil(results.emergencyFundRecommendation / income), { decimals: 0 })}{' '}
            měsícům vašeho příjmu.
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-base-content/50 border-t border-base-200 pt-4">
        <p>
          <strong>Právní upozornění:</strong> Tento stresový test slouží pouze k orientačním
          výpočtům a nepředstavuje finanční poradenství. Skutečné dopady změn úrokových sazeb
          závisí na typu fixace, podmínkách vaší smlouvy a dalších faktorech. Před rozhodnutím
          se poraďte s nezávislým finančním poradcem.
        </p>
      </div>
    </div>
  );
}
