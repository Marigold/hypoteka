import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@nanostores/react';

import Slider from '../ui/Slider';
import ResultCard from '../ui/ResultCard';
import {
  calculateAffordability,
  type BuyerType,
  type BindingConstraint,
} from '../../lib/affordability';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
} from '../../lib/formatters';
import {
  $propertyPrice,
  $downPaymentPercent,
  $mortgageRate,
  $mortgageYears,
  $autoSyncAffordability,
} from '../../stores/mortgage';


interface Params {
  monthlyIncome: number;
  partnerIncome: number;
  existingDebts: number;
  dependents: number;
  lifestyleBuffer: number;
  age: number;
  buyerType: BuyerType;
  rate: number;
  years: number;
}

function getParamsFromURL(): Partial<Params> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<Params> = {};
  const mi = sp.get('prijem');
  const pi = sp.get('prijemPartnera');
  const ed = sp.get('dluhy');
  const dep = sp.get('deti');
  const lb = sp.get('rezerva');
  const a = sp.get('vek');
  const bt = sp.get('typ');
  const r = sp.get('urok');
  const y = sp.get('roky');
  if (mi) result.monthlyIncome = Number(mi);
  if (pi) result.partnerIncome = Number(pi);
  if (ed) result.existingDebts = Number(ed);
  if (dep) result.dependents = Number(dep);
  if (lb) result.lifestyleBuffer = Number(lb);
  if (a) result.age = Number(a);
  if (bt && (bt === 'first-home' || bt === 'investment')) result.buyerType = bt;
  if (r) result.rate = Number(r);
  if (y) result.years = Number(y);
  return result;
}

function setParamsToURL(params: Params) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  sp.set('prijem', String(params.monthlyIncome));
  sp.set('prijemPartnera', String(params.partnerIncome));
  sp.set('dluhy', String(params.existingDebts));
  sp.set('deti', String(params.dependents));
  sp.set('rezerva', String(params.lifestyleBuffer));
  sp.set('vek', String(params.age));
  sp.set('typ', params.buyerType);
  sp.set('urok', String(params.rate));
  sp.set('roky', String(params.years));
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

const DEFAULT_MONTHLY_INCOME = 50_000;
const DEFAULT_PARTNER_INCOME = 0;
const DEFAULT_EXISTING_DEBTS = 0;
const DEFAULT_DEPENDENTS = 0;
const DEFAULT_LIFESTYLE_BUFFER = 10_000;
const DEFAULT_AGE = 30;
const DEFAULT_BUYER_TYPE: BuyerType = 'first-home';

const CONSTRAINT_STYLES: Record<BindingConstraint, { border: string; badge: string; badgeLabel: string }> = {
  dsti: {
    border: 'border-warning',
    badge: 'badge-warning',
    badgeLabel: 'DSTI limit',
  },
  dti: {
    border: 'border-warning',
    badge: 'badge-warning',
    badgeLabel: 'DTI limit',
  },
  ltv: {
    border: 'border-info',
    badge: 'badge-info',
    badgeLabel: 'LTV limit',
  },
};

export default function AffordabilityCalculator() {
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const rate = useStore($mortgageRate);
  const years = useStore($mortgageYears);
  const autoSyncAffordability = useStore($autoSyncAffordability);

  const [monthlyIncome, setMonthlyIncome] = useState(
    urlParams.monthlyIncome ?? DEFAULT_MONTHLY_INCOME
  );
  const [partnerIncome, setPartnerIncome] = useState(
    urlParams.partnerIncome ?? DEFAULT_PARTNER_INCOME
  );
  const [existingDebts, setExistingDebts] = useState(
    urlParams.existingDebts ?? DEFAULT_EXISTING_DEBTS
  );
  const [dependents, setDependents] = useState(
    urlParams.dependents ?? DEFAULT_DEPENDENTS
  );
  const [lifestyleBuffer, setLifestyleBuffer] = useState(
    urlParams.lifestyleBuffer ?? DEFAULT_LIFESTYLE_BUFFER
  );
  const [age, setAge] = useState(urlParams.age ?? DEFAULT_AGE);
  const [buyerType, setBuyerType] = useState<BuyerType>(
    urlParams.buyerType ?? DEFAULT_BUYER_TYPE
  );

  // Initialize from URL params (once on mount)
  useEffect(() => {
    if (urlParams.rate != null) $mortgageRate.set(urlParams.rate);
    if (urlParams.years != null) $mortgageYears.set(urlParams.years);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to URL
  useEffect(() => {
    setParamsToURL({
      monthlyIncome,
      partnerIncome,
      existingDebts,
      dependents,
      lifestyleBuffer,
      age,
      buyerType,
      rate,
      years,
    });
  }, [monthlyIncome, partnerIncome, existingDebts, dependents, lifestyleBuffer, age, buyerType, rate, years]);

  const results = useMemo(
    () =>
      calculateAffordability({
        monthlyIncome,
        partnerIncome,
        existingDebts,
        dependents,
        lifestyleBuffer,
        age,
        buyerType,
        annualRate: rate,
        years,
      }),
    [monthlyIncome, partnerIncome, existingDebts, dependents, lifestyleBuffer, age, buyerType, rate, years]
  );

  const constraintStyle = CONSTRAINT_STYLES[results.bindingConstraint];

  const handleUseInCalculators = useCallback(() => {
    $propertyPrice.set(Math.round(results.maxPropertyPrice));
    $downPaymentPercent.set(Math.round(results.downPaymentPercent));
  }, [results.maxPropertyPrice, results.downPaymentPercent]);

  useEffect(() => {
    if (!autoSyncAffordability) return;
    handleUseInCalculators();
  }, [autoSyncAffordability, handleUseInCalculators]);

  return (
    <div className="space-y-8">
      {/* Income & Household Parameters */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Příjmy a domácnost</h2>

          <Slider
            label="Čistý měsíční příjem"
            value={monthlyIncome}
            min={20_000}
            max={200_000}
            step={1_000}
            onChange={setMonthlyIncome}
            formatValue={(v) => formatCurrencyCompact(v)}
            minLabel="20 tis. Kč"
            maxLabel="200 tis. Kč"
            showInput
            suffix="Kč"
          />

          <Slider
            label="Příjem partnera (nepovinné)"
            value={partnerIncome}
            min={0}
            max={200_000}
            step={1_000}
            onChange={setPartnerIncome}
            formatValue={(v) => v === 0 ? 'Bez partnera' : formatCurrencyCompact(v)}
            minLabel="0 Kč"
            maxLabel="200 tis. Kč"
            showInput
            suffix="Kč"
          />

          <Slider
            label="Stávající měsíční splátky"
            value={existingDebts}
            min={0}
            max={50_000}
            step={500}
            onChange={setExistingDebts}
            formatValue={(v) => v === 0 ? 'Bez dluhů' : formatCurrencyCompact(v)}
            minLabel="0 Kč"
            maxLabel="50 tis. Kč"
            showInput
            suffix="Kč"
          />

          <Slider
            label="Počet vyživovaných osob"
            value={dependents}
            min={0}
            max={5}
            step={1}
            onChange={setDependents}
            formatValue={(v) => v === 0 ? 'Žádné' : `${v}`}
            minLabel="0"
            maxLabel="5"
            showInput
          />

          <Slider
            label="Měsíční rezerva na živobytí"
            value={lifestyleBuffer}
            min={0}
            max={30_000}
            step={1_000}
            onChange={setLifestyleBuffer}
            formatValue={(v) => formatCurrencyCompact(v)}
            minLabel="0 Kč"
            maxLabel="30 tis. Kč"
            showInput
            suffix="Kč"
          />
        </div>
      </div>

      {/* Borrower Profile Parameters */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Profil žadatele</h2>

          <Slider
            label="Věk hlavního žadatele"
            value={age}
            min={18}
            max={70}
            step={1}
            onChange={setAge}
            formatValue={(v) => `${v} let`}
            minLabel="18 let"
            maxLabel="70 let"
            showInput
            suffix="let"
          />

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Typ koupě</span>
            </label>
            <div className="flex gap-2">
              <button
                className={`btn flex-1 ${buyerType === 'first-home' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setBuyerType('first-home')}
              >
                První bydlení
              </button>
              <button
                className={`btn flex-1 ${buyerType === 'investment' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setBuyerType('investment')}
              >
                Investiční
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                {buyerType === 'first-home' && age < 36
                  ? 'První bydlení do 36 let: až 90 % LTV'
                  : buyerType === 'first-home'
                  ? 'První bydlení: až 80 % LTV'
                  : 'Investiční nemovitost: až 70 % LTV'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Loan Parameters */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry úvěru</h2>

          <Slider
            label="Očekávaná úroková sazba"
            value={rate}
            min={1}
            max={10}
            step={0.1}
            onChange={(v) => $mortgageRate.set(v)}
            formatValue={(v) => `${formatNumber(v, { decimals: 1 })} %`}
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
            onChange={(v) => $mortgageYears.set(v)}
            formatValue={(v) => `${v} let`}
            minLabel="5 let"
            maxLabel="30 let"
            showInput
            suffix="let"
          />
        </div>
      </div>

      {/* Results Summary */}
      <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
        <ResultCard
          label="Maximální výše úvěru"
          value={formatCurrency(Math.round(results.maxLoan))}
          color="primary"
        />
        <ResultCard
          label="Cena nemovitosti"
          value={formatCurrency(Math.round(results.maxPropertyPrice))}
          description={`Vlastní prostředky: ${formatCurrency(Math.round(results.downPaymentAmount))} (${results.downPaymentPercent} %)`}
        />
        <ResultCard
          label="Měsíční splátka"
          value={formatCurrency(Math.round(results.monthlyPayment))}
          description={`${formatNumber((results.monthlyPayment / results.totalMonthlyIncome) * 100, { decimals: 1 })} % z příjmu`}
        />
      </div>

      {/* Use in Other Calculators */}
      <div className="card bg-base-100 border border-primary/20 shadow-sm">
        <div className="card-body space-y-4">
          <div>
            <h3 className="font-semibold">Použít tyto hodnoty v jiných kalkulačkách</h3>
            <p className="text-sm text-base-content/70 mt-1">
              Cena nemovitosti a akontace se dají buď uložit ručně, nebo přenášet automaticky do ostatních kalkulaček.
            </p>
          </div>

          <label className="label cursor-pointer justify-start gap-3 p-0">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={autoSyncAffordability}
              onChange={(e) => $autoSyncAffordability.set(e.target.checked)}
            />
            <span className="label-text font-medium">Automaticky přenášet hodnoty do ostatních kalkulaček</span>
          </label>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-base-content/60">
              {autoSyncAffordability
                ? 'Automatický přenos je zapnutý — změny se ukládají průběžně.'
                : 'Automatický přenos je vypnutý — pro jednorázové uložení použij tlačítko vpravo.'}
            </p>
            <button
              onClick={handleUseInCalculators}
              className="btn btn-primary btn-sm sm:btn-md whitespace-nowrap"
              disabled={autoSyncAffordability}
            >
              Uložit hodnoty teď
            </button>
          </div>
        </div>
      </div>

      {/* Binding Constraint Explanation */}
      <div className={`card bg-base-100 border-2 ${constraintStyle.border} shadow-sm`}>
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Limitující faktor</h3>
            <span className={`badge ${constraintStyle.badge}`}>
              {constraintStyle.badgeLabel}
            </span>
          </div>
          <p className="text-sm text-base-content/70 mt-2">
            {results.constraintExplanation}
          </p>

          {/* Show all three limits for transparency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className={`bg-base-200/50 rounded-lg p-3 ${results.bindingConstraint === 'dsti' ? 'ring-2 ring-warning' : ''}`}>
              <div className="text-xs text-base-content/50">DSTI limit (45 %)</div>
              <div className="font-semibold text-sm mt-1">
                {formatCurrency(Math.round(results.maxLoanByDSTI))}
              </div>
            </div>
            <div className={`bg-base-200/50 rounded-lg p-3 ${results.bindingConstraint === 'dti' ? 'ring-2 ring-warning' : ''}`}>
              <div className="text-xs text-base-content/50">DTI limit (8.5×)</div>
              <div className="font-semibold text-sm mt-1">
                {formatCurrency(Math.round(results.maxLoanByDTI))}
              </div>
            </div>
            <div className={`bg-base-200/50 rounded-lg p-3 ${results.bindingConstraint === 'ltv' ? 'ring-2 ring-info' : ''}`}>
              <div className="text-xs text-base-content/50">{results.ltvRule.description}</div>
              <div className="font-semibold text-sm mt-1">
                {results.ltvRule.maxLTV} % LTV
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Income Breakdown */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h3 className="font-semibold">Rozpis příjmů a zatížení</h3>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">Celkový měsíční příjem:</span>
              <span className="font-semibold">{formatCurrency(results.totalMonthlyIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">Max. na splátky (DSTI 45 %):</span>
              <span className="font-semibold">{formatCurrency(Math.round(results.totalMonthlyIncome * 0.45))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">− Stávající dluhy:</span>
              <span className="font-semibold">{formatCurrency(existingDebts)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">− Rezerva na živobytí:</span>
              <span className="font-semibold">{formatCurrency(lifestyleBuffer)}</span>
            </div>
            <div className="divider my-1"></div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">K dispozici na hypotéku:</span>
              <span className="font-semibold text-primary">
                {formatCurrency(Math.round(results.availableMonthlyIncome))}
              </span>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
