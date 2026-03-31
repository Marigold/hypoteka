import { useState, useEffect, useMemo } from 'react';
import type {
  QuestionnaireAnswers,
  EligibilityResult,
} from '../../lib/subsidyEligibility';
import { evaluateEligibility } from '../../lib/subsidyEligibility';
import {
  getAllRegions,
  REGION_NAMES,
  type CzechRegion,
  getNearestContactPoint,
} from '../../lib/housingContactPoints';
import ResultCard from '../ui/ResultCard';

type IncomeBracket = QuestionnaireAnswers['incomeBracket'];
type FamilyStatus = QuestionnaireAnswers['familyStatus'];
type PropertyType = QuestionnaireAnswers['propertyType'];
type VulnerabilityFactor = QuestionnaireAnswers['vulnerabilityFactors'][number];

interface URLParams {
  vek?: number;
  prijem?: IncomeBracket;
  rodina?: FamilyStatus;
  typ?: PropertyType;
  kraj?: CzechRegion;
  druzstvo?: boolean;
  prvni?: boolean;
  zranitelnost?: VulnerabilityFactor[];
  krok?: number;
}

const URL_KEYS = {
  vek: 'vek',
  prijem: 'prijem',
  rodina: 'rodina',
  typ: 'typ',
  kraj: 'kraj',
  druzstvo: 'druzstvo',
  prvni: 'prvni',
  zranitelnost: 'zranitelnost',
  krok: 'krok',
};

function getParamsFromURL(): Partial<URLParams> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<URLParams> = {};

  const vek = sp.get(URL_KEYS.vek);
  if (vek) result.vek = Number(vek);

  const prijem = sp.get(URL_KEYS.prijem);
  if (prijem) result.prijem = prijem as IncomeBracket;

  const rodina = sp.get(URL_KEYS.rodina);
  if (rodina) result.rodina = rodina as FamilyStatus;

  const typ = sp.get(URL_KEYS.typ);
  if (typ) result.typ = typ as PropertyType;

  const kraj = sp.get(URL_KEYS.kraj);
  if (kraj) result.kraj = kraj as CzechRegion;

  const druzstvo = sp.get(URL_KEYS.druzstvo);
  if (druzstvo) result.druzstvo = druzstvo === 'true';

  const prvni = sp.get(URL_KEYS.prvni);
  if (prvni) result.prvni = prvni === 'true';

  const zranitelnost = sp.get(URL_KEYS.zranitelnost);
  if (zranitelnost) {
    result.zranitelnost = zranitelnost.split(',') as VulnerabilityFactor[];
  }

  const krok = sp.get(URL_KEYS.krok);
  if (krok) result.krok = Number(krok);

  return result;
}

function setParamsToURL(params: URLParams) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();

  if (params.vek !== undefined) sp.set(URL_KEYS.vek, String(params.vek));
  if (params.prijem) sp.set(URL_KEYS.prijem, params.prijem);
  if (params.rodina) sp.set(URL_KEYS.rodina, params.rodina);
  if (params.typ) sp.set(URL_KEYS.typ, params.typ);
  if (params.kraj) sp.set(URL_KEYS.kraj, params.kraj);
  if (params.druzstvo !== undefined)
    sp.set(URL_KEYS.druzstvo, String(params.druzstvo));
  if (params.prvni !== undefined) sp.set(URL_KEYS.prvni, String(params.prvni));
  if (params.zranitelnost && params.zranitelnost.length > 0) {
    sp.set(URL_KEYS.zranitelnost, params.zranitelnost.join(','));
  }
  sp.set(URL_KEYS.krok, String(params.krok ?? 1));

  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}

const DEFAULTS = {
  age: 30,
  incomeBracket: '40000-60000' as IncomeBracket,
  familyStatus: 'single' as FamilyStatus,
  propertyType: 'primary-residence' as PropertyType,
  region: 'praha' as CzechRegion,
  isCooperativeMember: false,
  isFirstTimeBuyer: true,
  vulnerabilityFactors: [] as VulnerabilityFactor[],
  currentStep: 1,
};

export default function SubsidyNavigator() {
  const urlParams = useMemo(() => getParamsFromURL(), []);

  const [age, setAge] = useState(urlParams.vek ?? DEFAULTS.age);
  const [incomeBracket, setIncomeBracket] = useState<IncomeBracket>(
    urlParams.prijem ?? DEFAULTS.incomeBracket,
  );
  const [familyStatus, setFamilyStatus] = useState<FamilyStatus>(
    urlParams.rodina ?? DEFAULTS.familyStatus,
  );
  const [propertyType, setPropertyType] = useState<PropertyType>(
    urlParams.typ ?? DEFAULTS.propertyType,
  );
  const [region, setRegion] = useState<CzechRegion>(
    urlParams.kraj ?? DEFAULTS.region,
  );
  const [isCooperativeMember, setIsCooperativeMember] = useState(
    urlParams.druzstvo ?? DEFAULTS.isCooperativeMember,
  );
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(
    urlParams.prvni ?? DEFAULTS.isFirstTimeBuyer,
  );
  const [vulnerabilityFactors, setVulnerabilityFactors] = useState<
    VulnerabilityFactor[]
  >(urlParams.zranitelnost ?? DEFAULTS.vulnerabilityFactors);

  const [currentStep, setCurrentStep] = useState(
    urlParams.krok ?? DEFAULTS.currentStep,
  );

  const [showResults, setShowResults] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);

  // Sync to URL
  useEffect(() => {
    setParamsToURL({
      vek: age,
      prijem: incomeBracket,
      rodina: familyStatus,
      typ: propertyType,
      kraj: region,
      druzstvo: isCooperativeMember,
      prvni: isFirstTimeBuyer,
      zranitelnost: vulnerabilityFactors,
      krok: currentStep,
    });
  }, [
    age,
    incomeBracket,
    familyStatus,
    propertyType,
    region,
    isCooperativeMember,
    isFirstTimeBuyer,
    vulnerabilityFactors,
    currentStep,
  ]);

  const handleVulnerabilityToggle = (factor: VulnerabilityFactor) => {
    if (vulnerabilityFactors.includes(factor)) {
      setVulnerabilityFactors(vulnerabilityFactors.filter((f) => f !== factor));
    } else {
      setVulnerabilityFactors([...vulnerabilityFactors, factor]);
    }
  };

  const totalSteps = 4;
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
    const answers: QuestionnaireAnswers = {
      age,
      incomeBracket,
      familyStatus,
      propertyType,
      region,
      isCooperativeMember,
      isFirstTimeBuyer,
      vulnerabilityFactors,
    };

    const result = evaluateEligibility(answers);
    setEligibilityResult(result);
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartOver = () => {
    setShowResults(false);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get contact point for the user's region
  const contactPoint = getNearestContactPoint(region);

  return (
    <div className="space-y-8">
      {!showResults && (
        <>
          {/* Progress indicator */}
          <div className="card bg-base-100 border border-base-200 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">Průvodce dotacemi a podporami</h2>
                <span className="text-sm text-base-content/60">
                  Krok {currentStep} z {totalSteps}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-base-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!showResults && (
        <>
          {/* Question cards */}
          <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Základní informace</h3>

              {/* Age */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">Kolik vám je let?</span>
                </label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="input input-bordered w-full"
                  placeholder="např. 30"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Některé programy mají věkové limity (např. výjimka LTV do 36 let)
                  </span>
                </label>
              </div>

              {/* Family Status */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">
                    Jaká je vaše rodinná situace?
                  </span>
                </label>
                <select
                  value={familyStatus}
                  onChange={(e) => setFamilyStatus(e.target.value as FamilyStatus)}
                  className="select select-bordered w-full"
                >
                  <option value="single">Sám/sama (single)</option>
                  <option value="couple">Pár bez dětí</option>
                  <option value="family-with-children">Rodina s dětmi</option>
                  <option value="single-parent">Samoživitel/ka</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Financial Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Finanční informace</h3>

              {/* Income Bracket */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">
                    Jaký je váš hrubý měsíční příjem?
                  </span>
                </label>
                <select
                  value={incomeBracket}
                  onChange={(e) => setIncomeBracket(e.target.value as IncomeBracket)}
                  className="select select-bordered w-full"
                >
                  <option value="0-25000">0 – 25 000 Kč</option>
                  <option value="25000-40000">25 000 – 40 000 Kč</option>
                  <option value="40000-60000">40 000 – 60 000 Kč</option>
                  <option value="60000-80000">60 000 – 80 000 Kč</option>
                  <option value="80000+">80 000 Kč a více</option>
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Některé programy jsou určeny pro nízkopříjmové domácnosti
                  </span>
                </label>
              </div>

              {/* Property Type */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">
                    Jaký typ nemovitosti plánujete či vlastníte?
                  </span>
                </label>
                <div className="space-y-2">
                  <label className="label cursor-pointer justify-start gap-3 p-4 border border-base-200 rounded-lg hover:bg-base-200/50 transition-colors">
                    <input
                      type="radio"
                      name="propertyType"
                      value="primary-residence"
                      checked={propertyType === 'primary-residence'}
                      onChange={(e) =>
                        setPropertyType(e.target.value as PropertyType)
                      }
                      className="radio radio-primary"
                    />
                    <div>
                      <span className="label-text font-medium">
                        Primární bydlení
                      </span>
                      <p className="text-sm text-base-content/60">
                        Nemovitost, kde budete/chcete bydlet
                      </p>
                    </div>
                  </label>

                  <label className="label cursor-pointer justify-start gap-3 p-4 border border-base-200 rounded-lg hover:bg-base-200/50 transition-colors">
                    <input
                      type="radio"
                      name="propertyType"
                      value="investment"
                      checked={propertyType === 'investment'}
                      onChange={(e) =>
                        setPropertyType(e.target.value as PropertyType)
                      }
                      className="radio radio-primary"
                    />
                    <div>
                      <span className="label-text font-medium">
                        Investiční nemovitost
                      </span>
                      <p className="text-sm text-base-content/60">
                        Nemovitost k pronájmu nebo investici
                      </p>
                    </div>
                  </label>

                  <label className="label cursor-pointer justify-start gap-3 p-4 border border-base-200 rounded-lg hover:bg-base-200/50 transition-colors">
                    <input
                      type="radio"
                      name="propertyType"
                      value="cooperative"
                      checked={propertyType === 'cooperative'}
                      onChange={(e) =>
                        setPropertyType(e.target.value as PropertyType)
                      }
                      className="radio radio-primary"
                    />
                    <div>
                      <span className="label-text font-medium">
                        Družstevní bydlení
                      </span>
                      <p className="text-sm text-base-content/60">
                        Členský podíl v bytovém družstvu
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Additional Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Doplňující informace</h3>

              {/* Region */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">V jakém kraji bydlíte?</span>
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as CzechRegion)}
                  className="select select-bordered w-full"
                >
                  {getAllRegions().map((r) => (
                    <option key={r} value={r}>
                      {REGION_NAMES[r]}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Najdeme vám nejbližší Kontaktní místo pro bydlení
                  </span>
                </label>
              </div>

              {/* Cooperative Member */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={isCooperativeMember}
                    onChange={(e) => setIsCooperativeMember(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <div>
                    <span className="label-text font-medium">
                      Jsem členem bytového družstva
                    </span>
                    <p className="text-sm text-base-content/60">
                      Opravňuje vás k daňovému odpočtu úroků (max. 150 000 Kč/rok)
                    </p>
                  </div>
                </label>
              </div>

              {/* First Time Buyer */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={isFirstTimeBuyer}
                    onChange={(e) => setIsFirstTimeBuyer(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <div>
                    <span className="label-text font-medium">
                      Kupuji svou první nemovitost
                    </span>
                    <p className="text-sm text-base-content/60">
                      V kombinaci s věkem do 36 let získáte výjimku LTV 90 %
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Vulnerability Factors */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Specifická situace</h3>
              <p className="text-base-content/70">
                Tyto informace pomáhají identifikovat programy pro zranitelné
                skupiny. Výběr je dobrovolný.
              </p>

              <div className="space-y-3">
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      checked={vulnerabilityFactors.includes('low-income')}
                      onChange={() => handleVulnerabilityToggle('low-income')}
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">
                      Nízkopříjmová domácnost (pod hranicí chudoby)
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      checked={vulnerabilityFactors.includes('disability')}
                      onChange={() => handleVulnerabilityToggle('disability')}
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">
                      Zdravotní postižení (ZTP/P)
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      checked={vulnerabilityFactors.includes('single-parent')}
                      onChange={() => handleVulnerabilityToggle('single-parent')}
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">
                      Samoživitel/ka s dětmi v tíživé situaci
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      checked={vulnerabilityFactors.includes('domestic-violence')}
                      onChange={() => handleVulnerabilityToggle('domestic-violence')}
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">Oběť domácího násilí</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      checked={vulnerabilityFactors.includes('homelessness-risk')}
                      onChange={() => handleVulnerabilityToggle('homelessness-risk')}
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">
                      Hrozí mi ztráta bydlení (exekuce, výpověď)
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      checked={vulnerabilityFactors.includes('foster-care-exit')}
                      onChange={() => handleVulnerabilityToggle('foster-care-exit')}
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">
                      Odcházím z ústavní nebo pěstounské péče
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6 border-t border-base-200">
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className="btn btn-outline"
            >
              ← Zpět
            </button>

            {canGoNext ? (
              <button onClick={handleNext} className="btn btn-primary">
                Další →
              </button>
            ) : (
              <button
                onClick={handleShowResults}
                className="btn btn-primary"
              >
                Zobrazit výsledky
              </button>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Results Display */}
      {showResults && eligibilityResult && (
        <>
          {/* Results Header */}
          <div className="card bg-gradient-to-br from-primary/5 via-base-100 to-secondary/5 border border-base-200 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-2">Vaše výsledky</h2>
              <p className="text-base-content/70">
                Na základě vašich odpovědí jsme identifikovali programy podpory, na které máte nárok.
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="stats stats-vertical lg:stats-horizontal shadow border border-base-200 w-full">
            <ResultCard
              label="Programy podpory"
              value={eligibilityResult.eligiblePrograms.length}
              description="Způsobilých programů"
              color="primary"
            />
            <ResultCard
              label="Odhadovaná výhoda"
              value={`${eligibilityResult.totalEstimatedBenefit.toLocaleString('cs-CZ')} Kč`}
              description="Ročně (orientačně)"
              color="success"
            />
            <ResultCard
              label="Kontaktní místo"
              value={contactPoint?.city || region}
              description={REGION_NAMES[region]}
              color="primary"
            />
          </div>

          {/* Eligible Programs */}
          {eligibilityResult.eligiblePrograms.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Programy, na které máte nárok</h3>

              {eligibilityResult.eligiblePrograms.map((program) => (
                <div
                  key={program.id}
                  className="card bg-base-100 border border-base-200 shadow-sm"
                >
                  <div className="card-body">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="w-6 h-6 text-accent"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>

                      <div className="flex-1">
                        <h4 className="text-lg font-semibold mb-2">{program.name}</h4>
                        <p className="text-base-content/70 mb-4">{program.description}</p>

                        {/* Estimated Benefit */}
                        {program.estimatedBenefit !== undefined && program.estimatedBenefit > 0 && (
                          <div className="alert alert-success mb-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                              />
                            </svg>
                            <span>
                              <strong>Odhadovaná výhoda:</strong> {program.estimatedBenefit.toLocaleString('cs-CZ')} Kč/rok
                            </span>
                          </div>
                        )}

                        {/* Application Steps */}
                        <div className="mb-4">
                          <h5 className="font-semibold mb-2">Jak požádat:</h5>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-base-content/70">
                            {program.applicationSteps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        {/* Required Documents */}
                        <div className="mb-4">
                          <h5 className="font-semibold mb-2">Potřebné dokumenty:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/70">
                            {program.requiredDocuments.map((doc, idx) => (
                              <li key={idx}>{doc}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Official Links */}
                        <div className="flex flex-wrap gap-2">
                          {program.officialLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline no-underline"
                            >
                              {link.title}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                                />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
              <span>
                Na základě vašich odpovědí jsme nenašli žádné programy, na které byste měli
                automatický nárok. Doporučujeme kontaktovat Kontaktní místo pro bydlení ve vašem
                regionu pro osobní konzultaci.
              </span>
            </div>
          )}

          {/* Contact Point Information */}
          {contactPoint && (
            <div className="card bg-base-100 border border-base-200 shadow-sm">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-6 h-6 text-primary"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">
                      Kontaktní místo pro bydlení – {contactPoint.city}
                    </h3>
                    <p className="text-base-content/70 mb-4">
                      Bezplatné právní a sociální poradenství v oblasti bydlení ve vašem regionu.
                    </p>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="w-5 h-5 text-base-content/50 shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                          />
                        </svg>
                        <div>
                          <strong>Adresa:</strong> {contactPoint.address}, {contactPoint.postalCode} {contactPoint.city}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="w-5 h-5 text-base-content/50 shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                          />
                        </svg>
                        <div>
                          <strong>Telefon:</strong> {contactPoint.phone}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="w-5 h-5 text-base-content/50 shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                          />
                        </svg>
                        <div>
                          <strong>Email:</strong> {contactPoint.email}
                        </div>
                      </div>

                      {contactPoint.openingHours && (
                        <div className="flex items-start gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="w-5 h-5 text-base-content/50 shrink-0"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div>
                            <strong>Otevírací doba:</strong> {contactPoint.openingHours}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="alert alert-info">
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
            <div className="text-sm">
              <p className="font-semibold">Důležité upozornění</p>
              <p>
                Tento průvodce poskytuje pouze orientační informace o možných programech podpory bydlení.
                Výsledky jsou založeny na zjednodušených kritériích a negarantují automatický nárok na dotaci či podporu.
                Skutečná způsobilost je vždy posuzována příslušným správcem programu.
                Pro ověření nároku, aktuální podmínky a pomoc s žádostí kontaktujte Kontaktní místo pro bydlení
                ve vašem regionu nebo navštivte oficiální webové stránky jednotlivých programů.
                Informace jsou aktuální k březnu 2026.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleStartOver} className="btn btn-outline">
              ← Vyplnit znovu
            </button>
            <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/clanky`} className="btn btn-primary no-underline">
              Zjistit více o dotacích
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
