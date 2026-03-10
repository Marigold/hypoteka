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
import Slider from '../ui/Slider';
import ResultCard from '../ui/ResultCard';
import { stressTest, type RiskLevel } from '../../lib/stressTest';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatNumber,
} from '../../lib/formatters';
import { $mortgageAmount, DEFAULT_MORTGAGE_AMOUNT } from '../../stores/mortgage';

interface Params {
  principal: number;
  rate: number;
  years: number;
  income: number;
}

function getParamsFromURL(): Partial<Params> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<Params> = {};
  const p = sp.get('castka');
  const r = sp.get('urok');
  const y = sp.get('roky');
  const i = sp.get('prijem');
  if (p) result.principal = Number(p);
  if (r) result.rate = Number(r);
  if (y) result.years = Number(y);
  if (i) result.income = Number(i);
  return result;
}

function setParamsToURL(params: Params) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  sp.set('castka', String(params.principal));
  sp.set('urok', String(params.rate));
  sp.set('roky', String(params.years));
  sp.set('prijem', String(params.income));
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

const DEFAULTS: Params = {
  principal: DEFAULT_MORTGAGE_AMOUNT,
  rate: 4.5,
  years: 30,
  income: 60_000,
};

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
  const storeAmount = useStore($mortgageAmount);
  const [principal, setPrincipal] = useState(urlParams.principal ?? storeAmount ?? DEFAULT_MORTGAGE_AMOUNT);
  const [rate, setRate] = useState(urlParams.rate ?? DEFAULTS.rate);
  const [years, setYears] = useState(urlParams.years ?? DEFAULTS.years);
  const [income, setIncome] = useState(urlParams.income ?? DEFAULTS.income);

  // Sync to URL
  useEffect(() => {
    setParamsToURL({ principal, rate, years, income });
  }, [principal, rate, years, income]);

  // Sync principal to global store
  useEffect(() => {
    $mortgageAmount.set(principal);
  }, [principal]);

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
    // Show payments for rate from current to current+5 in 0.5 steps
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
      {/* Input Panel */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry stresového testu</h2>

          <Slider
            label="Výše úvěru"
            value={principal}
            min={500_000}
            max={15_000_000}
            step={100_000}
            onChange={setPrincipal}
            formatValue={(v) => formatCurrencyCompact(v)}
            minLabel="500 tis. Kč"
            maxLabel="15 mil. Kč"
            showInput
            suffix="Kč"
          />

          <Slider
            label="Úroková sazba"
            value={rate}
            min={1}
            max={10}
            step={0.1}
            onChange={setRate}
            formatValue={(v) => formatPercent(v)}
            minLabel="1 %"
            maxLabel="10 %"
            showInput
            suffix="%"
          />

          <Slider
            label="Doba splácení"
            value={years}
            min={5}
            max={30}
            step={1}
            onChange={setYears}
            formatValue={(v) => `${v} let`}
            minLabel="5 let"
            maxLabel="30 let"
            showInput
            suffix="let"
          />

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
