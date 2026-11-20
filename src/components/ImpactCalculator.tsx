import { CheckSquare, RotateCcw } from 'lucide-react';
import type { ImpactTotals } from '../types/airQuality';

interface ImpactCalculatorProps {
  impact: ImpactTotals;
  onSelectAll: () => void;
  onClearAll: () => void;
  disabled: boolean;
}

export function ImpactCalculator({
  impact,
  onSelectAll,
  onClearAll,
  disabled,
}: ImpactCalculatorProps) {
  const progressPct =
    impact.totalCount > 0
      ? Math.round((impact.checkedCount / impact.totalCount) * 100)
      : 0;

  return (
    <section
      aria-label="Interactive direct impact calculator"
      className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">
            Direct Impact
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {impact.checkedCount} of {impact.totalCount} actions active today
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled || impact.checkedCount === impact.totalCount}
            aria-label="Select all suggested actions"
            className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 disabled:opacity-45 transition-colors whitespace-nowrap"
          >
            <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>All</span>
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={disabled || impact.checkedCount === 0}
            aria-label="Clear checked actions"
            className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 disabled:opacity-45 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div
        className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Selected household actions progress"
      >
        <div
          className="h-full bg-teal-700 transition-all duration-200 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="divide-y divide-slate-100">
        <div className="py-3.5 first:pt-1">
          <p className="text-xs font-medium text-slate-500">
            PM2.5 Exposure Avoided Today
          </p>
          <p
            data-testid="impact-pm25-avoided"
            className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums mt-1"
          >
            {impact.pm25AvoidedUgM3Hours.toLocaleString('en-IN')}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              µg/m³-hours
            </span>
          </p>
        </div>

        <div className="py-3.5">
          <p className="text-xs font-medium text-slate-500">
            Cigarette-Equivalents Avoided
          </p>
          <p
            data-testid="impact-cigarettes-avoided"
            className="font-mono text-2xl sm:text-3xl font-semibold text-teal-800 tabular-nums mt-1"
          >
            {impact.cigaretteEquivalentsAvoided.toFixed(2)}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              cigarettes / day
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Calculated at 22 µg/m³ daily average = 1 cigarette
          </p>
        </div>

        <div className="py-3.5 last:pb-0">
          <p className="text-xs font-medium text-slate-500">
            Weekly Emissions Saved
          </p>
          <p
            data-testid="impact-co2-saved"
            className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums mt-1"
          >
            {impact.weeklyCo2SavedKg.toFixed(1)}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              kg CO₂e / week
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
