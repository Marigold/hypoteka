import { useState, useEffect, useMemo } from 'react';
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

/**
 * Generate timeline data showing regulatory changes before and after April 2026.
 * Shows a snapshot of regulatory limits across several months to visualize the transition.
 */
function getTimelineData(propertyType: PropertyType) {
  if (propertyType === 'investment') {
    // Investment property timeline - stricter limits after April 2026
    return [
      { period: 'Leden 2026', ltvLimit: 80, dstiLimit: 45 },
      { period: 'Únor 2026', ltvLimit: 80, dstiLimit: 45 },
      { period: 'Březen 2026', ltvLimit: 80, dstiLimit: 45 },
      { period: 'Duben 2026', ltvLimit: 70, dstiLimit: 40 }, // Regulation change
      { period: 'Květen 2026', ltvLimit: 70, dstiLimit: 40 },
      { period: 'Červen 2026', ltvLimit: 70, dstiLimit: 40 },
      { period: 'Červenec 2026', ltvLimit: 70, dstiLimit: 40 },
    ];
  } else {
    // Primary residence timeline - limits remain relatively stable
    return [
      { period: 'Leden 2026', ltvLimit: 80, dstiLimit: 45 },
      { period: 'Únor 2026', ltvLimit: 80, dstiLimit: 45 },
      { period: 'Březen 2026', ltvLimit: 80, dstiLimit: 45 },
      { period: 'Duben 2026', ltvLimit: 80, dstiLimit: 45 }, // Minimal change for primary residence
      { period: 'Květen 2026', ltvLimit: 80, dstiLimit: 45 },
      { period: 'Červen 2026', ltvLimit: 80, dstiLimit: 45 },
      { period: 'Červenec 2026', ltvLimit: 80, dstiLimit: 45 },
    ];
  }
}

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
    // Get LTV check for display
    const ltvCheck = regulationResult.checks.find(
      (c) => c.id === 'investment-ltv' || c.id === 'primary-ltv',
    );
    const dstiCheck = regulationResult.checks.find((c) => c.id === 'dsti-ratio');
    const dtiCheck = regulationResult.checks.find((c) => c.id === 'dti-ratio');

    return (
      <div className="space-y-6">
        {/* Header with Overall Status */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Výsledek kontroly</h2>
          <p className="text-lg text-base-content/70">
            Zkontrolovali jsme tvoji hypotéku proti pravidlům ČNB platným od dubna 2026.
          </p>
        </div>

        {/* Key Metrics Summary */}
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
          {ltvCheck && (
            <ResultCard
              label="LTV (Poměr úvěru k hodnotě)"
              value={`${ltvCheck.currentValue}%`}
              description={`Limit: ${ltvCheck.maxAllowed}%`}
              color={
                ltvCheck.status === 'compliant'
                  ? 'success'
                  : ltvCheck.status === 'warning'
                    ? 'warning'
                    : 'error'
              }
            />
          )}
          {dtiCheck && (
            <ResultCard
              label="DTI (Dluh k příjmu)"
              value={`${dtiCheck.currentValue}×`}
              description={`Limit: ${dtiCheck.maxAllowed}× roční příjem`}
              color={
                dtiCheck.status === 'compliant'
                  ? 'success'
                  : dtiCheck.status === 'warning'
                    ? 'warning'
                    : 'error'
              }
            />
          )}
          {dstiCheck && (
            <ResultCard
              label="DSTI (Splátka k příjmu)"
              value={`${dstiCheck.currentValue}%`}
              description={`Limit: ${dstiCheck.maxAllowed}%`}
              color={
                dstiCheck.status === 'compliant'
                  ? 'success'
                  : dstiCheck.status === 'warning'
                    ? 'warning'
                    : 'error'
              }
            />
          )}
        </div>

        {/* Overall Status Alert */}
        <div
          className={`alert ${
            regulationResult.overallStatus === 'compliant'
              ? 'alert-success'
              : regulationResult.overallStatus === 'warning'
                ? 'alert-warning'
                : 'alert-error'
          }`}
        >
          <span className="material-symbols-outlined">
            {regulationResult.overallStatus === 'compliant'
              ? 'check_circle'
              : regulationResult.overallStatus === 'warning'
                ? 'warning'
                : 'cancel'}
          </span>
          <div>
            <h4 className="font-bold">
              {regulationResult.overallStatus === 'compliant'
                ? 'Skvělé! Splňuješ všechny limity'
                : regulationResult.overallStatus === 'warning'
                  ? 'Pozor! Blížíš se k limitům'
                  : 'Bohužel, překračuješ limity'}
            </h4>
            <p className="text-sm">{regulationResult.summary}</p>
          </div>
        </div>

        {/* Individual Checks - Detailed View */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined">rule</span>
            Detailní kontrola limitů
          </h3>
          <p className="text-base-content/70">
            Každá hypotéka musí splňovat několik regulačních limitů. Tady vidíš, jak na tom jsi ty.
          </p>
          {regulationResult.checks.map((check) => (
            <div
              key={check.id}
              className={`card border-2 ${
                check.status === 'compliant'
                  ? 'bg-success/5 border-success/20'
                  : check.status === 'warning'
                    ? 'bg-warning/5 border-warning/20'
                    : 'bg-error/5 border-error/20'
              }`}
            >
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {check.status === 'compliant' && (
                      <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-success">check_circle</span>
                      </div>
                    )}
                    {check.status === 'warning' && (
                      <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-warning">warning</span>
                      </div>
                    )}
                    {check.status === 'non-compliant' && (
                      <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-error">cancel</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold mb-1">{check.name}</h4>
                    <p className="text-sm text-base-content/70 mb-3">{check.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="p-3 rounded-lg bg-base-100">
                        <div className="text-xs text-base-content/60 mb-1">Tvoje hodnota</div>
                        <div
                          className={`text-2xl font-bold ${
                            check.status === 'compliant'
                              ? 'text-success'
                              : check.status === 'warning'
                                ? 'text-warning'
                                : 'text-error'
                          }`}
                        >
                          {check.currentValue}
                          {check.unit}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-base-100">
                        <div className="text-xs text-base-content/60 mb-1">Maximální limit</div>
                        <div className="text-2xl font-bold">
                          {check.maxAllowed}
                          {check.unit}
                        </div>
                      </div>
                    </div>

                    <p className="text-base-content/90 mb-2">{check.message}</p>

                    <div className="text-xs text-base-content/50 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">description</span>
                      <span>{check.officialReference}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Before/After Comparison */}
        {regulationResult.beforeAfterComparison.length > 0 && (
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-2xl flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">history</span>
                Co se změnilo v dubnu 2026
              </h3>
              <p className="text-base-content/70 mb-4">
                ČNB přitvrdila pravidla pro hypotéky. Tady vidíš, jak se změnily limity
                oproti předchozímu stavu.
              </p>

              {/* Timeline Visualization */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">timeline</span>
                  Časová osa regulatorních změn
                </h4>
                <div className="bg-base-100 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={getTimelineData(propertyType)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12 }}
                        stroke="currentColor"
                        opacity={0.5}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="currentColor"
                        opacity={0.5}
                        label={{
                          value: 'Limit (%)',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fontSize: 12 },
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--b1))',
                          border: '1px solid hsl(var(--bc) / 0.2)',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                        }}
                        labelStyle={{ color: 'hsl(var(--bc))' }}
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          name === 'ltvLimit' ? 'LTV limit' :
                          name === 'dstiLimit' ? 'DSTI limit' : name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '0.875rem' }}
                        formatter={(value: string) =>
                          value === 'ltvLimit' ? 'LTV limit' :
                          value === 'dstiLimit' ? 'DSTI limit' : value
                        }
                      />
                      <ReferenceLine
                        x="Duben 2026"
                        stroke="hsl(var(--p))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{
                          value: 'Nové regulace v platnosti',
                          position: 'top',
                          fill: 'hsl(var(--p))',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ltvLimit"
                        stroke="hsl(var(--s))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--s))', r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="dstiLimit"
                        stroke="hsl(var(--a))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--a))', r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-xs text-base-content/60 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    <span>
                      Graf zobrazuje vývoj limitů LTV a DSTI{' '}
                      {propertyType === 'investment' ? 'pro investiční nemovitosti' : 'pro primární bydlení'}.
                      Duben 2026 je klíčový mezník, kdy vstoupily v platnost přísnější regulace ČNB.
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th className="bg-base-300">Kategorie</th>
                      <th className="bg-base-300">Před dubnem 2026</th>
                      <th className="bg-base-300">Po dubnu 2026</th>
                      <th className="bg-base-300">Dopad na tebe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regulationResult.beforeAfterComparison.map((comparison, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold">{comparison.category}</td>
                        <td className="text-base-content/60">{comparison.before}</td>
                        <td className="font-semibold text-primary">{comparison.after}</td>
                        <td className="text-sm">{comparison.impact}</td>
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
          <div className="card bg-info/10 border-2 border-info/20">
            <div className="card-body">
              <h3 className="card-title text-2xl flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-info">lightbulb</span>
                Co s tím?
              </h3>
              <p className="text-base-content/70 mb-4">
                {regulationResult.overallStatus !== 'compliant'
                  ? 'Tady jsou naše tipy, jak dostat hypotéku do souladu s pravidly ČNB:'
                  : 'Máš skvělé parametry! Tady jsou ještě pár tipů:'}
              </p>
              <ul className="space-y-3">
                {regulationResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-info shrink-0 mt-0.5">
                      arrow_right
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CNB Reference */}
        <div className="card bg-neutral text-neutral-content">
          <div className="card-body">
            <h4 className="card-title text-xl flex items-center gap-2">
              <span className="material-symbols-outlined">info</span>
              Oficiální zdroj
            </h4>
            <p>
              Všechna pravidla vycházejí z{' '}
              <a
                href="https://www.cnb.cz/cs/financni-stabilita/makroobezretnostni-politika/nastroje-makroobezretnostni-politiky/"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary font-semibold"
              >
                Doporučení ČNB k řízení rizik spojených s poskytováním retailových úvěrů
                zajištěných rezidenční nemovitostí
              </a>
              , která vstoupila v platnost v dubnu 2026.
            </p>
            <p className="text-sm opacity-80 mt-2">
              Tento průvodce slouží jako orientační nástroj. Finální rozhodnutí o poskytnutí
              hypotéky vždy závisí na konkrétní bance a tvé celkové finanční situaci.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={handleRestart} className="btn btn-primary flex-1">
            <span className="material-symbols-outlined">refresh</span>
            Zkusit jiný scénář
          </button>
          <a
            href="/kalkulacky/hypoteka"
            className="btn btn-outline flex-1"
          >
            <span className="material-symbols-outlined">calculate</span>
            Spočítat splátku
          </a>
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
                <span className="material-symbols-outlined">check</span>
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
              <span className="material-symbols-outlined">person</span>
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
                    <span className="material-symbols-outlined text-xs">info</span>
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
                    <span className="material-symbols-outlined text-xs">warning</span>
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
              <span className="material-symbols-outlined">home</span>
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
              <span className="material-symbols-outlined">account_balance_wallet</span>
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
                  <span className="material-symbols-outlined text-xs">info</span>
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
          <span className="material-symbols-outlined">arrow_back</span>
          Zpět
        </button>
        {canGoNext ? (
          <button onClick={handleNext} className="btn btn-primary">
            Další
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        ) : (
          <button onClick={handleShowResults} className="btn btn-primary">
            <span className="material-symbols-outlined">check</span>
            Zobrazit výsledek
          </button>
        )}
      </div>
    </div>
  );
}
