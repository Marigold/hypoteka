import { useState, useEffect, useMemo } from 'react';
import Slider from '../ui/Slider';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '../../lib/formatters';

interface Params {
  loanAmount: number;
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
  const la = sp.get('castka');
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
  if (la) result.loanAmount = Number(la);
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
  sp.set('castka', String(params.loanAmount));
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

const DEFAULTS: Params = {
  loanAmount: 3_000_000,
  remainingYears: 25,
  holdingPeriod: 5,
  riskTolerance: 'moderate',
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

export default function FixationOptimizer() {
  const urlParams = useMemo(() => getParamsFromURL(), []);
  const [loanAmount, setLoanAmount] = useState(urlParams.loanAmount ?? DEFAULTS.loanAmount);
  const [remainingYears, setRemainingYears] = useState(
    urlParams.remainingYears ?? DEFAULTS.remainingYears,
  );
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

  // Sync to URL
  useEffect(() => {
    setParamsToURL({
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
    });
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
  ]);

  return (
    <div className="space-y-8">
      {/* Input Panel - Loan Parameters */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <h2 className="card-title">Parametry hypotéky</h2>

          <Slider
            label="Výše úvěru"
            value={loanAmount}
            min={500_000}
            max={15_000_000}
            step={100_000}
            onChange={setLoanAmount}
            formatValue={(v) => formatCurrencyCompact(v)}
            minLabel="500 tis. Kč"
            maxLabel="15 mil. Kč"
            showInput
            suffix="Kč"
          />

          <Slider
            label="Zbývající doba splatnosti"
            value={remainingYears}
            min={1}
            max={30}
            step={1}
            onChange={setRemainingYears}
            formatValue={(v) => `${v} let`}
            minLabel="1 rok"
            maxLabel="30 let"
            showInput
            suffix="let"
          />

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

      {/* Results Placeholder */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Doporučená fixace</h2>
          <p className="text-sm text-base-content/60">
            Výsledky optimalizace budou zobrazeny v další fázi implementace.
          </p>
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
