import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import {
  AreaChart,
  Area,
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
import { compareRentVsBuy } from '../../lib/rentVsBuy';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '../../lib/formatters';
import { $propertyPrice, $downPaymentPercent, $mortgageRate, $mortgageYears } from '../../stores/mortgage';
import {
  $ownershipCostPercent,
  $notary,
  $valuation,
  $bankFee,
  $agentCommission,
} from '../../stores/ownershipCosts';

const DEFAULTS = {
  rentalYield: 4,
  propertyAppreciation: 5,
  investmentReturnRate: 7,
};

export default function RentVsBuy() {
  const propertyPrice = useStore($propertyPrice);
  const downPaymentPercent = useStore($downPaymentPercent);
  const mortgageRate = useStore($mortgageRate);
  const mortgageYears = useStore($mortgageYears);

  // Derived ownership cost % from TCO stores
  const derivedOwnershipPercent = useStore($ownershipCostPercent);

  // Local override — initialized from the computed store value
  const [ownershipPercentOverride, setOwnershipPercentOverride] = useState<number | null>(null);
  const ownershipPercent = ownershipPercentOverride ?? derivedOwnershipPercent;

  // Transaction costs from shared stores
  const notary = useStore($notary);
  const valuationFee = useStore($valuation);
  const bankFee = useStore($bankFee);
  const agentCommission = useStore($agentCommission);

  // Comparison-specific params (local state)
  const [rentalYield, setRentalYield] = useState(DEFAULTS.rentalYield);
  const [propertyAppreciation, setPropertyAppreciation] = useState(DEFAULTS.propertyAppreciation);
  const [investmentReturnRate, setInvestmentReturnRate] = useState(DEFAULTS.investmentReturnRate);

  const monthlyRent = Math.round(propertyPrice * (rentalYield / 100) / 12);
  const downPayment = Math.round(propertyPrice * (downPaymentPercent / 100));
  const monthlyOwnershipCost = Math.round((propertyPrice * (ownershipPercent / 100)) / 12);

  const results = useMemo(
    () =>
      compareRentVsBuy({
        propertyPrice,
        downPayment,
        mortgageRate,
        mortgageYears,
        monthlyRent,
        propertyAppreciation,
        investmentReturnRate,
        ownershipCostPercent: ownershipPercent,
        transactionCosts: {
          notary,
          valuation: valuationFee,
          bankFee,
          agentCommission,
        },
        taxDeductionCap: 150_000,
      }),
    [
      propertyPrice, downPayment, mortgageRate, mortgageYears, monthlyRent,
      propertyAppreciation, investmentReturnRate, ownershipPercent,
      notary, valuationFee, bankFee, agentCommission,
    ],
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
      <SharedMortgageInputs />

      {/* Comparison params */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry srovnání</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buying params */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">Koupě</h3>

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
                label="Náklady na vlastnictví (% z ceny ročně)"
                value={ownershipPercent}
                min={0}
                max={5}
                step={0.05}
                onChange={setOwnershipPercentOverride}
                formatValue={(v) => `${formatPercent(v)} → ${formatCurrency(Math.round((propertyPrice * (v / 100)) / 12))}/měs.`}
                minLabel="0 %"
                maxLabel="5 %"
                showInput
                suffix="%"
              />
              <div className="text-xs text-base-content/50 -mt-2">
                Fond oprav, pojištění, daň, údržba.{' '}
                <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/kalkulacky/celkove-naklady-vlastnictvi`} className="link link-primary">
                  Upřesnit v kalkulačce nákladů →
                </a>
              </div>
            </div>

            {/* Renting params */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">Nájem + investice</h3>

              <Slider
                label="Výnos z pronájmu (roční)"
                value={rentalYield}
                min={1}
                max={8}
                step={0.25}
                onChange={setRentalYield}
                formatValue={(v) => formatPercent(v)}
                minLabel="1 %"
                maxLabel="8 %"
                showInput
                suffix="%"
              />
              <div className="text-sm text-base-content/60">
                Měsíční nájem: <strong>{formatCurrency(monthlyRent)}</strong>
              </div>

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

      {/* Chart: Net worth comparison */}
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
                {breakevenYear && (
                  <ReferenceLine
                    x={breakevenYear}
                    stroke="#666"
                    strokeDasharray="3 3"
                    label={{ value: 'Bod zvratu', position: 'top', fontSize: 12 }}
                  />
                )}
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

      {/* Detail table */}
      <div className="collapse collapse-arrow bg-base-100 border border-base-200 shadow-sm">
        <input type="checkbox" />
        <div className="collapse-title font-semibold">
          📊 Detailní srovnání po letech
        </div>
        <div className="collapse-content overflow-x-auto">
          <table className="table table-xs table-zebra">
            <thead>
              <tr>
                <th rowSpan={2} className="align-bottom">Rok</th>
                <th colSpan={4} className="text-center border-b-0 text-success">🏠 Koupě</th>
                <th colSpan={2} className="text-center border-b-0 text-info">🏢 Nájem</th>
                <th rowSpan={2} className="text-right align-bottom font-bold">Rozdíl</th>
              </tr>
              <tr>
                <th className="text-right">Hodnota</th>
                <th className="text-right">Hypotéka</th>
                <th className="text-right">Měs. náklady</th>
                <th className="text-right font-bold">Čisté jmění</th>
                <th className="text-right">Měs. nájem</th>
                <th className="text-right font-bold">Čisté jmění</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const diff = r.buyingNetWorth - r.rentingNetWorth;
                return (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td className="text-right">{formatCurrencyCompact(r.propertyValue)}</td>
                    <td className="text-right text-error">{formatCurrencyCompact(r.mortgageBalance)}</td>
                    <td className="text-right">{formatCurrency(r.buyingMonthlyCost)}</td>
                    <td className="text-right font-bold text-success">{formatCurrencyCompact(r.buyingNetWorth)}</td>
                    <td className="text-right">{formatCurrency(r.rentingMonthlyCost)}</td>
                    <td className="text-right font-bold text-info">{formatCurrencyCompact(r.rentingNetWorth)}</td>
                    <td className={`text-right font-bold ${diff > 0 ? 'text-success' : 'text-warning'}`}>
                      {diff > 0 ? '+' : ''}{formatCurrencyCompact(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model explanation */}
      <div className="collapse collapse-arrow bg-base-100 border border-base-200 shadow-sm">
        <input type="checkbox" />
        <div className="collapse-title font-semibold">
          📐 Jak výpočet funguje
        </div>
        <div className="collapse-content prose prose-sm max-w-none">
          <p>
            Kalkulačka porovnává dvě strategie pro člověka, který má naspořenou
            určitou částku (vlastní prostředky) a rozhoduje se, jak s ní naložit:
          </p>

          <h4>Varianta A – Koupě</h4>
          <ol>
            <li>Zaplatí <strong>akontaci</strong> a <strong>transakční náklady</strong> (notář, odhad, poplatek bance).</li>
            <li>Zbytek financuje <strong>hypotékou</strong> s anuitní splátkou.</li>
            <li>
              Každý měsíc platí splátku hypotéky + <strong>náklady na vlastnictví</strong>{' '}
              (fond oprav, pojištění, daň z nemovitosti, údržba) jako procento z aktuální hodnoty nemovitosti.
              Toto procento si můžete upřesnit v{' '}
              <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/kalkulacky/celkove-naklady-vlastnictvi`} className="link link-primary">kalkulačce celkových nákladů</a>.
            </li>
            <li>Nemovitost každý rok <strong>zhodnocuje</strong> o zadané procento (růst ceny již zahrnuje vliv údržby a rekonstrukcí).</li>
            <li>
              <strong>Daňový odpočet:</strong> zaplacené úroky z hypotéky (max. 150 000 Kč/rok)
              snižují základ daně. Úspora 15 % z odečtené částky se připočítává k jmění kupujícího.
            </li>
            <li><strong>Čisté jmění kupujícího</strong> = hodnota nemovitosti − zbývající hypotéka + naspořený přebytek.</li>
          </ol>

          <h4>Varianta B – Nájem + investice</h4>
          <ol>
            <li>
              Naspořenou částku (akontaci + transakční náklady) <strong>investuje</strong> na
              kapitálovém trhu se zadaným ročním výnosem.
            </li>
            <li>Každý měsíc platí <strong>nájem</strong>, který roste stejným tempem jako ceny nemovitostí.</li>
            <li><strong>Čisté jmění nájemce</strong> = hodnota investičního portfolia.</li>
          </ol>

          <h4>Srovnání – stejný rozpočet</h4>
          <p>
            Klíčový princip: obě varianty mají <strong>stejný měsíční rozpočet</strong>.
            Ten se rovná té dražší z obou variant v daném měsíci. Kdo utratí méně,
            rozdíl investuje. Díky tomu je srovnání férové — nikdo nemá „peníze navíc."
          </p>
          <p>
            Typicky je koupě zpočátku dražší (splátka + náklady {'>'} nájem), takže nájemce
            investuje rozdíl. Pokud by nájem časem přerostl náklady na koupě, kupující
            by naopak investoval svůj přebytek.
          </p>

          <h4>Co model nezahrnuje</h4>
          <ul>
            <li>Energie a služby — platí je obě strany přibližně stejně.</li>
            <li>Emocionální hodnotu vlastního bydlení.</li>
            <li>Riziko ztráty zaměstnání, rozvodu, stěhování.</li>
            <li>Změny úrokové sazby po refixaci (pro to máme <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/kalkulacky/stresovy-test`} className="link link-primary">stresový test</a>).</li>
            <li>Daň z příjmu při prodeji investic (u ETF po 3 letech osvobozeno).</li>
          </ul>
        </div>
      </div>

      {/* Disclaimer */}

    </div>
  );
}
