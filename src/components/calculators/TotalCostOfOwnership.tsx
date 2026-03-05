import { useState, useEffect, useMemo } from 'react';
import Slider from '../ui/Slider';
import {
  calculateTotalCostOfOwnership,
  type TCOParams,
} from '../../lib/totalCostOfOwnership';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '../../lib/formatters';

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

function setParamsToURL(params: Params) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();

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

const DEFAULTS: Params = {
  propertyPrice: 5_000_000,
  downPayment: 1_000_000,
  mortgageRate: 4.5,
  mortgageYears: 30,
  propertyArea: 70,
  fondOprav: 15,
  insurance: 3_000,
  tax: 2_500,
  maintenanceRate: 1.0,
  energy: 3_000,
  notary: 15_000,
  valuation: 5_000,
  bankFee: 10_000,
  agentCommission: 0,
};

export default function TotalCostOfOwnership() {
  const urlParams = useMemo(() => getParamsFromURL(), []);

  // Mortgage parameters
  const [propertyPrice, setPropertyPrice] = useState(
    urlParams.propertyPrice ?? DEFAULTS.propertyPrice
  );
  const [downPayment, setDownPayment] = useState(
    urlParams.downPayment ?? DEFAULTS.downPayment
  );
  const [mortgageRate, setMortgageRate] = useState(
    urlParams.mortgageRate ?? DEFAULTS.mortgageRate
  );
  const [mortgageYears, setMortgageYears] = useState(
    urlParams.mortgageYears ?? DEFAULTS.mortgageYears
  );

  // Property parameters
  const [propertyArea, setPropertyArea] = useState(
    urlParams.propertyArea ?? DEFAULTS.propertyArea
  );

  // Mandatory costs
  const [fondOprav, setFondOprav] = useState(
    urlParams.fondOprav ?? DEFAULTS.fondOprav
  );
  const [insurance, setInsurance] = useState(
    urlParams.insurance ?? DEFAULTS.insurance
  );
  const [tax, setTax] = useState(
    urlParams.tax ?? DEFAULTS.tax
  );

  // Variable costs
  const [maintenanceRate, setMaintenanceRate] = useState(
    urlParams.maintenanceRate ?? DEFAULTS.maintenanceRate
  );
  const [energy, setEnergy] = useState(
    urlParams.energy ?? DEFAULTS.energy
  );

  // Transaction costs
  const [notary, setNotary] = useState(
    urlParams.notary ?? DEFAULTS.notary
  );
  const [valuation, setValuation] = useState(
    urlParams.valuation ?? DEFAULTS.valuation
  );
  const [bankFee, setBankFee] = useState(
    urlParams.bankFee ?? DEFAULTS.bankFee
  );
  const [agentCommission, setAgentCommission] = useState(
    urlParams.agentCommission ?? DEFAULTS.agentCommission
  );

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
    });
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

  return (
    <div className="space-y-8">
      {/* Input Panel */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-6">
          <h2 className="card-title">Parametry nemovitosti</h2>

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
    </div>
  );
}
