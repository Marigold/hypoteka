/**
 * CNB mortgage regulation compliance evaluation (April 2026).
 *
 * Evaluates whether a mortgage application meets Czech National Bank's
 * regulatory requirements for loan-to-value (LTV) ratios, debt-to-income
 * (DTI) ratios, and other lending standards introduced in April 2026.
 *
 * All monetary values are in CZK, rates are annual percentages (e.g. 4.5 for 4.5%).
 */

/**
 * User's mortgage application profile.
 */
export interface UserProfile {
  /** Applicant's age in years */
  age: number;
  /** Monthly gross income in CZK */
  monthlyIncome: number;
  /** Property value in CZK */
  propertyValue: number;
  /** Loan amount requested in CZK */
  loanAmount: number;
  /** Type of property being purchased */
  propertyType: "primary-residence" | "investment";
  /** Is this the applicant's first property purchase */
  isFirstTimeBuyer: boolean;
  /** Monthly mortgage payment in CZK */
  monthlyPayment: number;
  /** Total monthly debt obligations (including this mortgage) in CZK */
  totalMonthlyDebt: number;
  /** Number of properties currently owned (excluding this purchase) */
  existingProperties: number;
}

/**
 * Compliance status for a regulation check.
 */
export type ComplianceStatus = "compliant" | "warning" | "non-compliant";

/**
 * Result of a single regulation check.
 */
export interface RegulationCheck {
  /** Unique identifier for this check */
  id: string;
  /** Display name in Czech */
  name: string;
  /** Detailed description of the regulation */
  description: string;
  /** Compliance status */
  status: ComplianceStatus;
  /** Current value (e.g., calculated LTV percentage) */
  currentValue: number;
  /** Maximum allowed value */
  maxAllowed: number;
  /** Unit of measurement (%, Kč, etc.) */
  unit: string;
  /** Explanation of the result */
  message: string;
  /** Reference to official CNB regulation */
  officialReference: string;
}

/**
 * Overall regulation compliance result.
 */
export interface RegulationResult {
  /** All regulation checks performed */
  checks: RegulationCheck[];
  /** Overall compliance status (worst status among all checks) */
  overallStatus: ComplianceStatus;
  /** Is the mortgage application likely to be approved */
  isLikelyApproved: boolean;
  /** Summary message for the user */
  summary: string;
  /** Recommendations to improve compliance */
  recommendations: string[];
}

/**
 * Calculate loan-to-value ratio as a percentage.
 */
function calculateLTV(loanAmount: number, propertyValue: number): number {
  if (propertyValue === 0) return 0;
  return (loanAmount / propertyValue) * 100;
}

/**
 * Calculate debt-to-income ratio as a percentage.
 */
function calculateDTI(totalMonthlyDebt: number, monthlyIncome: number): number {
  if (monthlyIncome === 0) return 0;
  return (totalMonthlyDebt / monthlyIncome) * 100;
}

/**
 * Calculate debt service-to-income ratio (DSTI) as a percentage.
 * This is the ratio of mortgage payment to gross income.
 */
function calculateDSTI(monthlyPayment: number, monthlyIncome: number): number {
  if (monthlyIncome === 0) return 0;
  return (monthlyPayment / monthlyIncome) * 100;
}

/**
 * Determine compliance status based on current and maximum allowed values.
 */
function getComplianceStatus(
  current: number,
  maxAllowed: number,
  warningThreshold: number,
): ComplianceStatus {
  if (current <= maxAllowed) return "compliant";
  if (current <= warningThreshold) return "warning";
  return "non-compliant";
}

/**
 * Get the worst status from an array of statuses.
 */
function getWorstStatus(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.includes("non-compliant")) return "non-compliant";
  if (statuses.includes("warning")) return "warning";
  return "compliant";
}

/**
 * Evaluate a mortgage application against April 2026 CNB regulations.
 *
 * @param profile - User's mortgage application profile
 * @returns Detailed regulation compliance result
 */
export function evaluateRegulationCompliance(
  profile: UserProfile,
): RegulationResult {
  const checks: RegulationCheck[] = [];

  // Check 1: LTV ratio for investment properties (70% cap)
  if (profile.propertyType === "investment") {
    const ltv = calculateLTV(profile.loanAmount, profile.propertyValue);
    const maxLTV = 70;
    const warningLTV = 75;

    checks.push({
      id: "investment-ltv",
      name: "LTV limit pro investiční nemovitosti",
      description:
        "Od dubna 2026 je LTV (poměr výše úvěru k hodnotě nemovitosti) pro investiční nemovitosti omezeno na 70 %.",
      status: getComplianceStatus(ltv, maxLTV, warningLTV),
      currentValue: Math.round(ltv * 10) / 10,
      maxAllowed: maxLTV,
      unit: "%",
      message:
        ltv <= maxLTV
          ? `Vaše LTV ${Math.round(ltv)}% splňuje limit 70 % pro investiční nemovitosti.`
          : `Vaše LTV ${Math.round(ltv)}% překračuje limit 70 % pro investiční nemovitosti. Musíte zvýšit vlastní kapitál.`,
      officialReference: "ČNB Doporučení k řízení rizik, duben 2026",
    });
  }

  // Check 2: LTV ratio for primary residence
  if (profile.propertyType === "primary-residence") {
    const ltv = calculateLTV(profile.loanAmount, profile.propertyValue);
    // Under-36 can get 90%, others 80%
    const maxLTV = profile.age < 36 ? 90 : 80;
    const warningLTV = maxLTV + 5;

    checks.push({
      id: "primary-ltv",
      name: "LTV limit pro primární bydlení",
      description:
        profile.age < 36
          ? "Pro kupující mladší 36 let je možné financování až 90 % hodnoty nemovitosti."
          : "Pro primární bydlení je standardní LTV limit 80 % (90 % pro kupující mladší 36 let).",
      status: getComplianceStatus(ltv, maxLTV, warningLTV),
      currentValue: Math.round(ltv * 10) / 10,
      maxAllowed: maxLTV,
      unit: "%",
      message:
        ltv <= maxLTV
          ? `Vaše LTV ${Math.round(ltv)}% splňuje limit ${maxLTV}% pro primární bydlení.`
          : `Vaše LTV ${Math.round(ltv)}% překračuje limit ${maxLTV}%. ${profile.age >= 36 ? "Pokud máte méně než 36 let, můžete získat až 90% LTV." : "Musíte zvýšit vlastní kapitál."}`,
      officialReference: "ČNB Doporučení k řízení rizik, duben 2026",
    });
  }

  // Check 3: DTI (Debt-to-Income) ratio - stricter for investment properties
  const dti = calculateDTI(profile.totalMonthlyDebt, profile.monthlyIncome);
  const maxDTI = profile.propertyType === "investment" ? 8 : 9;
  const warningDTI = maxDTI + 0.5;

  checks.push({
    id: "dti-ratio",
    name: "Poměr dluhu k příjmu (DTI)",
    description:
      profile.propertyType === "investment"
        ? "Pro investiční nemovitosti platí přísnější limit DTI (poměr celkového dluhu k ročnímu příjmu). Maximálně 8× roční příjem."
        : "DTI (poměr celkového dluhu k ročnímu příjmu) by neměl překročit 9× roční příjem.",
    status: getComplianceStatus(dti, maxDTI, warningDTI),
    currentValue: Math.round(dti * 10) / 10,
    maxAllowed: maxDTI,
    unit: "× roční příjem",
    message:
      dti <= maxDTI
        ? `Váš DTI ${Math.round(dti * 10) / 10}× splňuje limit ${maxDTI}×.`
        : `Váš DTI ${Math.round(dti * 10) / 10}× překračuje doporučený limit ${maxDTI}×. ${profile.propertyType === "investment" ? "Pro investiční nemovitosti jsou požadavky přísnější." : "Zvažte snížení výše úvěru nebo zvýšení příjmu."}`,
    officialReference: "ČNB Doporučení k řízení rizik, duben 2026",
  });

  // Check 4: DSTI (Debt Service-to-Income) ratio
  const dsti = calculateDSTI(profile.monthlyPayment, profile.monthlyIncome);
  const maxDSTI = profile.propertyType === "investment" ? 40 : 45;
  const warningDSTI = maxDSTI + 5;

  checks.push({
    id: "dsti-ratio",
    name: "Poměr splátky k příjmu (DSTI)",
    description:
      "DSTI (poměr měsíční splátky hypotéky k hrubému měsíčnímu příjmu) by neměl překročit doporučený limit. Pro investiční nemovitosti 40 %, pro primární bydlení 45 %.",
    status: getComplianceStatus(dsti, maxDSTI, warningDSTI),
    currentValue: Math.round(dsti * 10) / 10,
    maxAllowed: maxDSTI,
    unit: "%",
    message:
      dsti <= maxDSTI
        ? `Váš DSTI ${Math.round(dsti)}% splňuje doporučený limit ${maxDSTI}%.`
        : `Váš DSTI ${Math.round(dsti)}% překračuje doporučený limit ${maxDSTI}%. Splátka hypotéky je příliš vysoká vzhledem k vašemu příjmu.`,
    officialReference: "ČNB Doporučení k řízení rizik, duben 2026",
  });

  // Determine overall status
  const overallStatus = getWorstStatus(checks.map((c) => c.status));
  const isLikelyApproved = overallStatus !== "non-compliant";

  // Generate summary
  let summary: string;
  if (overallStatus === "compliant") {
    summary =
      "Vaše hypotéka splňuje všechny regulatorní limity ČNB. Měli byste být schopni získat schválení hypotéky.";
  } else if (overallStatus === "warning") {
    summary =
      "Vaše hypotéka je blízko regulatorních limitů ČNB. Schválení je možné, ale může záviset na dalších faktorech (bonita, historie).";
  } else {
    summary =
      "Vaše hypotéka překračuje regulatorní limity ČNB. Schválení je nepravděpodobné bez úprav (vyšší vlastní kapitál, vyšší příjem, nižší dluh).";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  const nonCompliantChecks = checks.filter(
    (c) => c.status === "non-compliant" || c.status === "warning",
  );

  for (const check of nonCompliantChecks) {
    if (check.id === "investment-ltv" || check.id === "primary-ltv") {
      recommendations.push(
        `Zvyšte vlastní kapitál (akontaci) pro snížení LTV pod ${check.maxAllowed}%.`,
      );
    }
    if (check.id === "dti-ratio") {
      recommendations.push(
        "Snižte celkový dluh nebo zvyšte příjem pro zlepšení DTI.",
      );
    }
    if (check.id === "dsti-ratio") {
      recommendations.push(
        "Snižte výši hypotéky nebo prodlužte dobu splatnosti pro nižší měsíční splátku.",
      );
      if (profile.propertyType === "investment") {
        recommendations.push(
          "U investiční nemovitosti zvažte, zda nepřejít na financování primárního bydlení (méně přísné limity).",
        );
      }
    }
  }

  if (recommendations.length === 0 && overallStatus === "compliant") {
    recommendations.push("Vaše hypotéka splňuje všechny požadavky. Můžete pokračovat v žádosti.");
  }

  return {
    checks,
    overallStatus,
    isLikelyApproved,
    summary,
    recommendations: Array.from(new Set(recommendations)), // Remove duplicates
  };
}
