import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import Slider from '../ui/Slider';
import ResultCard from '../ui/ResultCard';
import {
  calculateTotalCostOfOwnership,
  type TCOParams,
} from '../../lib/totalCostOfOwnership';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '../../lib/formatters';

type Region = 'prague' | 'regional';

interface Params {
  propertyPrice: number;
  downPayment: number;
  mortgageRate: number;
  mortgageYears: number;
  propertyArea: number;
  fondOprav: number;
  insurance: number;
  tax: number;
  maintenanceRate: number;
  energy: number;
  notary: number;
  valuation: number;
  bankFee: number;
  agentCommission: number;
}

function getRegionFromURL(): Region {
  if (typeof window === 'undefined') return 'prague';
  const sp = new URLSearchParams(window.location.search);
  const region = sp.get('oblast');
  return region === 'regionalni' ? 'regional' : 'prague';
}

function getParamsFromURL(): Partial<Params> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<Params> = {};

  const propertyPrice = sp.get('cena');
  const downPayment = sp.get('hotovost');
  const mortgageRate = sp.get('urok');
  const mortgageYears = sp.get('roky');
  const propertyArea = sp.get('plocha');
  const fondOprav = sp.get('fond');
  const insurance = sp.get('pojisteni');
  const tax = sp.get('dan');
  const maintenanceRate = sp.get('udrzba');
  const energy = sp.get('energie');
  const notary = sp.get('notar');
  const valuation = sp.get('odhad');
  const bankFee = sp.get('poplatek');
  const agentCommission = sp.get('provize');

  if (propertyPrice) result.propertyPrice = Number(propertyPrice);
  if (downPayment) result.downPayment = Number(downPayment);
  if (mortgageRate) result.mortgageRate = Number(mortgageRate);
  if (mortgageYears) result.mortgageYears = Number(mortgageYears);
  if (propertyArea) result.propertyArea = Number(propertyArea);
  if (fondOprav) result.fondOprav = Number(fondOprav);
  if (insurance) result.insurance = Number(insurance);
  if (tax) result.tax = Number(tax);
  if (maintenanceRate) result.maintenanceRate = Number(maintenanceRate);
  if (energy) result.energy = Number(energy);
  if (notary) result.notary = Number(notary);
  if (valuation) result.valuation = Number(valuation);
  if (bankFee) result.bankFee = Number(bankFee);
  if (agentCommission) result.agentCommission = Number(agentCommission);

  return result;
}

function setParamsToURL(params: Params, region: Region) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();

  sp.set('oblast', region === 'prague' ? 'praha' : 'regionalni');
  sp.set('cena', String(params.propertyPrice));
  sp.set('hotovost', String(params.downPayment));
  sp.set('urok', String(params.mortgageRate));
  sp.set('roky', String(params.mortgageYears));
  sp.set('plocha', String(params.propertyArea));
  sp.set('fond', String(params.fondOprav));
  sp.set('pojisteni', String(params.insurance));
  sp.set('dan', String(params.tax));
  sp.set('udrzba', String(params.maintenanceRate));
  sp.set('energie', String(params.energy));
  sp.set('notar', String(params.notary));
  sp.set('odhad', String(params.valuation));
  sp.set('poplatek', String(params.bankFee));
  sp.set('provize', String(params.agentCommission));

  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

const PRAGUE_DEFAULTS: Params = {
  propertyPrice: 8_000_000,
  downPayment: 1_600_000,
  mortgageRate: 4.5,
  mortgageYears: 30,
  propertyArea: 60,
  fondOprav: 20,
  insurance: 4_000,
  tax: 4_000,
  maintenanceRate: 1.0,
  energy: 3_500,
  notary: 20_000,
  valuation: 7_000,
  bankFee: 12_000,
  agentCommission: 0,
};

const REGIONAL_DEFAULTS: Params = {
  propertyPrice: 4_000_000,
  downPayment: 800_000,
  mortgageRate: 4.5,
  mortgageYears: 30,
  propertyArea: 70,
  fondOprav: 12,
  insurance: 2_500,
  tax: 1_500,
  maintenanceRate: 1.0,
  energy: 2_500,
  notary: 15_000,
  valuation: 5_000,
  bankFee: 10_000,
  agentCommission: 0,
};

function getDefaults(region: Region): Params {
  return region === 'prague' ? PRAGUE_DEFAULTS : REGIONAL_DEFAULTS;
}

export default function TotalCostOfOwnership() {
  const urlRegion = useMemo(() => getRegionFromURL(), []);
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const initialDefaults = useMemo(() => getDefaults(urlRegion), [urlRegion]);

  // Region selection
  const [region, setRegion] = useState<Region>(urlRegion);

  // Mortgage parameters
  const [propertyPrice, setPropertyPrice] = useState(
    urlParams.propertyPrice ?? initialDefaults.propertyPrice
  );
  const [downPayment, setDownPayment] = useState(
    urlParams.downPayment ?? initialDefaults.downPayment
  );
  const [mortgageRate, setMortgageRate] = useState(
    urlParams.mortgageRate ?? initialDefaults.mortgageRate
  );
  const [mortgageYears, setMortgageYears] = useState(
    urlParams.mortgageYears ?? initialDefaults.mortgageYears
  );

  // Property parameters
  const [propertyArea, setPropertyArea] = useState(
    urlParams.propertyArea ?? initialDefaults.propertyArea
  );

  // Mandatory costs
  const [fondOprav, setFondOprav] = useState(
    urlParams.fondOprav ?? initialDefaults.fondOprav
  );
  const [insurance, setInsurance] = useState(
    urlParams.insurance ?? initialDefaults.insurance
  );
  const [tax, setTax] = useState(
    urlParams.tax ?? initialDefaults.tax
  );

  // Variable costs
  const [maintenanceRate, setMaintenanceRate] = useState(
    urlParams.maintenanceRate ?? initialDefaults.maintenanceRate
  );
  const [energy, setEnergy] = useState(
    urlParams.energy ?? initialDefaults.energy
  );

  // Transaction costs
  const [notary, setNotary] = useState(
    urlParams.notary ?? initialDefaults.notary
  );
  const [valuation, setValuation] = useState(
    urlParams.valuation ?? initialDefaults.valuation
  );
  const [bankFee, setBankFee] = useState(
    urlParams.bankFee ?? initialDefaults.bankFee
  );
  const [agentCommission, setAgentCommission] = useState(
    urlParams.agentCommission ?? initialDefaults.agentCommission
  );

  // Handle region change - update all values to region defaults
  const handleRegionChange = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    const defaults = getDefaults(newRegion);
    setPropertyPrice(defaults.propertyPrice);
    setDownPayment(defaults.downPayment);
    setMortgageRate(defaults.mortgageRate);
    setMortgageYears(defaults.mortgageYears);
    setPropertyArea(defaults.propertyArea);
    setFondOprav(defaults.fondOprav);
    setInsurance(defaults.insurance);
    setTax(defaults.tax);
    setMaintenanceRate(defaults.maintenanceRate);
    setEnergy(defaults.energy);
    setNotary(defaults.notary);
    setValuation(defaults.valuation);
    setBankFee(defaults.bankFee);
    setAgentCommission(defaults.agentCommission);
  }, []);

  // Sync to URL
  useEffect(() => {
    setParamsToURL({
      propertyPrice,
      downPayment,
      mortgageRate,
      mortgageYears,
      propertyArea,
      fondOprav,
      insurance,
      tax,
      maintenanceRate,
      energy,
      notary,
      valuation,
      bankFee,
      agentCommission,
    }, region);
  }, [
    region,
    propertyPrice,
    downPayment,
    mortgageRate,
    mortgageYears,
    propertyArea,
    fondOprav,
    insurance,
    tax,
    maintenanceRate,
    energy,
    notary,
    valuation,
    bankFee,
    agentCommission,
  ]);

  // Calculate TCO
  const tcoResult = useMemo(() => {
    const params: TCOParams = {
      propertyPrice,
      downPayment,
      mortgageRate,
      mortgageYears,
      propertyArea,
      fondOpravPerSqmMonth: fondOprav,
      propertyInsuranceAnnual: insurance,
      propertyTaxAnnual: tax,
      maintenanceReserveRate: maintenanceRate,
      energyCostsMonthly: energy,
      transactionCosts: {
        notary,
        valuation,
        bankFee,
        agentCommission,
      },
      inflationRate: 3.0,
    };
    return calculateTotalCostOfOwnership(params);
  }, [
    propertyPrice,
    downPayment,
    mortgageRate,
    mortgageYears,
    propertyArea,
    fondOprav,
    insurance,
    tax,
    maintenanceRate,
    energy,
    notary,
    valuation,
    bankFee,
    agentCommission,
  ]);

  // Chart data for cost breakdown visualization
  const chartData = useMemo(() => {
    return [
      {
        name: 'Hypotéka',
        value: Math.round(tcoResult.costBreakdown.mortgagePayment),
        color: '#3b82f6', // blue
      },
      {
        name: 'Fond oprav',
        value: Math.round(tcoResult.costBreakdown.mandatoryCosts.fondOprav),
        color: '#8b5cf6', // purple
      },
      {
        name: 'Pojištění',
        value: Math.round(tcoResult.costBreakdown.mandatoryCosts.insurance),
        color: '#ec4899', // pink
      },
      {
        name: 'Daň',
        value: Math.round(tcoResult.costBreakdown.mandatoryCosts.tax),
        color: '#f97316', // orange
      },
      {
        name: 'Údržba',
        value: Math.round(tcoResult.costBreakdown.variableCosts.maintenance),
        color: '#eab308', // yellow
      },
      {
        name: 'Energie',
        value: Math.round(tcoResult.costBreakdown.variableCosts.energy),
        color: '#14b8a6', // teal
      },
    ];
  }, [tcoResult]);

  const tooltipFormatter = useCallback(
    (value: number | undefined) => formatCurrency(Math.round(value ?? 0)),
    [],
  );

  return (
    <div className="space-y-8">
      {/* Input Panel */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="card-title">Parametry nemovitosti</h2>

            {/* Region Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => handleRegionChange('prague')}
                className={`btn btn-sm ${
                  region === 'prague' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Praha
              </button>
              <button
                onClick={() => handleRegionChange('regional')}
                className={`btn btn-sm ${
                  region === 'regional' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Regionální
              </button>
            </div>
          </div>

          {/* Property & Mortgage Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Nemovitost a hypotéka</h3>

            <Slider
              label="Cena nemovitosti"
              value={propertyPrice}
              min={1_000_000}
              max={20_000_000}
              step={100_000}
              onChange={setPropertyPrice}
              formatValue={(v) => formatCurrencyCompact(v)}
              minLabel="1 mil. Kč"
              maxLabel="20 mil. Kč"
              showInput
              suffix="Kč"
            />

            <Slider
              label="Vlastní hotovost"
              value={downPayment}
              min={0}
              max={propertyPrice}
              step={50_000}
              onChange={setDownPayment}
              formatValue={(v) => formatCurrencyCompact(v)}
              minLabel="0 Kč"
              maxLabel={formatCurrencyCompact(propertyPrice)}
              showInput
              suffix="Kč"
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
              min={5}
              max={40}
              step={1}
              onChange={setMortgageYears}
              formatValue={(v) => `${v} let`}
              minLabel="5 let"
              maxLabel="40 let"
              showInput
              suffix="let"
            />

            <Slider
              label="Plocha bytu"
              value={propertyArea}
              min={20}
              max={200}
              step={5}
              onChange={setPropertyArea}
              formatValue={(v) => `${v} m²`}
              minLabel="20 m²"
              maxLabel="200 m²"
              showInput
              suffix="m²"
            />
          </div>

          {/* Mandatory Costs */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Povinné náklady</h3>

            <Slider
              label="Fond oprav (Kč/m²/měsíc)"
              value={fondOprav}
              min={5}
              max={30}
              step={1}
              onChange={setFondOprav}
              formatValue={(v) => `${v} Kč/m²`}
              minLabel="5 Kč/m²"
              maxLabel="30 Kč/m²"
              showInput
              suffix="Kč/m²"
            />

            <Slider
              label="Pojištění nemovitosti (roční)"
              value={insurance}
              min={1_000}
              max={10_000}
              step={500}
              onChange={setInsurance}
              formatValue={(v) => formatCurrency(v)}
              minLabel="1 000 Kč"
              maxLabel="10 000 Kč"
              showInput
              suffix="Kč"
            />

            <Slider
              label="Daň z nemovitosti (roční)"
              value={tax}
              min={500}
              max={10_000}
              step={500}
              onChange={setTax}
              formatValue={(v) => formatCurrency(v)}
              minLabel="500 Kč"
              maxLabel="10 000 Kč"
              showInput
              suffix="Kč"
            />
          </div>

          {/* Variable Costs */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Provozní náklady</h3>

            <Slider
              label="Rezerva na údržbu (% z ceny ročně)"
              value={maintenanceRate}
              min={0}
              max={3}
              step={0.1}
              onChange={setMaintenanceRate}
              formatValue={(v) => formatPercent(v)}
              minLabel="0 %"
              maxLabel="3 %"
              showInput
              suffix="%"
            />

            <Slider
              label="Energie (měsíčně)"
              value={energy}
              min={1_000}
              max={10_000}
              step={500}
              onChange={setEnergy}
              formatValue={(v) => formatCurrency(v)}
              minLabel="1 000 Kč"
              maxLabel="10 000 Kč"
              showInput
              suffix="Kč"
            />
          </div>

          {/* Transaction Costs */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transakční náklady (jednorázové)</h3>

            <Slider
              label="Notář a vklad do katastru"
              value={notary}
              min={0}
              max={50_000}
              step={1_000}
              onChange={setNotary}
              formatValue={(v) => formatCurrency(v)}
              minLabel="0 Kč"
              maxLabel="50 000 Kč"
              showInput
              suffix="Kč"
            />

            <Slider
              label="Odhad nemovitosti"
              value={valuation}
              min={0}
              max={20_000}
              step={1_000}
              onChange={setValuation}
              formatValue={(v) => formatCurrency(v)}
              minLabel="0 Kč"
              maxLabel="20 000 Kč"
              showInput
              suffix="Kč"
            />

            <Slider
              label="Poplatek bance"
              value={bankFee}
              min={0}
              max={50_000}
              step={1_000}
              onChange={setBankFee}
              formatValue={(v) => formatCurrency(v)}
              minLabel="0 Kč"
              maxLabel="50 000 Kč"
              showInput
              suffix="Kč"
            />

            <Slider
              label="Provize realitní kanceláři"
              value={agentCommission}
              min={0}
              max={500_000}
              step={10_000}
              onChange={setAgentCommission}
              formatValue={(v) => formatCurrency(v)}
              minLabel="0 Kč"
              maxLabel="500 000 Kč"
              showInput
              suffix="Kč"
            />
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4">Skutečné náklady na bydlení</h2>

          {/* Primary Comparison */}
          <div className="stats shadow mb-6">
            <ResultCard
              label="Měsíční splátka hypotéky"
              value={formatCurrency(tcoResult.monthlyMortgagePayment)}
              description="Samotná splátka úvěru"
            />
            <ResultCard
              label="Skutečné měsíční náklady"
              value={formatCurrency(tcoResult.totalMonthlyCost)}
              description="Včetně všech provozních nákladů"
              color="primary"
            />
            <ResultCard
              label="Skryté náklady"
              value={formatCurrency(tcoResult.hiddenMonthlyCosts)}
              description={`+${tcoResult.hiddenCostsPercentage}% navíc oproti hypotéce`}
              color="warning"
            />
          </div>

          {/* Cost Breakdown Visualization */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rozpad měsíčních nákladů</h3>

            <div className="bg-base-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Cost Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rozpad nákladů</h3>

            <div className="stats shadow w-full">
              <ResultCard
                label="Hypotéka"
                value={formatCurrency(tcoResult.costBreakdown.mortgagePayment)}
                description="Měsíční splátka"
              />
              <ResultCard
                label="Povinné náklady"
                value={formatCurrency(tcoResult.costBreakdown.mandatoryCosts.total)}
                description={`${tcoResult.costBreakdown.mandatoryCosts.percentage.toFixed(1)}% celkových nákladů`}
              />
              <ResultCard
                label="Provozní náklady"
                value={formatCurrency(tcoResult.costBreakdown.variableCosts.total)}
                description={`${tcoResult.costBreakdown.variableCosts.percentage.toFixed(1)}% celkových nákladů`}
              />
            </div>

            {/* Mandatory Costs Detail */}
            <div className="p-4 bg-base-200 rounded-lg">
              <h4 className="font-semibold mb-2">Povinné náklady (měsíčně):</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  Fond oprav: <span className="font-semibold">{formatCurrency(tcoResult.costBreakdown.mandatoryCosts.fondOprav)}</span>
                </div>
                <div>
                  Pojištění: <span className="font-semibold">{formatCurrency(tcoResult.costBreakdown.mandatoryCosts.insurance)}</span>
                </div>
                <div>
                  Daň: <span className="font-semibold">{formatCurrency(tcoResult.costBreakdown.mandatoryCosts.tax)}</span>
                </div>
              </div>
            </div>

            {/* Variable Costs Detail */}
            <div className="p-4 bg-base-200 rounded-lg">
              <h4 className="font-semibold mb-2">Provozní náklady (měsíčně):</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  Údržba: <span className="font-semibold">{formatCurrency(tcoResult.costBreakdown.variableCosts.maintenance)}</span>
                </div>
                <div>
                  Energie: <span className="font-semibold">{formatCurrency(tcoResult.costBreakdown.variableCosts.energy)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lifetime Costs */}
          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold">Celkové náklady za {mortgageYears} let</h3>

            <div className="stats shadow w-full">
              <ResultCard
                label="Celkem bez inflace"
                value={formatCurrency(tcoResult.lifetimeCosts.totalWithoutInflation)}
                description={`Hypotéka: ${formatCurrency(tcoResult.lifetimeCosts.totalMortgagePayments)}`}
              />
              <ResultCard
                label="Celkem s inflací"
                value={formatCurrency(tcoResult.lifetimeCosts.totalWithInflation)}
                description={`Vlastnictví: ${formatCurrency(tcoResult.lifetimeCosts.totalOwnershipCosts)}`}
                color="primary"
              />
              <ResultCard
                label="Transakční náklady"
                value={formatCurrency(tcoResult.costBreakdown.transactionCostsTotal)}
                description="Jednorázové při koupi"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
