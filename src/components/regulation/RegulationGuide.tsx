import { useState, useEffect, useMemo } from 'react';
import type {
  UserProfile,
  RegulationResult,
} from '../../lib/regulationEligibility';
import { evaluateRegulationCompliance } from '../../lib/regulationEligibility';
import ResultCard from '../ui/ResultCard';

type PropertyType = UserProfile['propertyType'];

interface URLParams {
  vek?: number;
  prijem?: number;
  hodnotaNemovitosti?: number;
  vyseUveru?: number;
  typNemovitosti?: PropertyType;
  prvniKupujici?: boolean;
  mesicniSplatka?: number;
  celkovyDluh?: number;
  existujiciNemovitosti?: number;
  krok?: number;
}

const URL_KEYS = {
  vek: 'vek',
  prijem: 'prijem',
  hodnotaNemovitosti: 'hodnotaNemovitosti',
  vyseUveru: 'vyseUveru',
  typNemovitosti: 'typNemovitosti',
  prvniKupujici: 'prvniKupujici',
  mesicniSplatka: 'mesicniSplatka',
  celkovyDluh: 'celkovyDluh',
  existujiciNemovitosti: 'existujiciNemovitosti',
  krok: 'krok',
};

function getParamsFromURL(): Partial<URLParams> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<URLParams> = {};

  const vek = sp.get(URL_KEYS.vek);
  if (vek) result.vek = Number(vek);

  const prijem = sp.get(URL_KEYS.prijem);
  if (prijem) result.prijem = Number(prijem);

  const hodnotaNemovitosti = sp.get(URL_KEYS.hodnotaNemovitosti);
  if (hodnotaNemovitosti) result.hodnotaNemovitosti = Number(hodnotaNemovitosti);

  const vyseUveru = sp.get(URL_KEYS.vyseUveru);
  if (vyseUveru) result.vyseUveru = Number(vyseUveru);

  const typNemovitosti = sp.get(URL_KEYS.typNemovitosti);
  if (typNemovitosti) result.typNemovitosti = typNemovitosti as PropertyType;

  const prvniKupujici = sp.get(URL_KEYS.prvniKupujici);
  if (prvniKupujici) result.prvniKupujici = prvniKupujici === 'true';

  const mesicniSplatka = sp.get(URL_KEYS.mesicniSplatka);
  if (mesicniSplatka) result.mesicniSplatka = Number(mesicniSplatka);

  const celkovyDluh = sp.get(URL_KEYS.celkovyDluh);
  if (celkovyDluh) result.celkovyDluh = Number(celkovyDluh);

  const existujiciNemovitosti = sp.get(URL_KEYS.existujiciNemovitosti);
  if (existujiciNemovitosti) result.existujiciNemovitosti = Number(existujiciNemovitosti);

  const krok = sp.get(URL_KEYS.krok);
  if (krok) result.krok = Number(krok);

  return result;
}

function setParamsToURL(params: URLParams) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();

  if (params.vek !== undefined) sp.set(URL_KEYS.vek, String(params.vek));
  if (params.prijem !== undefined) sp.set(URL_KEYS.prijem, String(params.prijem));
  if (params.hodnotaNemovitosti !== undefined)
    sp.set(URL_KEYS.hodnotaNemovitosti, String(params.hodnotaNemovitosti));
  if (params.vyseUveru !== undefined)
    sp.set(URL_KEYS.vyseUveru, String(params.vyseUveru));
  if (params.typNemovitosti)
    sp.set(URL_KEYS.typNemovitosti, params.typNemovitosti);
  if (params.prvniKupujici !== undefined)
    sp.set(URL_KEYS.prvniKupujici, String(params.prvniKupujici));
  if (params.mesicniSplatka !== undefined)
    sp.set(URL_KEYS.mesicniSplatka, String(params.mesicniSplatka));
  if (params.celkovyDluh !== undefined)
    sp.set(URL_KEYS.celkovyDluh, String(params.celkovyDluh));
  if (params.existujiciNemovitosti !== undefined)
    sp.set(URL_KEYS.existujiciNemovitosti, String(params.existujiciNemovitosti));
  sp.set(URL_KEYS.krok, String(params.krok ?? 1));

  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

const DEFAULTS = {
  age: 30,
  monthlyIncome: 50000,
  propertyValue: 5000000,
  loanAmount: 4000000,
  propertyType: 'primary-residence' as PropertyType,
  isFirstTimeBuyer: true,
  monthlyPayment: 20000,
  totalMonthlyDebt: 20000,
  existingProperties: 0,
  currentStep: 1,
};

export default function RegulationGuide() {
  const urlParams = useMemo(() => getParamsFromURL(), []);

  const [age, setAge] = useState(urlParams.vek ?? DEFAULTS.age);
  const [monthlyIncome, setMonthlyIncome] = useState(
    urlParams.prijem ?? DEFAULTS.monthlyIncome,
  );
  const [propertyValue, setPropertyValue] = useState(
    urlParams.hodnotaNemovitosti ?? DEFAULTS.propertyValue,
  );
  const [loanAmount, setLoanAmount] = useState(
    urlParams.vyseUveru ?? DEFAULTS.loanAmount,
  );
  const [propertyType, setPropertyType] = useState<PropertyType>(
    urlParams.typNemovitosti ?? DEFAULTS.propertyType,
  );
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(
    urlParams.prvniKupujici ?? DEFAULTS.isFirstTimeBuyer,
  );
  const [monthlyPayment, setMonthlyPayment] = useState(
    urlParams.mesicniSplatka ?? DEFAULTS.monthlyPayment,
  );
  const [totalMonthlyDebt, setTotalMonthlyDebt] = useState(
    urlParams.celkovyDluh ?? DEFAULTS.totalMonthlyDebt,
  );
  const [existingProperties, setExistingProperties] = useState(
    urlParams.existujiciNemovitosti ?? DEFAULTS.existingProperties,
  );

  const [currentStep, setCurrentStep] = useState(
    urlParams.krok ?? DEFAULTS.currentStep,
  );

  const [showResults, setShowResults] = useState(false);
  const [regulationResult, setRegulationResult] = useState<RegulationResult | null>(null);

  // Sync to URL
  useEffect(() => {
    setParamsToURL({
      vek: age,
      prijem: monthlyIncome,
      hodnotaNemovitosti: propertyValue,
      vyseUveru: loanAmount,
      typNemovitosti: propertyType,
      prvniKupujici: isFirstTimeBuyer,
      mesicniSplatka: monthlyPayment,
      celkovyDluh: totalMonthlyDebt,
      existujiciNemovitosti: existingProperties,
      krok: currentStep,
    });
  }, [
    age,
    monthlyIncome,
    propertyValue,
    loanAmount,
    propertyType,
    isFirstTimeBuyer,
    monthlyPayment,
    totalMonthlyDebt,
    existingProperties,
    currentStep,
  ]);

  const totalSteps = 3;
  const canGoNext = currentStep < totalSteps;
  const canGoBack = currentStep > 1;

  const handleNext = () => {
    if (canGoNext) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleShowResults = () => {
    const profile: UserProfile = {
      age,
      monthlyIncome,
      propertyValue,
      loanAmount,
      propertyType,
      isFirstTimeBuyer,
      monthlyPayment,
      totalMonthlyDebt,
      existingProperties,
    };

    const result = evaluateRegulationCompliance(profile);
    setRegulationResult(result);
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestart = () => {
    setShowResults(false);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (showResults && regulationResult) {
    return (
      <div className="space-y-6">
        {/* Overall Status */}
        <ResultCard
          title="Výsledek kontroly"
          value={regulationResult.summary}
          variant={
            regulationResult.overallStatus === 'compliant'
              ? 'success'
              : regulationResult.overallStatus === 'warning'
                ? 'warning'
                : 'error'
          }
        />

        {/* Individual Checks */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Kontrola regulačních limitů</h3>
          {regulationResult.checks.map((check) => (
            <div
              key={check.id}
              className={`card ${
                check.status === 'compliant'
                  ? 'bg-success/10'
                  : check.status === 'warning'
                    ? 'bg-warning/10'
                    : 'bg-error/10'
              }`}
            >
              <div className="card-body">
                <h4 className="card-title text-lg flex items-center gap-2">
                  {check.status === 'compliant' && (
                    <span className="material-icons text-success">check_circle</span>
                  )}
                  {check.status === 'warning' && (
                    <span className="material-icons text-warning">warning</span>
                  )}
                  {check.status === 'non-compliant' && (
                    <span className="material-icons text-error">cancel</span>
                  )}
                  {check.name}
                </h4>
                <p className="text-sm text-base-content/70">{check.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="font-semibold">Tvoje hodnota: </span>
                    <span className={
                      check.status === 'compliant'
                        ? 'text-success'
                        : check.status === 'warning'
                          ? 'text-warning'
                          : 'text-error'
                    }>
                      {check.currentValue}{check.unit}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Limit: </span>
                    <span>{check.maxAllowed}{check.unit}</span>
                  </div>
                </div>
                <p className="mt-2">{check.message}</p>
                <p className="text-xs text-base-content/60 mt-2">
                  <span className="material-icons text-xs align-middle">description</span>{' '}
                  {check.officialReference}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Before/After Comparison */}
        {regulationResult.beforeAfterComparison.length > 0 && (
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-xl flex items-center gap-2">
                <span className="material-icons">history</span>
                Co se změnilo v dubnu 2026
              </h3>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Kategorie</th>
                      <th>Před dubnem 2026</th>
                      <th>Po dubnu 2026</th>
                      <th>Dopad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regulationResult.beforeAfterComparison.map((comparison, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold">{comparison.category}</td>
                        <td>{comparison.before}</td>
                        <td className="font-semibold">{comparison.after}</td>
                        <td>{comparison.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {regulationResult.recommendations.length > 0 && (
          <div className="card bg-info/10">
            <div className="card-body">
              <h3 className="card-title text-xl flex items-center gap-2">
                <span className="material-icons">lightbulb</span>
                Doporučení
              </h3>
              <ul className="list-disc list-inside space-y-2">
                {regulationResult.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CNB Reference */}
        <div className="alert alert-info">
          <span className="material-icons">info</span>
          <div>
            <h4 className="font-bold">Oficiální informace</h4>
            <p className="text-sm">
              Všechna pravidla vycházejí z{' '}
              <a
                href="https://www.cnb.cz/cs/financni-stabilita/makroobezretnostni-politika/nastroje-makroobezretnostni-politiky/"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                Doporučení ČNB k řízení rizik
              </a>
              {' '}platných od dubna 2026.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button onClick={handleRestart} className="btn btn-primary">
            <span className="material-icons">refresh</span>
            Zkusit jiný scénář
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`flex items-center gap-2 ${step < totalSteps ? 'flex-1' : ''}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step < currentStep
                  ? 'bg-success text-success-content'
                  : step === currentStep
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-300 text-base-content/50'
              }`}
            >
              {step < currentStep ? (
                <span className="material-icons">check</span>
              ) : (
                step
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`h-1 flex-1 ${
                  step < currentStep ? 'bg-success' : 'bg-base-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl flex items-center gap-2">
              <span className="material-icons">person</span>
              Základní informace
            </h2>
            <p className="text-base-content/70">
              Začneme pár základními informacemi o tobě a nemovitosti.
            </p>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Kolik ti je let?</span>
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="input input-bordered w-full"
                min={18}
                max={100}
              />
              {age < 36 && (
                <label className="label">
                  <span className="label-text-alt text-success flex items-center gap-1">
                    <span className="material-icons text-xs">info</span>
                    Skvělá zpráva! Mladí do 36 let mohou získat až 90% LTV na primární bydlení.
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Typ nemovitosti</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="propertyType"
                    className="radio radio-primary"
                    checked={propertyType === 'primary-residence'}
                    onChange={() => setPropertyType('primary-residence')}
                  />
                  <span className="label-text">Primární bydlení</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="propertyType"
                    className="radio radio-primary"
                    checked={propertyType === 'investment'}
                    onChange={() => setPropertyType('investment')}
                  />
                  <span className="label-text">Investice</span>
                </label>
              </div>
              {propertyType === 'investment' && (
                <label className="label">
                  <span className="label-text-alt text-warning flex items-center gap-1">
                    <span className="material-icons text-xs">warning</span>
                    Pro investiční nemovitosti platí přísnější pravidla (max 70% LTV).
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={isFirstTimeBuyer}
                  onChange={(e) => setIsFirstTimeBuyer(e.target.checked)}
                />
                <span className="label-text font-semibold">
                  Jsem prvokupující (kupuji první nemovitost)
                </span>
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">
                  Kolik nemovitostí už vlastníš?
                </span>
              </label>
              <input
                type="number"
                value={existingProperties}
                onChange={(e) => setExistingProperties(Number(e.target.value))}
                className="input input-bordered w-full"
                min={0}
                max={10}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Property & Loan Details */}
      {currentStep === 2 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl flex items-center gap-2">
              <span className="material-icons">home</span>
              Parametry hypotéky
            </h2>
            <p className="text-base-content/70">
              Zadej detaily o nemovitosti a požadované hypotéce.
            </p>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Hodnota nemovitosti</span>
              </label>
              <input
                type="number"
                value={propertyValue}
                onChange={(e) => setPropertyValue(Number(e.target.value))}
                className="input input-bordered w-full"
                step={100000}
                min={0}
              />
              <label className="label">
                <span className="label-text-alt">{formatCurrency(propertyValue)}</span>
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Výše úvěru</span>
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="input input-bordered w-full"
                step={100000}
                min={0}
                max={propertyValue}
              />
              <label className="label">
                <span className="label-text-alt">{formatCurrency(loanAmount)}</span>
              </label>
              <label className="label">
                <span className="label-text-alt">
                  LTV: {((loanAmount / propertyValue) * 100).toFixed(1)}%
                </span>
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">
                  Měsíční splátka hypotéky (odhad)
                </span>
              </label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(Number(e.target.value))}
                className="input input-bordered w-full"
                step={1000}
                min={0}
              />
              <label className="label">
                <span className="label-text-alt">{formatCurrency(monthlyPayment)}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Income & Debt */}
      {currentStep === 3 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl flex items-center gap-2">
              <span className="material-icons">account_balance_wallet</span>
              Příjem a závazky
            </h2>
            <p className="text-base-content/70">
              Poslední krok – zadej své příjmy a celkové měsíční závazky.
            </p>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Hrubý měsíční příjem</span>
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="input input-bordered w-full"
                step={5000}
                min={0}
              />
              <label className="label">
                <span className="label-text-alt">{formatCurrency(monthlyIncome)}</span>
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">
                  Celkové měsíční dluhy (včetně této hypotéky)
                </span>
                <span className="label-text-alt">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setTotalMonthlyDebt(monthlyPayment)}
                  >
                    Použít jen hypotéku
                  </button>
                </span>
              </label>
              <input
                type="number"
                value={totalMonthlyDebt}
                onChange={(e) => setTotalMonthlyDebt(Number(e.target.value))}
                className="input input-bordered w-full"
                step={1000}
                min={0}
              />
              <label className="label">
                <span className="label-text-alt">{formatCurrency(totalMonthlyDebt)}</span>
              </label>
              <label className="label">
                <span className="label-text-alt text-info flex items-center gap-1">
                  <span className="material-icons text-xs">info</span>
                  Zahrň všechny půjčky, leasingy, jiné hypotéky a kreditní karty.
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 justify-between">
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          className="btn btn-outline"
        >
          <span className="material-icons">arrow_back</span>
          Zpět
        </button>
        {canGoNext ? (
          <button onClick={handleNext} className="btn btn-primary">
            Další
            <span className="material-icons">arrow_forward</span>
          </button>
        ) : (
          <button onClick={handleShowResults} className="btn btn-primary">
            <span className="material-icons">check</span>
            Zobrazit výsledek
          </button>
        )}
      </div>
    </div>
  );
}
