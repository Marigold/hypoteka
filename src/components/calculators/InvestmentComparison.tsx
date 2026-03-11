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
  ReferenceLine,
} from 'recharts';
import SharedMortgageInputs from '../ui/SharedMortgageInputs';
import Slider from '../ui/Slider';
import ResultCard from '../ui/ResultCard';
import {
  compareInvestments,
  getLeverageRiskLevel,
  type LeverageRiskLevel,
} from '../../lib/investmentComparison';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '../../lib/formatters';
import { $propertyPrice, $downPaymentPercent, $mortgageRate, $mortgageYears } from '../../stores/mortgage';

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

const DEFAULTS = {
  propertyAppreciation: 3,
  monthlyRentalIncome: 15_000,
  holdingPeriod: 15,
  stockReturnRate: 7,
};

export default function InvestmentComparison() {
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const propertyPrice = useStore($propertyPrice);
  const downPaymentPercent = useStore($downPaymentPercent);
  const mortgageRate = useStore($mortgageRate);
  const mortgageYears = useStore($mortgageYears);
  const [propertyAppreciation, setPropertyAppreciation] = useState(urlParams.propertyAppreciation ?? DEFAULTS.propertyAppreciation);
  const [monthlyRentalIncome, setMonthlyRentalIncome] = useState(urlParams.monthlyRentalIncome ?? DEFAULTS.monthlyRentalIncome);
  const [holdingPeriod, setHoldingPeriod] = useState(urlParams.holdingPeriod ?? DEFAULTS.holdingPeriod);
  const [stockReturnRate, setStockReturnRate] = useState(urlParams.stockReturnRate ?? DEFAULTS.stockReturnRate);

  // Initialize store from URL params (once on mount)
  useEffect(() => {
    if (urlParams.propertyPrice != null) $propertyPrice.set(urlParams.propertyPrice);
    if (urlParams.downPaymentPercent != null) $downPaymentPercent.set(urlParams.downPaymentPercent);
    if (urlParams.mortgageRate != null) $mortgageRate.set(urlParams.mortgageRate);
    if (urlParams.mortgageYears != null) $mortgageYears.set(urlParams.mortgageYears);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const results = useMemo(
    () =>
      compareInvestments({
        propertyPrice,
        downPaymentPercent,
        mortgageRate,
        mortgageYears,
        propertyAppreciation,
        monthlyRentalIncome,
        holdingPeriod,
        stockReturnRate,
        propertyMaintenanceRate: 1,
        propertyTransactionCost: 4,
        rentalTaxRate: 10.5,
      }),
    [propertyPrice, downPaymentPercent, mortgageRate, mortgageYears, propertyAppreciation, monthlyRentalIncome, holdingPeriod, stockReturnRate],
  );

  // Summary statistics at end of holding period
  const lastResult = results[results.length - 1];
  const realEstateReturn = lastResult
    ? ((lastResult.realEstateNetWorthAfterTax - investmentAmount) / investmentAmount) * 100
    : 0;
  const stockReturn = lastResult
    ? ((lastResult.stockNetWorthAfterTax - investmentAmount) / investmentAmount) * 100
    : 0;
  const realEstateAnnualized = holdingPeriod > 0
    ? (Math.pow(1 + realEstateReturn / 100, 1 / holdingPeriod) - 1) * 100
    : 0;
  const stockAnnualized = holdingPeriod > 0
    ? (Math.pow(1 + stockReturn / 100, 1 / holdingPeriod) - 1) * 100
    : 0;
  const realEstateProfit = lastResult
    ? lastResult.realEstateNetWorthAfterTax - investmentAmount
    : 0;
  const stockProfit = lastResult
    ? lastResult.stockNetWorthAfterTax - investmentAmount
    : 0;
  const leverageRatio = lastResult ? lastResult.leverageRatio : 0;

  const isRealEstateBetter = realEstateProfit > stockProfit;

  // Leverage risk based on LTV
  const riskLevel = useMemo(() => getLeverageRiskLevel(downPaymentPercent), [downPaymentPercent]);
  const ltv = 100 - downPaymentPercent;

  const tooltipFormatter = useCallback(
    (value: number | undefined) => formatCurrency(Math.round(value ?? 0)),
    [],
  );

  const RISK_STYLES: Record<LeverageRiskLevel, { alert: string; label: string }> = {
    safe: { alert: 'alert-info', label: 'Bezpečné' },
    warning: { alert: 'alert-warning', label: 'Zvýšené riziko' },
    danger: { alert: 'alert-error', label: 'Vysoké riziko' },
  };

  return (
    <div className="space-y-8">
      <SharedMortgageInputs />

      {/* Input Panel */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry investic</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Estate inputs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">Nemovitost</h3>

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

      {/* Summary Result Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Real Estate Results */}
        <div className="stats stats-vertical shadow w-full">
          <ResultCard
            label="Nemovitost – celkový výnos"
            value={`${realEstateReturn >= 0 ? '+' : ''}${formatPercent(realEstateReturn)}`}
            description={`Anualizovaně: ${formatPercent(realEstateAnnualized)}`}
            color={realEstateReturn >= 0 ? 'success' : 'error'}
          />
          <ResultCard
            label="Nemovitost – čistý zisk po dani"
            value={formatCurrency(Math.round(realEstateProfit))}
            description={`Za ${holdingPeriod} let`}
            color={realEstateProfit >= 0 ? 'success' : 'error'}
          />
        </div>

        {/* Stock Results */}
        <div className="stats stats-vertical shadow w-full">
          <ResultCard
            label="Akcie – celkový výnos"
            value={`${stockReturn >= 0 ? '+' : ''}${formatPercent(stockReturn)}`}
            description={`Anualizovaně: ${formatPercent(stockAnnualized)}`}
            color={stockReturn >= 0 ? 'success' : 'error'}
          />
          <ResultCard
            label="Akcie – čistý zisk po dani"
            value={formatCurrency(Math.round(stockProfit))}
            description={`Za ${holdingPeriod} let`}
            color={stockProfit >= 0 ? 'success' : 'error'}
          />
        </div>
      </div>

      {/* Leverage ratio */}
      <div className="stats shadow w-full">
        <ResultCard
          label="Počáteční finanční páka"
          value={`${(propertyPrice / downPayment).toFixed(1)}×`}
          description={`LTV: ${ltv} % · Aktuální páka po ${holdingPeriod} letech: ${leverageRatio === Infinity ? '∞' : leverageRatio.toFixed(1)}×`}
        />
      </div>

      {/* Key takeaway */}
      <div className={`alert ${isRealEstateBetter ? 'alert-success' : 'alert-info'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          {isRealEstateBetter
            ? `Za ${holdingPeriod} let vychází investice do nemovitosti lépe o ${formatCurrency(Math.round(realEstateProfit - stockProfit))}.`
            : `Za ${holdingPeriod} let vychází investice do akcií lépe o ${formatCurrency(Math.round(stockProfit - realEstateProfit))}.`}
          {' '}Výsledek silně závisí na zvolených parametrech.
        </span>
      </div>

      {/* Leverage risk warning */}
      {riskLevel !== 'safe' && (
        <div className={`alert ${RISK_STYLES[riskLevel].alert}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            <strong>{RISK_STYLES[riskLevel].label}:</strong>{' '}
            {ltv > 90
              ? `LTV ${ltv} % je velmi vysoké. Pokles cen nemovitostí o pouhých ${Math.round(100 - (100 * downPaymentPercent) / ltv)} % by vymazal veškerý vlastní kapitál.`
              : `LTV ${ltv} % zvyšuje riziko. Finanční páka zesiluje jak zisky, tak ztráty.`}
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Vývoj čistého jmění v čase</h2>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results}>
                <defs>
                  <linearGradient id="gradRealEstate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a43b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00a43b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradStock" x1="0" y1="0" x2="0" y2="1">
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
                {holdingPeriod >= 3 && (
                  <ReferenceLine
                    x={3}
                    stroke="#666"
                    strokeDasharray="3 3"
                    label={{ value: '3 roky – test pro akcie', position: 'top', fontSize: 11 }}
                  />
                )}
                {holdingPeriod >= 10 && (
                  <ReferenceLine
                    x={10}
                    stroke="#666"
                    strokeDasharray="3 3"
                    label={{ value: '10 let – test pro nemovitost', position: 'top', fontSize: 11 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="realEstateNetWorthAfterTax"
                  name="Nemovitost – čisté jmění"
                  stroke="#00a43b"
                  fill="url(#gradRealEstate)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="stockNetWorthAfterTax"
                  name="Akcie – čisté jmění"
                  stroke="#0090b5"
                  fill="url(#gradStock)"
                  fillOpacity={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Volatility Education Section */}
      <div className="collapse collapse-arrow bg-base-100 border border-base-200 shadow-sm">
        <input type="checkbox" />
        <div className="collapse-title font-semibold">
          Proč je srovnání složitější, než se zdá – viditelná vs. skrytá volatilita
        </div>
        <div className="collapse-content space-y-4 text-sm leading-relaxed">
          <p>
            Akciový trh ukazuje hodnotu vašeho portfolia <strong>každý den</strong>. Když index spadne o 30 %, vidíte ztrátu okamžitě. Nemovitost má ale <strong>stejnou volatilitu</strong> – jen ji nevidíte, protože se neobchoduje na burze.
          </p>
          <p>
            <strong>Příklad z české reality (2008–2013):</strong> Ceny bytů v Praze klesly o 15–25 % během finanční krize. Kdo musel prodat v roce 2012, realizoval velkou ztrátu – stejně jako investor na akciovém trhu. Rozdíl? Vlastník nemovitosti ztrátu „neviděl" na displeji každý den, takže nepodléhal panice.
          </p>
          <p>
            Tato <strong>skrytá volatilita</strong> je jednou z hlavních psychologických výhod nemovitostí – ale také pastí. Investoři často podceňují riziko, protože si neuvědomují, že hodnota jejich nemovitosti kolísá stejně jako akcie.
          </p>
          <div className="bg-base-200/50 rounded-lg p-4">
            <p className="font-semibold mb-1">Klíčový závěr:</p>
            <p>
              Nemovitost není „bezpečnější" než akcie – je jen méně průhledná. Obě investice mají rizika, ale u nemovitostí je navíc riziko finanční páky (hypotéky), které může zisky i ztráty výrazně znásobit.
            </p>
          </div>
        </div>
      </div>

      {/* Tax Comparison Table */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Srovnání zdanění – akcie vs. nemovitost</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Česká daňová pravidla (platná k roku 2026) se liší podle typu investice a doby držení.
          </p>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Doba držení</th>
                  <th>Akcie (cenné papíry)</th>
                  <th>Nemovitost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold">Do 3 let</td>
                  <td>15 % z kapitálového zisku</td>
                  <td>15 % z kapitálového zisku</td>
                </tr>
                <tr>
                  <td className="font-semibold">3–10 let</td>
                  <td>
                    <span className="badge badge-success badge-sm">Osvobozeno</span>{' '}
                    po 3 letech držení
                  </td>
                  <td>15 % z kapitálového zisku</td>
                </tr>
                <tr>
                  <td className="font-semibold">Nad 10 let</td>
                  <td>
                    <span className="badge badge-success badge-sm">Osvobozeno</span>
                  </td>
                  <td>
                    <span className="badge badge-success badge-sm">Osvobozeno</span>{' '}
                    po 10 letech (5 let pokud bydlíte)
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">Příjmy z pronájmu / dividendy</td>
                  <td>15 % srážková daň z dividend</td>
                  <td>15 % daň z příjmu z pronájmu (po odpočtu nákladů)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-base-content/50 mt-2">
            Poznámka: Osvobození od daně u akcií platí při splnění podmínek § 4 zákona o daních z příjmů.
            U nemovitostí se lhůta počítá od nabytí vlastnictví. Kalkulátor automaticky zohledňuje tyto daňové podmínky.
          </p>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="text-sm">
          <p className="font-semibold">Důležité upozornění</p>
          <p>
            Tento kalkulátor slouží výhradně pro vzdělávací účely a nepředstavuje investiční doporučení.
            Minulé výnosy nejsou zárukou budoucích výnosů. Skutečné výsledky se mohou výrazně lišit v závislosti na tržních podmínkách, konkrétní lokalitě nemovitosti, načasování investice a dalších faktorech.
            Před jakýmkoliv investičním rozhodnutím se poraďte s licencovaným finančním poradcem.
          </p>
        </div>
      </div>
    </div>
  );
}
