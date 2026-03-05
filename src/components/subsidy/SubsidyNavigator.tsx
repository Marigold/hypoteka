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
} from '../../lib/housingContactPoints';

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

  return (
    <div className="space-y-8">
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
                onClick={() => {
                  // TODO: Show results in next subtask
                }}
                className="btn btn-primary"
              >
                Zobrazit výsledky
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
