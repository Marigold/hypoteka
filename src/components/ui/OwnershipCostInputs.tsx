import { useCallback } from 'react';
import { useStore } from '@nanostores/react';
import Slider from './Slider';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import {
  type Region,
  $region,
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
  applyRegionDefaults,
} from '../../stores/ownershipCosts';

interface OwnershipCostInputsProps {
  /** Show transaction cost inputs (default: true) */
  showTransactionCosts?: boolean;
  /** Show energy costs (default: true) */
  showEnergy?: boolean;
  /** Show reconstruction inputs (default: true) */
  showReconstruction?: boolean;
}

export default function OwnershipCostInputs({
  showTransactionCosts = true,
  showEnergy = true,
  showReconstruction = true,
}: OwnershipCostInputsProps) {
  const region = useStore($region);
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

  const handleRegionChange = useCallback((newRegion: Region) => {
    applyRegionDefaults(newRegion);
  }, []);

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm">
      <div className="card-body space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="card-title">Náklady na vlastnictví</h2>

          {/* Region Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => handleRegionChange('prague')}
              className={`btn btn-sm ${region === 'prague' ? 'btn-primary' : 'btn-outline'}`}
            >
              Praha
            </button>
            <button
              onClick={() => handleRegionChange('regional')}
              className={`btn btn-sm ${region === 'regional' ? 'btn-primary' : 'btn-outline'}`}
            >
              Regionální
            </button>
          </div>
        </div>

        {/* Property */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Nemovitost</h3>
          <Slider
            label="Plocha bytu"
            value={propertyArea}
            min={20}
            max={200}
            step={5}
            onChange={(v) => $propertyArea.set(v)}
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
            onChange={(v) => $fondOpravPerSqmMonth.set(v)}
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
            onChange={(v) => $insuranceAnnual.set(v)}
            formatValue={(v) => formatCurrency(v)}
            minLabel="1 000 Kč"
            maxLabel="10 000 Kč"
            showInput
            suffix="Kč"
          />

          <Slider
            label="Daň z nemovitosti (roční)"
            value={propertyTax}
            min={500}
            max={10_000}
            step={500}
            onChange={(v) => $propertyTaxAnnual.set(v)}
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
            onChange={(v) => $maintenanceRate.set(v)}
            formatValue={(v) => formatPercent(v)}
            minLabel="0 %"
            maxLabel="3 %"
            showInput
            suffix="%"
          />

          {showEnergy && (
            <Slider
              label="Energie (měsíčně)"
              value={energy}
              min={1_000}
              max={10_000}
              step={500}
              onChange={(v) => $energyMonthly.set(v)}
              formatValue={(v) => formatCurrency(v)}
              minLabel="1 000 Kč"
              maxLabel="10 000 Kč"
              showInput
              suffix="Kč"
            />
          )}
        </div>

        {/* Reconstruction */}
        {showReconstruction && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rekonstrukce</h3>

            <Slider
              label="Četnost rekonstrukce"
              value={reconstructionInterval}
              min={5}
              max={30}
              step={1}
              onChange={(v) => $reconstructionIntervalYears.set(v)}
              formatValue={(v) => `každých ${v} let`}
              minLabel="5 let"
              maxLabel="30 let"
              showInput
              suffix="let"
            />

            <Slider
              label="Cena rekonstrukce (% z ceny nemovitosti)"
              value={reconstructionCost}
              min={1}
              max={30}
              step={1}
              onChange={(v) => $reconstructionCostPercent.set(v)}
              formatValue={(v) => formatPercent(v)}
              minLabel="1 %"
              maxLabel="30 %"
              showInput
              suffix="%"
            />
          </div>
        )}

        {/* Transaction Costs */}
        {showTransactionCosts && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transakční náklady (jednorázové)</h3>

            <Slider
              label="Notář a vklad do katastru"
              value={notary}
              min={0}
              max={50_000}
              step={1_000}
              onChange={(v) => $notary.set(v)}
              formatValue={(v) => formatCurrency(v)}
              minLabel="0 Kč"
              maxLabel="50 000 Kč"
              showInput
              suffix="Kč"
            />

            <Slider
              label="Odhad nemovitosti"
              value={valuationFee}
              min={0}
              max={20_000}
              step={1_000}
              onChange={(v) => $valuation.set(v)}
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
              onChange={(v) => $bankFee.set(v)}
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
              onChange={(v) => $agentCommission.set(v)}
              formatValue={(v) => formatCurrency(v)}
              minLabel="0 Kč"
              maxLabel="500 000 Kč"
              showInput
              suffix="Kč"
            />
          </div>
        )}
      </div>
    </div>
  );
}
