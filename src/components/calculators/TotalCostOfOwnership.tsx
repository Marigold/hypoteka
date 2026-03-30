import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import SharedMortgageInputs from '../ui/SharedMortgageInputs';
import OwnershipCostInputs from '../ui/OwnershipCostInputs';
import ResultCard from '../ui/ResultCard';
import {
  calculateTotalCostOfOwnership,
  type TCOParams,
} from '../../lib/totalCostOfOwnership';
import {
  formatCurrency,
  formatCurrencyCompact,
} from '../../lib/formatters';
import { $propertyPrice, $downPaymentPercent, $mortgageRate, $mortgageYears } from '../../stores/mortgage';
import {
  $propertyArea,
  $fondOpravPerSqmMonth,
  $insuranceAnnual,
  $propertyTaxAnnual,
  $maintenanceRate,
  $energyMonthly,
  $reconstructionIntervalYears,
  $reconstructionCostPercent,
  $notary,
  $valuation,
  $bankFee,
  $agentCommission,
} from '../../stores/ownershipCosts';

export default function TotalCostOfOwnership() {
  const propertyPrice = useStore($propertyPrice);
  const downPaymentPercent = useStore($downPaymentPercent);
  const mortgageRate = useStore($mortgageRate);
  const mortgageYears = useStore($mortgageYears);

  const propertyArea = useStore($propertyArea);
  const fondOprav = useStore($fondOpravPerSqmMonth);
  const insurance = useStore($insuranceAnnual);
  const propertyTax = useStore($propertyTaxAnnual);
  const maintenanceRate = useStore($maintenanceRate);
  const energy = useStore($energyMonthly);
  const reconstructionInterval = useStore($reconstructionIntervalYears);
  const reconstructionCost = useStore($reconstructionCostPercent);
  const notary = useStore($notary);
  const valuationFee = useStore($valuation);
  const bankFee = useStore($bankFee);
  const agentCommission = useStore($agentCommission);

  const downPayment = Math.round(propertyPrice * (downPaymentPercent / 100));

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
      propertyTaxAnnual: propertyTax,
      maintenanceReserveRate: maintenanceRate,
      energyCostsMonthly: energy,
      transactionCosts: {
        notary,
        valuation: valuationFee,
        bankFee,
        agentCommission,
      },
      inflationRate: 3.0,
      reconstructionIntervalYears: reconstructionInterval,
      reconstructionCostPercent: reconstructionCost,
    };
    return calculateTotalCostOfOwnership(params);
  }, [
    propertyPrice, downPayment, mortgageRate, mortgageYears,
    propertyArea, fondOprav, insurance, propertyTax,
    maintenanceRate, energy, reconstructionInterval, reconstructionCost,
    notary, valuationFee, bankFee, agentCommission,
  ]);

  // Chart data for cost breakdown visualization
  const chartData = useMemo(() => {
    return [
      {
        name: 'Hypotéka',
        value: Math.round(tcoResult.costBreakdown.mortgagePayment),
        color: '#3b82f6',
      },
      {
        name: 'Fond oprav',
        value: Math.round(tcoResult.costBreakdown.mandatoryCosts.fondOprav),
        color: '#8b5cf6',
      },
      {
        name: 'Pojištění',
        value: Math.round(tcoResult.costBreakdown.mandatoryCosts.insurance),
        color: '#ec4899',
      },
      {
        name: 'Daň',
        value: Math.round(tcoResult.costBreakdown.mandatoryCosts.tax),
        color: '#f97316',
      },
      {
        name: 'Údržba',
        value: Math.round(tcoResult.costBreakdown.variableCosts.maintenance),
        color: '#eab308',
      },
      {
        name: 'Energie',
        value: Math.round(tcoResult.costBreakdown.variableCosts.energy),
        color: '#14b8a6',
      },
    ];
  }, [tcoResult]);

  const tooltipFormatter = useCallback(
    (value: number | undefined) => formatCurrency(Math.round(value ?? 0)),
    [],
  );

  return (
    <div className="space-y-8">
      <SharedMortgageInputs yearsMax={40} />
      <OwnershipCostInputs />

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

            {tcoResult.lifetimeCosts.totalReconstructionCosts > 0 && (
              <div className="p-4 bg-base-200 rounded-lg">
                <h4 className="font-semibold mb-1">Rekonstrukce za {mortgageYears} let:</h4>
                <p className="text-sm">
                  Celkem: <span className="font-semibold">{formatCurrency(tcoResult.lifetimeCosts.totalReconstructionCosts)}</span>
                  {' '}({Math.floor(mortgageYears / reconstructionInterval)}× rekonstrukce)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
