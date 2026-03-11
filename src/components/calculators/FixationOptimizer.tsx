import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import SharedMortgageInputs from '../ui/SharedMortgageInputs';
import Slider from '../ui/Slider';
import ResultCard from '../ui/ResultCard';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '../../lib/formatters';
import {
  calculateFixationScenarios,
  type FixationRateMap,
} from '../../lib/fixationOptimizer';
import { $propertyPrice, $downPaymentPercent, $mortgageAmount, $mortgageYears } from '../../stores/mortgage';

interface Params {
  propertyPrice: number;
  downPaymentPercent: number;
  remainingYears: number;
  holdingPeriod: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  rate1y: number;
  rate3y: number;
  rate5y: number;
  rate7y: number;
  rate10y: number;
  rate15y: number;
  rate20y: number;
}

function getParamsFromURL(): Partial<Params> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<Params> = {};
  const pp = sp.get('cena');
  const dp = sp.get('akontace');
  const ry = sp.get('zbyvajici');
  const hp = sp.get('drzeni');
  const rt = sp.get('riziko');
  const r1 = sp.get('fixace1');
  const r3 = sp.get('fixace3');
  const r5 = sp.get('fixace5');
  const r7 = sp.get('fixace7');
  const r10 = sp.get('fixace10');
  const r15 = sp.get('fixace15');
  const r20 = sp.get('fixace20');
  if (pp) result.propertyPrice = Number(pp);
  if (dp) result.downPaymentPercent = Number(dp);
  if (ry) result.remainingYears = Number(ry);
  if (hp) result.holdingPeriod = Number(hp);
  if (rt && ['conservative', 'moderate', 'aggressive'].includes(rt)) {
    result.riskTolerance = rt as 'conservative' | 'moderate' | 'aggressive';
  }
  if (r1) result.rate1y = Number(r1);
  if (r3) result.rate3y = Number(r3);
  if (r5) result.rate5y = Number(r5);
  if (r7) result.rate7y = Number(r7);
  if (r10) result.rate10y = Number(r10);
  if (r15) result.rate15y = Number(r15);
  if (r20) result.rate20y = Number(r20);
  return result;
}

function setParamsToURL(params: Params) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  sp.set('cena', String(params.propertyPrice));
  sp.set('akontace', String(params.downPaymentPercent));
  sp.set('zbyvajici', String(params.remainingYears));
  sp.set('drzeni', String(params.holdingPeriod));
  sp.set('riziko', params.riskTolerance);
  sp.set('fixace1', String(params.rate1y));
  sp.set('fixace3', String(params.rate3y));
  sp.set('fixace5', String(params.rate5y));
  sp.set('fixace7', String(params.rate7y));
  sp.set('fixace10', String(params.rate10y));
  sp.set('fixace15', String(params.rate15y));
  sp.set('fixace20', String(params.rate20y));
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

const DEFAULTS = {
  holdingPeriod: 5,
  riskTolerance: 'moderate' as const,
  rate1y: 4.2,
  rate3y: 4.4,
  rate5y: 4.5,
  rate7y: 4.6,
  rate10y: 4.7,
  rate15y: 4.8,
  rate20y: 4.9,
};

const RISK_TOLERANCE_LABELS: Record<string, string> = {
  conservative: 'Konzervativní',
  moderate: 'Vyvážený',
  aggressive: 'Agresivní',
};

// Historical Hypoindex data (Swiss Life Hypoindex - average mortgage rates)
// Showing 11+ years of historical volatility to provide context for fixation decisions
const HISTORICAL_HYPOINDEX_DATA = [
  { year: 2014, rate: 2.89 },
  { year: 2015, rate: 2.32 },
  { year: 2016, rate: 2.09 },
  { year: 2017, rate: 2.18 },
  { year: 2018, rate: 2.65 },
  { year: 2019, rate: 2.91 },
  { year: 2020, rate: 2.45 },
  { year: 2021, rate: 2.68 },
  { year: 2022, rate: 4.89 },
  { year: 2023, rate: 5.76 },
  { year: 2024, rate: 5.12 },
  { year: 2025, rate: 4.48 },
];

export default function FixationOptimizer() {
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const propertyPrice = useStore($propertyPrice);
  const downPaymentPercent = useStore($downPaymentPercent);
  const loanAmount = useStore($mortgageAmount);
  const remainingYears = useStore($mortgageYears);
  const [holdingPeriod, setHoldingPeriod] = useState(
    urlParams.holdingPeriod ?? DEFAULTS.holdingPeriod,
  );
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>(
    urlParams.riskTolerance ?? DEFAULTS.riskTolerance,
  );
  const [rate1y, setRate1y] = useState(urlParams.rate1y ?? DEFAULTS.rate1y);
  const [rate3y, setRate3y] = useState(urlParams.rate3y ?? DEFAULTS.rate3y);
  const [rate5y, setRate5y] = useState(urlParams.rate5y ?? DEFAULTS.rate5y);
  const [rate7y, setRate7y] = useState(urlParams.rate7y ?? DEFAULTS.rate7y);
  const [rate10y, setRate10y] = useState(urlParams.rate10y ?? DEFAULTS.rate10y);
  const [rate15y, setRate15y] = useState(urlParams.rate15y ?? DEFAULTS.rate15y);
  const [rate20y, setRate20y] = useState(urlParams.rate20y ?? DEFAULTS.rate20y);

  // Initialize store from URL params (once on mount)
  useEffect(() => {
    if (urlParams.propertyPrice != null) $propertyPrice.set(urlParams.propertyPrice);
    if (urlParams.downPaymentPercent != null) $downPaymentPercent.set(urlParams.downPaymentPercent);
    if (urlParams.remainingYears != null) $mortgageYears.set(urlParams.remainingYears);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to URL
  useEffect(() => {
    setParamsToURL({
      propertyPrice,
      downPaymentPercent,
      remainingYears,
      holdingPeriod,
      riskTolerance,
      rate1y,
      rate3y,
      rate5y,
      rate7y,
      rate10y,
      rate15y,
      rate20y,
    });
  }, [
    propertyPrice,
    downPaymentPercent,
    remainingYears,
    holdingPeriod,
    riskTolerance,
    rate1y,
    rate3y,
    rate5y,
    rate7y,
    rate10y,
    rate15y,
    rate20y,
  ]);

  // Build fixation rates map
  const fixationRates: FixationRateMap = useMemo(
    () => ({
      1: rate1y,
      3: rate3y,
      5: rate5y,
      7: rate7y,
      10: rate10y,
      15: rate15y,
      20: rate20y,
    }),
    [rate1y, rate3y, rate5y, rate7y, rate10y, rate15y, rate20y],
  );

  // Calculate optimization results
  const results = useMemo(
    () =>
      calculateFixationScenarios({
        loanAmount,
        remainingYears,
        fixationRates,
        holdingPeriod,
        riskTolerance,
      }),
    [loanAmount, remainingYears, fixationRates, holdingPeriod, riskTolerance],
  );

  // Group scenarios by fixation period for table display
  const groupedScenarios = useMemo(() => {
    const groups: {
      [fixationYears: number]: {
        optimistic?: (typeof results.scenarios)[0];
        base?: (typeof results.scenarios)[0];
        pessimistic?: (typeof results.scenarios)[0];
      };
    } = {};

    for (const scenario of results.scenarios) {
      if (!groups[scenario.fixationYears]) {
        groups[scenario.fixationYears] = {};
      }
      groups[scenario.fixationYears][scenario.rateScenario] = scenario;
    }

    return groups;
  }, [results.scenarios]);

  // Sensitivity analysis: how does recommendation change with rate shifts?
  const sensitivityData = useMemo(() => {
    const rateShifts = [-1.0, -0.5, 0, 0.5, 1.0];
    const data: {
      shift: number;
      label: string;
      recommendedFixation: number;
      totalCost: number;
      costDifference: number;
    }[] = [];

    const baselineCost = results.scenarios.find(
      (s) =>
        s.fixationYears === results.recommendation.fixationYears && s.rateScenario === 'base',
    )?.totalPaid ?? 0;

    for (const shift of rateShifts) {
      // Apply rate shift to all fixation rates
      const shiftedRates: FixationRateMap = {
        1: rate1y + shift,
        3: rate3y + shift,
        5: rate5y + shift,
        7: rate7y + shift,
        10: rate10y + shift,
        15: rate15y + shift,
        20: rate20y + shift,
      };

      // Calculate with shifted rates
      const shiftedResults = calculateFixationScenarios({
        loanAmount,
        remainingYears,
        fixationRates: shiftedRates,
        holdingPeriod,
        riskTolerance,
      });

      const recommendedScenario = shiftedResults.scenarios.find(
        (s) =>
          s.fixationYears === shiftedResults.recommendation.fixationYears &&
          s.rateScenario === 'base',
      );

      data.push({
        shift,
        label: shift === 0 ? 'Aktuální' : `${shift > 0 ? '+' : ''}${shift.toFixed(1)} %`,
        recommendedFixation: shiftedResults.recommendation.fixationYears,
        totalCost: recommendedScenario?.totalPaid ?? 0,
        costDifference: (recommendedScenario?.totalPaid ?? 0) - baselineCost,
      });
    }

    return data;
  }, [
    loanAmount,
    remainingYears,
    holdingPeriod,
    riskTolerance,
    rate1y,
    rate3y,
    rate5y,
    rate7y,
    rate10y,
    rate15y,
    rate20y,
    results.recommendation.fixationYears,
    results.scenarios,
  ]);

  // State for table visibility
  const [tableOpen, setTableOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);

  return (
    <div className="space-y-8">
      <SharedMortgageInputs showRate={false} yearsMin={1} yearsLabel="Zbývající doba splatnosti" />

      {/* Additional Parameters */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry optimalizace</h2>

          <Slider
            label="Plánované období držení"
            value={holdingPeriod}
            min={1}
            max={20}
            step={1}
            onChange={setHoldingPeriod}
            formatValue={(v) => `${v} let`}
            minLabel="1 rok"
            maxLabel="20 let"
            showInput
            suffix="let"
          />

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Tolerance rizika</span>
              <span className="label-text-alt font-semibold text-primary">
                {RISK_TOLERANCE_LABELS[riskTolerance]}
              </span>
            </label>
            <div className="btn-group w-full">
              <button
                type="button"
                className={`btn btn-sm flex-1 ${riskTolerance === 'conservative' ? 'btn-active' : ''}`}
                onClick={() => setRiskTolerance('conservative')}
              >
                Konzervativní
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-1 ${riskTolerance === 'moderate' ? 'btn-active' : ''}`}
                onClick={() => setRiskTolerance('moderate')}
              >
                Vyvážený
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-1 ${riskTolerance === 'aggressive' ? 'btn-active' : ''}`}
                onClick={() => setRiskTolerance('aggressive')}
              >
                Agresivní
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input Panel - Fixation Rates */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Úrokové sazby podle délky fixace</h2>
          <p className="text-sm text-base-content/60">
            Zadejte aktuální úrokové sazby pro jednotlivé délky fixace, které vám nabízí banky.
          </p>

          <Slider
            label="Fixace 1 rok"
            value={rate1y}
            min={1}
            max={10}
            step={0.1}
            onChange={setRate1y}
            formatValue={(v) => formatPercent(v)}
            minLabel="1 %"
            maxLabel="10 %"
            showInput
            suffix="%"
          />

          <Slider
            label="Fixace 3 roky"
            value={rate3y}
            min={1}
            max={10}
            step={0.1}
            onChange={setRate3y}
            formatValue={(v) => formatPercent(v)}
            minLabel="1 %"
            maxLabel="10 %"
            showInput
            suffix="%"
          />

          <Slider
            label="Fixace 5 let"
            value={rate5y}
            min={1}
            max={10}
            step={0.1}
            onChange={setRate5y}
            formatValue={(v) => formatPercent(v)}
            minLabel="1 %"
            maxLabel="10 %"
            showInput
            suffix="%"
          />

          <Slider
            label="Fixace 7 let"
            value={rate7y}
            min={1}
            max={10}
            step={0.1}
            onChange={setRate7y}
            formatValue={(v) => formatPercent(v)}
            minLabel="1 %"
            maxLabel="10 %"
            showInput
            suffix="%"
          />

          <Slider
            label="Fixace 10 let"
            value={rate10y}
            min={1}
            max={10}
            step={0.1}
            onChange={setRate10y}
            formatValue={(v) => formatPercent(v)}
            minLabel="1 %"
            maxLabel="10 %"
            showInput
            suffix="%"
          />

          <Slider
            label="Fixace 15 let"
            value={rate15y}
            min={1}
            max={10}
            step={0.1}
            onChange={setRate15y}
            formatValue={(v) => formatPercent(v)}
            minLabel="1 %"
            maxLabel="10 %"
            showInput
            suffix="%"
          />

          <Slider
            label="Fixace 20 let"
            value={rate20y}
            min={1}
            max={10}
            step={0.1}
            onChange={setRate20y}
            formatValue={(v) => formatPercent(v)}
            minLabel="1 %"
            maxLabel="10 %"
            showInput
            suffix="%"
          />
        </div>
      </div>

      {/* Educational Section */}
      <div className="collapse collapse-arrow bg-base-100 border border-base-200">
        <input
          type="checkbox"
          checked={educationOpen}
          onChange={() => setEducationOpen(!educationOpen)}
        />
        <div className="collapse-title font-medium">
          Co je fixace a jak refixace funguje v České republice?
        </div>
        <div className="collapse-content">
          <div className="space-y-4 text-sm">
            {/* What is fixation */}
            <div>
              <h4 className="font-semibold text-base mb-2">Co je fixace úrokové sazby?</h4>
              <p className="text-base-content/80 mb-2">
                Fixace je doba, po kterou máte garantovanou konkrétní úrokovou sazbu hypotéky. V
                České republice je možné fixovat úrokovou sazbu na 1, 3, 5, 7, 10, 15 nebo 20 let.
                Po skončení fixovaného období dochází k <strong>refixaci</strong> – dohodě na nové
                úrokové sazbě na další období.
              </p>
              <p className="text-base-content/80">
                Fixace vás chrání před nárůstem úrokových sazeb – pokud sazby na trhu vzrostou,
                vy stále platíte původní sazbu. Na druhou stranu, pokud sazby klesnou, nemůžete z
                toho těžit až do konce fixace (bez zaplacení smluvní pokuty).
              </p>
            </div>

            {/* How refixation works */}
            <div className="divider"></div>
            <div>
              <h4 className="font-semibold text-base mb-2">Jak funguje refixace u českých bank?</h4>
              <ul className="list-disc list-inside space-y-2 text-base-content/80">
                <li>
                  <strong>Automatické oznámení:</strong> Banka vás kontaktuje 3-6 měsíců před
                  koncem fixace a nabídne novou úrokovou sazbu
                </li>
                <li>
                  <strong>Vyjednávání:</strong> Máte právo vyjednat lepší sazbu nebo přejít k jiné
                  bance (často bez poplatku)
                </li>
                <li>
                  <strong>Změna podmínek:</strong> Při refixaci můžete změnit délku nové fixace,
                  případně upravit výši měsíční splátky nebo dobu splatnosti
                </li>
                <li>
                  <strong>Refinancování:</strong> Pokud nabídka vaší banky není konkurenceschopná,
                  můžete refinancovat hypotéku u jiné banky (obvykle bez poplatku při refixaci)
                </li>
                <li>
                  <strong>Nová sazba:</strong> Úroková sazba po refixaci závisí na aktuální situaci
                  na trhu, repo sazbě ČNB a vašem vyjednávacím postavení
                </li>
              </ul>
            </div>

            {/* Pros and cons */}
            <div className="divider"></div>
            <div>
              <h4 className="font-semibold text-base mb-2">Výhody a nevýhody různých délek fixace</h4>

              <div className="grid md:grid-cols-2 gap-4 mt-3">
                {/* Short fixation */}
                <div className="card bg-info/5 border border-info/20">
                  <div className="card-body p-4">
                    <h5 className="font-semibold text-info">Krátká fixace (1-3 roky)</h5>
                    <div className="mt-2">
                      <p className="font-medium text-success mb-1">✓ Výhody:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-base-content/80">
                        <li>Nižší úroková sazba (obvykle o 0,1-0,3 % nižší než dlouhá fixace)</li>
                        <li>Flexibilita – můžete rychleji reagovat na pokles sazeb</li>
                        <li>Vhodné, pokud očekáváte pokles úrokových sazeb</li>
                        <li>Možnost brzy změnit podmínky nebo refinancovat</li>
                      </ul>
                      <p className="font-medium text-error mt-2 mb-1">✗ Nevýhody:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-base-content/80">
                        <li>Riziko růstu sazeb – splátka může výrazně vzrůst</li>
                        <li>Nejistota – nevíte, kolik budete platit za 2-3 roky</li>
                        <li>Častější administrativa (častější refixace)</li>
                        <li>Ztížené dlouhodobé finanční plánování</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Long fixation */}
                <div className="card bg-warning/5 border border-warning/20">
                  <div className="card-body p-4">
                    <h5 className="font-semibold text-warning">Dlouhá fixace (7-20 let)</h5>
                    <div className="mt-2">
                      <p className="font-medium text-success mb-1">✓ Výhody:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-base-content/80">
                        <li>Jistota – známe výši splátky na mnoho let dopředu</li>
                        <li>Ochrana před růstem úrokových sazeb</li>
                        <li>Vhodné při vysoké inflaci nebo očekávaném růstu sazeb</li>
                        <li>Psychický klid a snadnější rozpočtování</li>
                      </ul>
                      <p className="font-medium text-error mt-2 mb-1">✗ Nevýhody:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-base-content/80">
                        <li>Vyšší úroková sazba (o 0,3-0,7 % vyšší než krátká fixace)</li>
                        <li>Nemožnost těžit z poklesu sazeb bez pokuty</li>
                        <li>Vysoká sankcní smluvní pokuta při předčasném splacení (1-5 % dluhu)</li>
                        <li>Nevýhodné, pokud plánujete byt brzy prodat</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Practical tips */}
            <div className="divider"></div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold text-base mb-2">💡 Praktické rady pro volbu fixace</h4>
              <ul className="list-disc list-inside space-y-1 text-base-content/80">
                <li>
                  <strong>V období nízkých sazeb</strong> (2-3 %) volte dlouhou fixaci – zajistíte
                  si výhodnou sazbu na dlouho
                </li>
                <li>
                  <strong>V období vysokých sazeb</strong> (5-6 %+) zvažte kratší fixaci – sazby
                  mají větší prostor klesnout
                </li>
                <li>
                  <strong>Kompromis:</strong> Střední fixace (5-7 let) nabízí rovnováhu mezi cenou
                  a jistotou
                </li>
                <li>
                  <strong>Pokud plánujete brzy prodat nebo splatit:</strong> volte kratší fixaci
                  (1-3 roky)
                </li>
                <li>
                  <strong>Konzervativní přístup:</strong> Pokud nemůžete risknúť růst splátky,
                  volte dlouhou fixaci bez ohledu na sazbu
                </li>
                <li>
                  <strong>Před koncem fixace:</strong> Začněte vyjednávat s bankou 6 měsíců předem
                  a porovnejte nabídky jiných bank
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Doporučená fixace</h2>
          <div className="stats stats-vertical lg:stats-horizontal shadow-sm w-full">
            <ResultCard
              label="Doporučená délka fixace"
              value={
                <>
                  {results.recommendation.fixationYears}{' '}
                  {results.recommendation.fixationYears === 1
                    ? 'rok'
                    : results.recommendation.fixationYears < 5
                      ? 'roky'
                      : 'let'}
                </>
              }
              description={results.recommendation.reason}
              color="primary"
            />
            <ResultCard
              label="Rozpětí nákladů"
              value={formatCurrency(results.summary.costSpread)}
              description={`Mezi nejlepším a nejhorším scénářem`}
              color="warning"
            />
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h3 className="card-title">Analýza citlivosti na změnu sazeb</h3>
          <p className="text-sm text-base-content/60 mb-4">
            Tento graf ukazuje, jak by se změnilo doporučení, kdyby všechny úrokové sazby vzrostly
            nebo klesly. Pomáhá vám pochopit, jak robustní je aktuální doporučení.
          </p>

          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={sensitivityData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                label={{ value: 'Posun všech úrokových sazeb', position: 'insideBottom', offset: -5, fontSize: 14 }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Doporučená fixace (roky)', angle: -90, position: 'insideLeft', fontSize: 14 }}
                domain={[0, 'auto']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrencyCompact(value)}
                label={{ value: 'Rozdíl nákladů', angle: 90, position: 'insideRight', fontSize: 14 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--b1))',
                  border: '1px solid hsl(var(--b3))',
                  borderRadius: '0.5rem',
                }}
                formatter={(value: number | undefined, name: string | undefined) => {
                  const displayName = name ?? '';
                  if (value === undefined) return ['', displayName];
                  if (name === 'Doporučená fixace') {
                    const years = value;
                    return [
                      `${value} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'let'}`,
                      displayName,
                    ];
                  }
                  return [formatCurrency(value), displayName];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
              <Bar
                yAxisId="left"
                dataKey="recommendedFixation"
                fill="hsl(var(--p))"
                name="Doporučená fixace"
                radius={[4, 4, 0, 0]}
              >
                {sensitivityData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.shift === 0 ? 'hsl(var(--s))' : 'hsl(var(--p))'}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="right"
                dataKey="costDifference"
                fill="hsl(var(--a))"
                name="Rozdíl nákladů"
                radius={[4, 4, 0, 0]}
                opacity={0.6}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-3">
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th className="bg-base-200">Posun sazeb</th>
                    <th className="bg-base-200">Doporučená fixace</th>
                    <th className="bg-base-200 text-right">Celkové náklady</th>
                    <th className="bg-base-200 text-right">Rozdíl oproti aktuálnímu</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityData.map((item) => (
                    <tr
                      key={item.shift}
                      className={item.shift === 0 ? 'bg-secondary/10' : ''}
                    >
                      <td className="font-medium">{item.label}</td>
                      <td>
                        <span className="badge badge-primary">
                          {item.recommendedFixation}{' '}
                          {item.recommendedFixation === 1
                            ? 'rok'
                            : item.recommendedFixation < 5
                              ? 'roky'
                              : 'let'}
                        </span>
                      </td>
                      <td className="text-right font-mono">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="text-right font-mono">
                        {item.costDifference === 0 ? (
                          <span className="text-base-content/50">—</span>
                        ) : (
                          <span
                            className={
                              item.costDifference > 0 ? 'text-error' : 'text-success'
                            }
                          >
                            {item.costDifference > 0 ? '+' : ''}
                            {formatCurrency(item.costDifference)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-base-content/60">
              <p>
                <strong>Jak číst analýzu citlivosti:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>
                  <strong>Stabilní doporučení:</strong> Pokud je doporučená fixace stejná napříč
                  různými scénáři, je volba robustní.
                </li>
                <li>
                  <strong>Měnící se doporučení:</strong> Pokud se doporučení mění s malými posuny
                  sazeb, znamená to, že více fixací je velmi blízko.
                </li>
                <li>
                  <strong>Rozdíl nákladů:</strong> Ukazuje, jak by se změnily celkové náklady při
                  posunu sazeb oproti aktuální situaci.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="card-title">Porovnání všech scénářů</h3>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setTableOpen(!tableOpen)}
            >
              {tableOpen ? 'Skrýt' : 'Zobrazit'}
            </button>
          </div>

          {tableOpen && (
            <div className="overflow-x-auto mt-4">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th className="bg-base-200">Fixace</th>
                    <th className="bg-base-200">Scénář</th>
                    <th className="bg-base-200 text-right">Celkové úroky</th>
                    <th className="bg-base-200 text-right">Celkem zaplaceno</th>
                    <th className="bg-base-200 text-right">Průměrná splátka</th>
                    <th className="bg-base-200 text-right">Počet refixací</th>
                    <th className="bg-base-200 text-right">Změna sazby</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(groupedScenarios)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((fixationYears) => {
                      const group = groupedScenarios[fixationYears];
                      const scenarios = [
                        group.optimistic,
                        group.base,
                        group.pessimistic,
                      ].filter(Boolean);

                      return scenarios.map((scenario, idx) => (
                        <tr
                          key={`${fixationYears}-${scenario!.rateScenario}`}
                          className={
                            scenario!.fixationYears === results.recommendation.fixationYears &&
                            scenario!.rateScenario === 'base'
                              ? 'bg-primary/10'
                              : ''
                          }
                        >
                          {idx === 0 ? (
                            <td rowSpan={scenarios.length} className="font-semibold">
                              {fixationYears}{' '}
                              {fixationYears === 1 ? 'rok' : fixationYears < 5 ? 'roky' : 'let'}
                            </td>
                          ) : null}
                          <td>
                            <span
                              className={`badge badge-sm ${
                                scenario!.rateScenario === 'optimistic'
                                  ? 'badge-success'
                                  : scenario!.rateScenario === 'base'
                                    ? 'badge-info'
                                    : 'badge-warning'
                              }`}
                            >
                              {scenario!.rateScenario === 'optimistic'
                                ? 'Optimistický'
                                : scenario!.rateScenario === 'base'
                                  ? 'Základní'
                                  : 'Pesimistický'}
                            </span>
                          </td>
                          <td className="text-right font-mono">
                            {formatCurrency(scenario!.totalInterest)}
                          </td>
                          <td className="text-right font-mono">
                            {formatCurrency(scenario!.totalPaid)}
                          </td>
                          <td className="text-right font-mono">
                            {formatCurrency(scenario!.averageMonthlyPayment)}
                          </td>
                          <td className="text-right">{scenario!.refixationCount}×</td>
                          <td className="text-right">
                            <span
                              className={
                                scenario!.rateChangeAtRefixation > 0
                                  ? 'text-error'
                                  : scenario!.rateChangeAtRefixation < 0
                                    ? 'text-success'
                                    : ''
                              }
                            >
                              {scenario!.rateChangeAtRefixation > 0 ? '+' : ''}
                              {scenario!.rateChangeAtRefixation.toFixed(1)} %
                            </span>
                          </td>
                        </tr>
                      ));
                    })}
                </tbody>
              </table>

              <div className="mt-4 text-sm text-base-content/60">
                <p>
                  <strong>Vysvětlení scénářů:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>
                    <strong>Optimistický:</strong> Předpokládá pokles úrokových sazeb při refixaci
                  </li>
                  <li>
                    <strong>Základní:</strong> Předpokládá stabilní úrokové sazby při refixaci
                  </li>
                  <li>
                    <strong>Pesimistický:</strong> Předpokládá nárůst úrokových sazeb při refixaci
                  </li>
                </ul>
                <p className="mt-2">
                  Zelená řádka označuje doporučenou fixaci v základním scénáři pro vaši toleranci
                  rizika.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Rate Context */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h3 className="card-title">Historický vývoj průměrných sazeb hypoték</h3>
          <p className="text-sm text-base-content/60 mb-4">
            Swiss Life Hypoindex ukazuje průměrné úrokové sazby hypoték v České republice. Graf
            demonstruje volatilitu sazeb a pomáhá pochopit rizika krátkých a dlouhých fixací.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={HISTORICAL_HYPOINDEX_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => String(value)}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value} %`}
                domain={[0, 'auto']}
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined
                    ? [`${value.toFixed(2)} %`, 'Průměrná sazba']
                    : ['N/A', 'Průměrná sazba']
                }
                labelFormatter={(label) => `Rok ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--b1))',
                  border: '1px solid hsl(var(--b3))',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '14px' }}
                formatter={() => 'Průměrná úroková sazba (%)'}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--p))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--p))', r: 4 }}
                activeDot={{ r: 6 }}
                name="Průměrná úroková sazba"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 text-sm text-base-content/60">
            <p>
              <strong>Klíčové poznatky:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Sazby v letech 2015-2021 kolísaly mezi 2% a 3%</li>
              <li>V letech 2022-2023 vzrostly nad 5% kvůli inflaci a růstu repo sazby ČNB</li>
              <li>V roce 2025 sazby opět klesly kolem 4,5% díky snížení repo sazby na 3,5%</li>
              <li>
                <strong>Volatilita ukazuje</strong>, že rozdíl mezi fixacemi může být značný a
                volba závisí na očekávání budoucího vývoje
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-base-content/50 border-t border-base-200 pt-4">
        <p>
          <strong>Právní upozornění:</strong> Tento nástroj slouží pouze k orientačním výpočtům
          a nepředstavuje finanční poradenství. Optimální délka fixace závisí na mnoha faktorech
          včetně vývoje úrokových sazeb, inflace a vaší osobní situace. Před rozhodnutím se
          poraďte s nezávislým finančním poradcem nebo přímo s bankou.
        </p>
      </div>
    </div>
  );
}
