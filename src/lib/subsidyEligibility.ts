/**
 * Government subsidy and support program eligibility evaluation.
 *
 * Evaluates eligibility for 2026 Czech housing support programs based on
 * user's age, income, family status, property type, and other factors.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%).
 */

/**
 * User's answers to the eligibility questionnaire.
 */
export interface QuestionnaireAnswers {
  /** User's age in years */
  age: number;
  /** Monthly gross income bracket in CZK */
  incomeBracket: "0-25000" | "25000-40000" | "40000-60000" | "60000-80000" | "80000+";
  /** Family composition */
  familyStatus: "single" | "couple" | "family-with-children" | "single-parent";
  /** Type of property being purchased or owned */
  propertyType: "primary-residence" | "investment" | "cooperative";
  /** User's region/city for contact point matching */
  region: string;
  /** Is the user a member of a housing cooperative (družstvo) */
  isCooperativeMember: boolean;
  /** Is this the user's first property purchase */
  isFirstTimeBuyer: boolean;
  /** Vulnerability factors that may qualify for special programs */
  vulnerabilityFactors: Array<
    "low-income" | "disability" | "single-parent" | "domestic-violence" | "homelessness-risk" | "foster-care-exit"
  >;
}

/**
 * A government housing support program.
 */
export interface Program {
  /** Unique program identifier */
  id: string;
  /** Display name in Czech */
  name: string;
  /** Detailed description of the program */
  description: string;
  /** Estimated annual or one-time benefit in CZK (if calculable) */
  estimatedBenefit?: number;
  /** Type of benefit (tax deduction, loan, grant, service) */
  benefitType: "tax-deduction" | "low-interest-loan" | "grant" | "ltv-exception" | "free-service";
  /** Steps the user should take to apply */
  applicationSteps: string[];
  /** Required documents for application */
  requiredDocuments: string[];
  /** Official resource links */
  officialLinks: Array<{
    title: string;
    url: string;
  }>;
  /** Why the user is NOT eligible (if applicable) */
  notEligibleReason?: string;
}

/**
 * Result of eligibility evaluation.
 */
export interface EligibilityResult {
  /** Programs the user is eligible for */
  eligiblePrograms: Program[];
  /** Programs the user is NOT eligible for with explanations */
  ineligiblePrograms: Program[];
  /** Total estimated annual benefit across all eligible programs in CZK */
  totalEstimatedBenefit: number;
}

/**
 * All available housing support programs with their base definitions.
 */
const ALL_PROGRAMS: Omit<Program, "estimatedBenefit" | "notEligibleReason">[] = [
  {
    id: "under-36-ltv",
    name: "Výjimka LTV pro mladé do 36 let",
    description:
      "Možnost financování až 90 % hodnoty nemovitosti pro kupující mladší 36 let (standardně max. 80 % pro druhou a další nemovitost).",
    benefitType: "ltv-exception",
    applicationSteps: [
      "Ověřte si u své banky, že nabízí program pro mladé do 36 let",
      "Připravte dokumenty k hypotéce (příjmy, kupní smlouva, odhad nemovitosti)",
      "Požádejte o hypotéku s LTV až 90 %",
      "Banka ověří váš věk a podmínky pro výjimku",
    ],
    requiredDocuments: [
      "Doklad totožnosti (ověření věku)",
      "Potvrzení o příjmech (minimálně 12 měsíců)",
      "Kupní smlouva nebo rezervační smlouva",
      "Znalecký posudek nemovitosti",
    ],
    officialLinks: [
      {
        title: "ČNB - Doporučení k řízení rizik",
        url: "https://www.cnb.cz/cs/dohled-financni-trh/",
      },
      {
        title: "Ministerstvo financí - Hypoteční úvěry",
        url: "https://www.mfcr.cz/",
      },
    ],
  },
  {
    id: "cooperative-tax-deduction",
    name: "Daňové odpočty úroků z úvěrů na družstevní bydlení",
    description:
      "Členové bytových družstev mohou od základu daně odečíst úroky z úvěru na družstevní bydlení, maximálně 150 000 Kč ročně. Platí od roku 2026.",
    benefitType: "tax-deduction",
    applicationSteps: [
      "Ověřte si, že váš úvěr byl použit na družstevní bydlení",
      "Sledujte zaplacené úroky během roku (výpis z banky)",
      "Při podání daňového přiznání uplatněte odpočet úroků (limit 150 000 Kč/rok)",
      "Přiložte potvrzení z banky o výši zaplacených úroků",
    ],
    requiredDocuments: [
      "Smlouva o úvěru na družstevní bydlení",
      "Potvrzení z banky o zaplacených úrocích za daný rok",
      "Členství v bytovém družstvu (potvrzení)",
      "Daňové přiznání (formulář)",
    ],
    officialLinks: [
      {
        title: "Finanční správa - Daňové odpočty",
        url: "https://www.financnisprava.cz/",
      },
      {
        title: "Ministerstvo financí - Novely zákonů 2026",
        url: "https://www.mfcr.cz/",
      },
    ],
  },
  {
    id: "affordable-rental-program",
    name: "Program dostupného nájemního bydlení",
    description:
      "Výhodné financování pro obce a družstva na výstavbu dostupného nájemního bydlení. Rozpočet 2,25 mld. Kč, pokrytí až 80 % nákladů, úrok 1–2 %. Určeno pro stavitele, ne koncové nájemce.",
    benefitType: "low-interest-loan",
    applicationSteps: [
      "Ověřte, zda jste obec, družstvo nebo nezisková organizace",
      "Připravte projekt výstavby dostupného bydlení",
      "Podejte žádost na Ministerstvo pro místní rozvoj (MMR)",
      "Po schválení uzavřete smlouvu o nízkourokové půjčce",
    ],
    requiredDocuments: [
      "Projektová dokumentace stavby",
      "Rozpočet stavby a finanční plán",
      "Doklad o vlastnictví pozemku nebo stavební právo",
      "Statut organizace (obec, družstvo, nezisková org.)",
    ],
    officialLinks: [
      {
        title: "MMR - Program dostupného bydlení",
        url: "https://www.mmr.cz/",
      },
      {
        title: "Státní fond podpory investic",
        url: "https://www.sfpi.cz/",
      },
    ],
  },
  {
    id: "superdavka-housing",
    name: "Příspěvek na bydlení v rámci tzv. superdávky",
    description:
      "Finanční podpora na náklady bydlení (nájem, energie) pro nízkopříjmové domácnosti v rámci jednotné sociální dávky ('superdávky').",
    benefitType: "grant",
    applicationSteps: [
      "Zjistěte, zda splňujete příjmové limity pro dávku",
      "Připravte doklady o příjmech a nákladech na bydlení",
      "Podejte žádost na Úřadu práce ČR (online nebo osobně)",
      "Úřad práce posoudí žádost a stanoví výši dávky",
    ],
    requiredDocuments: [
      "Doklady o příjmech všech členů domácnosti",
      "Nájemní smlouva nebo doklad o vlastnictví",
      "Potvrzení o výši nájemného a záloh na energie",
      "Doklad totožnosti a rodný list dětí (pokud jsou v domácnosti)",
    ],
    officialLinks: [
      {
        title: "MPSV - Příspěvek na bydlení",
        url: "https://www.mpsv.cz/",
      },
      {
        title: "Úřad práce ČR - Dávky",
        url: "https://www.uradprace.cz/",
      },
    ],
  },
  {
    id: "guaranteed-housing",
    name: "Program Garantované bydlení pro zranitelné skupiny",
    description:
      "Program pomoci se zajištěním bydlení pro osoby bez přístřeší, oběti domácího násilí, mladé dospělé opouštějící ústavní péči a další zranitelné skupiny.",
    benefitType: "free-service",
    applicationSteps: [
      "Ověřte, zda patříte do zranitelné skupiny",
      "Kontaktujte Kontaktní místo pro bydlení ve vašem regionu",
      "Absolvujte pohovor s pracovníkem kontaktního místa",
      "Pracovník vám pomůže najít vhodné řešení bydlení",
    ],
    requiredDocuments: [
      "Doklad totožnosti",
      "Potvrzení o příjmech (pokud nějaké máte)",
      "Doklad o zranitelném statusu (např. potvrzení od sociálního pracovníka)",
    ],
    officialLinks: [
      {
        title: "MPSV - Garantované bydlení",
        url: "https://www.mpsv.cz/",
      },
      {
        title: "MMR - Podpora bydlení",
        url: "https://www.mmr.cz/",
      },
    ],
  },
  {
    id: "housing-contact-points",
    name: "Kontaktní místa pro bydlení – bezplatné poradenství",
    description:
      "Síť 115 Kontaktních míst pro bydlení po celé ČR nabízející bezplatné právní a sociální poradenství v oblasti bydlení.",
    benefitType: "free-service",
    applicationSteps: [
      "Najděte si nejbližší Kontaktní místo pro bydlení ve vašem regionu",
      "Objednejte si schůzku (online, telefonicky nebo osobně)",
      "Připravte si otázky a dokumenty k vaší situaci",
      "Absolvujte konzultaci s odborníkem zdarma",
    ],
    requiredDocuments: [
      "Žádné povinné dokumenty předem",
      "Doporučujeme vzít si veškeré smlouvy a doklady týkající se vašeho bydlení",
    ],
    officialLinks: [
      {
        title: "MPSV - Kontaktní místa pro bydlení",
        url: "https://www.mpsv.cz/",
      },
      {
        title: "Platforma pro sociální bydlení",
        url: "https://www.socialnibydleni.org/",
      },
    ],
  },
];

/**
 * Evaluate user's eligibility for all housing support programs.
 *
 * @param answers - User's questionnaire responses
 * @returns Eligibility result with eligible and ineligible programs
 */
export function evaluateEligibility(
  answers: QuestionnaireAnswers,
): EligibilityResult {
  const eligiblePrograms: Program[] = [];
  const ineligiblePrograms: Program[] = [];

  for (const baseProgram of ALL_PROGRAMS) {
    const evaluation = evaluateProgramEligibility(baseProgram, answers);

    if (evaluation.isEligible) {
      eligiblePrograms.push({
        ...baseProgram,
        estimatedBenefit: evaluation.estimatedBenefit,
      });
    } else {
      ineligiblePrograms.push({
        ...baseProgram,
        notEligibleReason: evaluation.reason,
      });
    }
  }

  // Calculate total estimated benefit
  const totalEstimatedBenefit = eligiblePrograms.reduce(
    (sum, program) => sum + (program.estimatedBenefit || 0),
    0,
  );

  return {
    eligiblePrograms,
    ineligiblePrograms,
    totalEstimatedBenefit,
  };
}

/**
 * Internal helper to evaluate eligibility for a single program.
 */
function evaluateProgramEligibility(
  program: Omit<Program, "estimatedBenefit" | "notEligibleReason">,
  answers: QuestionnaireAnswers,
): { isEligible: boolean; estimatedBenefit?: number; reason?: string } {
  switch (program.id) {
    case "under-36-ltv":
      return evaluateUnder36LTV(answers);

    case "cooperative-tax-deduction":
      return evaluateCooperativeTaxDeduction(answers);

    case "affordable-rental-program":
      return evaluateAffordableRentalProgram(answers);

    case "superdavka-housing":
      return evaluateSuperdavkaHousing(answers);

    case "guaranteed-housing":
      return evaluateGuaranteedHousing(answers);

    case "housing-contact-points":
      return evaluateHousingContactPoints(answers);

    default:
      return { isEligible: false, reason: "Neznámý program" };
  }
}

/**
 * Under-36 LTV Exception: 90% financing for buyers under 36.
 */
function evaluateUnder36LTV(
  answers: QuestionnaireAnswers,
): { isEligible: boolean; estimatedBenefit?: number; reason?: string } {
  if (answers.age >= 36) {
    return {
      isEligible: false,
      reason: "Pro tuto výjimku musíte být mladší 36 let.",
    };
  }

  if (answers.propertyType === "investment") {
    return {
      isEligible: false,
      reason:
        "Výjimka LTV 90 % platí pouze pro primární bydlení, ne pro investiční nemovitosti.",
    };
  }

  // Benefit: ability to borrow 10% more (reduced down payment requirement)
  // Estimated benefit is hard to quantify without property price, but we can note it's available
  return {
    isEligible: true,
    estimatedBenefit: 0, // Benefit is lower down payment, not direct CZK amount
  };
}

/**
 * Cooperative Housing Tax Deduction: Deduct interest on cooperative housing loans (cap 150k CZK/yr).
 */
function evaluateCooperativeTaxDeduction(
  answers: QuestionnaireAnswers,
): { isEligible: boolean; estimatedBenefit?: number; reason?: string } {
  if (!answers.isCooperativeMember) {
    return {
      isEligible: false,
      reason: "Musíte být členem bytového družstva.",
    };
  }

  if (answers.propertyType !== "cooperative") {
    return {
      isEligible: false,
      reason: "Tato daňová úleva se vztahuje pouze na družstevní bydlení.",
    };
  }

  // Estimated benefit: Assume average interest payment of 100k CZK/year, tax rate 15%
  // Real benefit = interest * 0.15, capped at 150k * 0.15 = 22,500 CZK/year
  const estimatedAnnualInterest = 100_000;
  const taxRate = 0.15;
  const estimatedBenefit = Math.min(estimatedAnnualInterest, 150_000) * taxRate;

  return {
    isEligible: true,
    estimatedBenefit: Math.round(estimatedBenefit),
  };
}

/**
 * Affordable Rental Housing Program: Low-interest loans for municipalities/cooperatives.
 * This is for developers, not individual renters.
 */
function evaluateAffordableRentalProgram(
  answers: QuestionnaireAnswers,
): { isEligible: boolean; estimatedBenefit?: number; reason?: string } {
  // This program is for municipalities, cooperatives, and non-profits building housing
  // Not for individual end-user renters
  // We'll assume most individual users are not eligible unless they indicate cooperative
  // involvement in a developer capacity (which we don't capture in current questionnaire)

  if (answers.propertyType === "cooperative" && answers.isCooperativeMember) {
    return {
      isEligible: true,
      estimatedBenefit: 0, // Benefit depends on construction project size, not calculable here
    };
  }

  return {
    isEligible: false,
    reason:
      "Tento program je určen pro obce, družstva a neziskové organizace stavějící dostupné bydlení, ne pro jednotlivé nájemce.",
  };
}

/**
 * Superdavka Housing Component: Housing allowance for low-income households.
 */
function evaluateSuperdavkaHousing(
  answers: QuestionnaireAnswers,
): { isEligible: boolean; estimatedBenefit?: number; reason?: string } {
  const isLowIncome =
    answers.incomeBracket === "0-25000" ||
    answers.incomeBracket === "25000-40000" ||
    answers.vulnerabilityFactors.includes("low-income");

  if (!isLowIncome) {
    return {
      isEligible: false,
      reason:
        "Příspěvek na bydlení je určen pro nízkopříjmové domácnosti. Váš příjem překračuje limit.",
    };
  }

  // Estimated benefit: depends on rent and income, typically 3,000-10,000 CZK/month
  // We'll estimate 5,000 CZK/month = 60,000 CZK/year as average
  const estimatedMonthlyBenefit = 5_000;
  const estimatedAnnualBenefit = estimatedMonthlyBenefit * 12;

  return {
    isEligible: true,
    estimatedBenefit: estimatedAnnualBenefit,
  };
}

/**
 * Guaranteed Housing: Support for vulnerable groups (homeless, DV victims, foster care exits).
 */
function evaluateGuaranteedHousing(
  answers: QuestionnaireAnswers,
): { isEligible: boolean; estimatedBenefit?: number; reason?: string } {
  const vulnerableFactors = [
    "homelessness-risk",
    "domestic-violence",
    "foster-care-exit",
  ];

  const hasVulnerableFactor = answers.vulnerabilityFactors.some((factor) =>
    vulnerableFactors.includes(factor),
  );

  if (!hasVulnerableFactor) {
    return {
      isEligible: false,
      reason:
        "Program Garantované bydlení je určen pro osoby bez přístřeší, oběti domácího násilí, mladé dospělé z ústavní péče a další specifické zranitelné skupiny.",
    };
  }

  return {
    isEligible: true,
    estimatedBenefit: 0, // Provides housing assistance service, not direct CZK benefit
  };
}

/**
 * Housing Contact Points: Free legal and social counseling (always eligible).
 */
function evaluateHousingContactPoints(
  answers: QuestionnaireAnswers,
): { isEligible: boolean; estimatedBenefit?: number; reason?: string } {
  // This service is available to everyone
  return {
    isEligible: true,
    estimatedBenefit: 0, // Free service, not a monetary benefit
  };
}
