import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '../../lib/formatters';
import {
  CONSTRUCTION_KEY_STATS,
  CONSTRUCTION_PRODUCTION_INDEX_DATA,
  CONSTRUCTION_YEARLY_DATA,
} from '../../lib/constructionPipelineData';

const PIPELINE_DATA = CONSTRUCTION_YEARLY_DATA.filter((item) => item.year >= 2005);
const YOY_DATA = CONSTRUCTION_YEARLY_DATA.filter((item) => item.year >= 2006);
const INDEX_DATA = CONSTRUCTION_YEARLY_DATA.filter((item) => item.year >= 2005);
const PRODUCTION_INDEX_DATA = CONSTRUCTION_PRODUCTION_INDEX_DATA;

const SERIES_LABELS: Record<string, string> = {
  permits: 'Povolení (bytové budovy, nová výstavba)',
  completed: 'Dokončené byty',
  permits_yoy: 'Povolení – meziročně',
  completed_yoy: 'Dokončené byty – meziročně',
  permits_idx_2019: 'Povolení (2019 = 100)',
  completed_idx_2019: 'Dokončené byty (2019 = 100)',
  index_total: 'Stavební práce celkem',
  index_buildings: 'Pozemní stavitelství',
  index_engineering: 'Inženýrské stavitelství',
};

function tooltipNumberFormatter(value: number | string | null | undefined, name: string) {
  if (value == null) return ['—', SERIES_LABELS[name] ?? name];
  return [formatNumber(Number(value)), SERIES_LABELS[name] ?? name];
}

function tooltipIndexFormatter(value: number | string | null | undefined, name: string) {
  if (value == null) return ['—', SERIES_LABELS[name] ?? name];
  return [
    Number(value).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    SERIES_LABELS[name] ?? name,
  ];
}

function tooltipPercentFormatter(value: number | string | null | undefined, name: string) {
  if (value == null) return ['—', SERIES_LABELS[name] ?? name];
  return [`${Number(value).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`, SERIES_LABELS[name] ?? name];
}

export default function ConstructionRealityCharts() {
  return (
    <section className="not-prose my-8 space-y-8">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">Fáze 1</p>
          <h3 className="font-semibold text-on-background mb-2">Povolení</h3>
          <p className="text-sm text-on-surface-variant mb-0">Co se smí postavit. Předstihový indikátor budoucí nabídky.</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">Fáze 2</p>
          <h3 className="font-semibold text-on-background mb-2">Výstavba</h3>
          <p className="text-sm text-on-surface-variant mb-0">Projekt se rozbíhá a staví. Tady se často tráví nejvíc času.</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">Fáze 3</p>
          <h3 className="font-semibold text-on-background mb-2">Dokončení</h3>
          <p className="text-sm text-on-surface-variant mb-0">Byt je hotový a vstupuje na trh. Reaguje se zpožděním.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 md:p-6">
        <h3 className="text-lg font-bold text-on-background mb-1">Graf 1: Povolení vs. dokončené byty</h3>
        <p className="text-sm text-on-surface-variant mb-4">ČR, roční data ČSÚ. Srovnáváme pipeline a výsledek.</p>
        <div className="w-full" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={PIPELINE_DATA} margin={{ top: 10, right: 20, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value: number) => formatNumber(value)} width={80} />
              <Tooltip formatter={tooltipNumberFormatter as never} />
              <Legend />
              <ReferenceLine x={2021} stroke="#64748b" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="permits"
                stroke="#2563eb"
                strokeWidth={2.5}
                name={SERIES_LABELS.permits}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#ef4444"
                strokeWidth={2.5}
                name={SERIES_LABELS.completed}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 md:p-6">
        <h3 className="text-lg font-bold text-on-background mb-1">Graf 2: Meziroční změna (YoY)</h3>
        <p className="text-sm text-on-surface-variant mb-4">Umožní rychle vidět, kdy se trend láme.</p>
        <div className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={YOY_DATA} margin={{ top: 10, right: 20, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value: number) => `${value} %`} width={70} />
              <Tooltip formatter={tooltipPercentFormatter as never} />
              <Legend />
              <ReferenceLine y={0} stroke="#475569" />
              <Line
                type="monotone"
                dataKey="permits_yoy"
                stroke="#2563eb"
                strokeWidth={2.2}
                name={SERIES_LABELS.permits_yoy}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="completed_yoy"
                stroke="#ef4444"
                strokeWidth={2.2}
                name={SERIES_LABELS.completed_yoy}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 md:p-6">
        <h3 className="text-lg font-bold text-on-background mb-1">Graf 3: Index (2019 = 100)</h3>
        <p className="text-sm text-on-surface-variant mb-4">Stejný základ usnadní porovnání dynamiky obou řad.</p>
        <div className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={INDEX_DATA} margin={{ top: 10, right: 20, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value: number) => `${value}`} width={60} />
              <Tooltip formatter={tooltipIndexFormatter as never} />
              <Legend />
              <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="permits_idx_2019"
                stroke="#2563eb"
                strokeWidth={2.2}
                name={SERIES_LABELS.permits_idx_2019}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="completed_idx_2019"
                stroke="#ef4444"
                strokeWidth={2.2}
                name={SERIES_LABELS.completed_idx_2019}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 md:p-6">
        <h3 className="text-lg font-bold text-on-background mb-1">Graf 4: Index stavební produkce (ČSÚ)</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Roční průměr měsíčních indexů, stálé ceny, neočištěno, průměr bazického roku (200075).
        </p>
        <div className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={PRODUCTION_INDEX_DATA} margin={{ top: 10, right: 20, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value: number) => `${value}`} width={60} />
              <Tooltip formatter={tooltipIndexFormatter as never} />
              <Legend />
              <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="index_total"
                stroke="#0f766e"
                strokeWidth={2.4}
                name={SERIES_LABELS.index_total}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="index_buildings"
                stroke="#2563eb"
                strokeWidth={2.2}
                name={SERIES_LABELS.index_buildings}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="index_engineering"
                stroke="#9333ea"
                strokeWidth={2.2}
                name={SERIES_LABELS.index_engineering}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="text-sm text-on-surface-variant mb-1">Maximum povolení v datech</p>
          <p className="text-xl font-bold text-on-background mb-0">
            {formatNumber(CONSTRUCTION_KEY_STATS.permitsPeak.value)} ({CONSTRUCTION_KEY_STATS.permitsPeak.year})
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="text-sm text-on-surface-variant mb-1">Maximum dokončených bytů v datech</p>
          <p className="text-xl font-bold text-on-background mb-0">
            {formatNumber(CONSTRUCTION_KEY_STATS.completedPeak.value)} ({CONSTRUCTION_KEY_STATS.completedPeak.year})
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="text-sm text-on-surface-variant mb-1">Maximum indexu stavební produkce</p>
          <p className="text-xl font-bold text-on-background mb-0">
            {CONSTRUCTION_KEY_STATS.productionIndexPeak.value.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
            ({CONSTRUCTION_KEY_STATS.productionIndexPeak.year})
          </p>
        </div>
      </div>
    </section>
  );
}
