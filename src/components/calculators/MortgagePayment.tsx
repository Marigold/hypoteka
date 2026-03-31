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
import SharedMortgageInputs from '../ui/SharedMortgageInputs';
import ResultCard from '../ui/ResultCard';
import {
  calculateMonthlyPayment,
  calculateAmortizationSchedule,
  calculateTotalCost,
  calculateBankProfit,
} from '../../lib/mortgage';
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
}

function getParamsFromURL(): Partial<Params> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<Params> = {};
  const pp = sp.get('cena');
  const dp = sp.get('akontace');
  const r = sp.get('urok');
  const y = sp.get('roky');
  if (pp) result.propertyPrice = Number(pp);
  if (dp) result.downPaymentPercent = Number(dp);
  if (r) result.rate = Number(r);
  if (y) result.years = Number(y);
  return result;
}

function setParamsToURL(params: Params) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  sp.set('cena', String(params.propertyPrice));
  sp.set('akontace', String(params.downPaymentPercent));
  sp.set('urok', String(params.rate));
  sp.set('roky', String(params.years));
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

type AmortizationView = 'monthly' | 'yearly';

export default function MortgagePayment() {
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const propertyPrice = useStore($propertyPrice);
  const downPaymentPercent = useStore($downPaymentPercent);
  const principal = useStore($mortgageAmount);
  const rate = useStore($mortgageRate);
  const years = useStore($mortgageYears);
  const [tableView, setTableView] = useState<AmortizationView>('yearly');
  const [tableOpen, setTableOpen] = useState(false);

  // Initialize store from URL params (once on mount)
  useEffect(() => {
    if (urlParams.propertyPrice != null) $propertyPrice.set(urlParams.propertyPrice);
    if (urlParams.downPaymentPercent != null) $downPaymentPercent.set(urlParams.downPaymentPercent);
    if (urlParams.rate != null) $mortgageRate.set(urlParams.rate);
    if (urlParams.years != null) $mortgageYears.set(urlParams.years);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to URL
  useEffect(() => {
    setParamsToURL({ propertyPrice, downPaymentPercent, rate, years });
  }, [propertyPrice, downPaymentPercent, rate, years]);

  const monthly = useMemo(
    () => calculateMonthlyPayment(principal, rate, years),
    [principal, rate, years],
  );

  const totalCost = useMemo(
    () => calculateTotalCost(principal, rate, years),
    [principal, rate, years],
  );

  const bankProfit = useMemo(
    () => calculateBankProfit(principal, rate, years),
    [principal, rate, years],
  );

  const schedule = useMemo(
    () => calculateAmortizationSchedule(principal, rate, years),
    [principal, rate, years],
  );

  // Chart data: yearly aggregates of principal vs interest
  const chartData = useMemo(() => {
    const yearly: { year: number; principal: number; interest: number }[] = [];
    let princAcc = 0;
    let intAcc = 0;
    for (const row of schedule) {
      princAcc += row.principal;
      intAcc += row.interest;
      if (row.month % 12 === 0) {
        yearly.push({
          year: row.month / 12,
          principal: Math.round(princAcc),
          interest: Math.round(intAcc),
        });
        princAcc = 0;
        intAcc = 0;
      }
    }
    // Handle remaining months if term isn't exact years
    if (princAcc > 0 || intAcc > 0) {
      yearly.push({
        year: Math.ceil(schedule.length / 12),
        principal: Math.round(princAcc),
        interest: Math.round(intAcc),
      });
    }
    return yearly;
  }, [schedule]);

  // Amortization table data
  const tableData = useMemo(() => {
    if (tableView === 'monthly') return schedule;
    // Yearly aggregation
    const yearly: {
      year: number;
      payment: number;
      principal: number;
      interest: number;
      remainingBalance: number;
    }[] = [];
    let payAcc = 0;
    let princAcc = 0;
    let intAcc = 0;
    for (const row of schedule) {
      payAcc += row.payment;
      princAcc += row.principal;
      intAcc += row.interest;
      if (row.month % 12 === 0) {
        yearly.push({
          year: row.month / 12,
          payment: Math.round(payAcc),
          principal: Math.round(princAcc),
          interest: Math.round(intAcc),
          remainingBalance: Math.round(row.remainingBalance),
        });
        payAcc = 0;
        princAcc = 0;
        intAcc = 0;
      }
    }
    if (payAcc > 0) {
      yearly.push({
        year: Math.ceil(schedule.length / 12),
        payment: Math.round(payAcc),
        principal: Math.round(princAcc),
        interest: Math.round(intAcc),
        remainingBalance: 0,
      });
    }
    return yearly;
  }, [schedule, tableView]);

  const tooltipFormatter = useCallback(
    (value: number | undefined) => formatCurrency(Math.round(value ?? 0)),
    [],
  );

  return (
    <div className="space-y-8">
      <SharedMortgageInputs />

      {/* Results */}
      <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
        <ResultCard
          label="Měsíční splátka"
          value={formatCurrency(Math.round(monthly))}
          color="primary"
        />
        <ResultCard
          label="Celkem zaplatíte"
          value={formatCurrency(Math.round(totalCost.totalPaid))}
          description={`${formatNumber(totalCost.effectiveMultiplier, { decimals: 2 })}× původní částky`}
        />
        <ResultCard
          label="Z toho úroky"
          value={formatCurrency(Math.round(totalCost.totalInterest))}
          color="warning"
        />
      </div>

      {/* Bank profit */}
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
          <h3 className="font-bold">
            Banka na tobě vydělá {formatCurrency(Math.round(bankProfit.bankProfit))}
          </h3>
          <div className="text-xs">
            Celkové úroky: {formatCurrency(Math.round(bankProfit.bankRevenue))},
            náklady banky na financování: {formatCurrency(Math.round(bankProfit.bankFundingCost))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Splátky v čase – jistina vs. úroky</h2>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
                  dataKey="principal"
                  name="Jistina"
                  stackId="1"
                  stroke="#0082ce"
                  fill="#0082ce"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="interest"
                  name="Úroky"
                  stackId="1"
                  stroke="#fdc700"
                  fill="#fdc700"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Amortization Table */}
      <div className="collapse collapse-arrow bg-base-100 border border-base-200">
        <input
          type="checkbox"
          checked={tableOpen}
          onChange={() => setTableOpen(!tableOpen)}
        />
        <div className="collapse-title font-medium">Splátkový kalendář</div>
        <div className="collapse-content">
          {/* Tabs */}
          <div className="tabs tabs-boxed mb-4">
            <button
              type="button"
              className={`tab ${tableView === 'yearly' ? 'tab-active' : ''}`}
              onClick={() => setTableView('yearly')}
            >
              Roční přehled
            </button>
            <button
              type="button"
              className={`tab ${tableView === 'monthly' ? 'tab-active' : ''}`}
              onClick={() => setTableView('monthly')}
            >
              Měsíční přehled
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>{tableView === 'yearly' ? 'Rok' : 'Měsíc'}</th>
                  <th className="text-right">Splátka</th>
                  <th className="text-right">Jistina</th>
                  <th className="text-right">Úroky</th>
                  <th className="text-right">Zbývá</th>
                </tr>
              </thead>
              <tbody>
                {tableView === 'monthly'
                  ? schedule.map((row) => (
                      <tr key={row.month}>
                        <td>{row.month}</td>
                        <td className="text-right">{formatCurrency(Math.round(row.payment))}</td>
                        <td className="text-right">{formatCurrency(Math.round(row.principal))}</td>
                        <td className="text-right">{formatCurrency(Math.round(row.interest))}</td>
                        <td className="text-right">
                          {formatCurrency(Math.round(row.remainingBalance))}
                        </td>
                      </tr>
                    ))
                  : (
                      tableData as {
                        year: number;
                        payment: number;
                        principal: number;
                        interest: number;
                        remainingBalance: number;
                      }[]
                    ).map((row) => (
                      <tr key={row.year}>
                        <td>{row.year}</td>
                        <td className="text-right">{formatCurrency(row.payment)}</td>
                        <td className="text-right">{formatCurrency(row.principal)}</td>
                        <td className="text-right">{formatCurrency(row.interest)}</td>
                        <td className="text-right">{formatCurrency(row.remainingBalance)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Disclaimer */}

    </div>
  );
}
