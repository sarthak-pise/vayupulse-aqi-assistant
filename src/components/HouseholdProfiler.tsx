import { Loader2, RefreshCw } from 'lucide-react';
import type {
  BudgetTierOption,
  CommuteOption,
  HouseholdProfile,
  SensitivityOption,
} from '../types/airQuality';

const SENSITIVITY_OPTIONS: SensitivityOption[] = [
  'General',
  'Kids & Seniors',
  'Asthma / Respiratory',
];

const COMMUTE_OPTIONS: CommuteOption[] = [
  '2-Wheeler',
  'Car',
  'Metro / Bus',
  'Work From Home',
];

const BUDGET_OPTIONS: BudgetTierOption[] = [
  'Zero-Cost DIY',
  'Under ₹3,000',
  'Air Purifier Equipped',
];

interface HouseholdProfilerProps {
  profile: HouseholdProfile;
  onChangeProfile: (next: HouseholdProfile) => void;
  onGeneratePlan: () => void;
  isGenerating: boolean;
  isDirty: boolean;
}

export function HouseholdProfiler({
  profile,
  onChangeProfile,
  onGeneratePlan,
  isGenerating,
  isDirty,
}: HouseholdProfilerProps) {
  return (
    <section
      aria-label="Household and lifestyle profiler"
      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Household & Lifestyle Profile
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tailor today’s smog schedule, indoor hacks, and commute swaps to your family.
          </p>
        </div>

        <button
          type="button"
          onClick={onGeneratePlan}
          disabled={isGenerating}
          className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
            isDirty
              ? 'bg-teal-700 hover:bg-teal-800 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          } disabled:opacity-65`}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          )}
          <span>
            {isGenerating
              ? 'Updating Plan…'
              : isDirty
              ? 'Update Action Plan'
              : 'Refresh Action Plan'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
        <fieldset className="space-y-2.5">
          <legend className="text-xs font-semibold text-slate-600">
            Household Sensitivity
          </legend>
          <div className="flex flex-wrap gap-2">
            {SENSITIVITY_OPTIONS.map((option) => {
              const active = profile.sensitivity === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeProfile({ ...profile, sensitivity: option })}
                  className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-teal-600/40 hover:text-slate-900'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2.5">
          <legend className="text-xs font-semibold text-slate-600">
            Daily Commute
          </legend>
          <div className="flex flex-wrap gap-2">
            {COMMUTE_OPTIONS.map((option) => {
              const active = profile.commute === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeProfile({ ...profile, commute: option })}
                  className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-teal-600/40 hover:text-slate-900'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2.5">
          <legend className="text-xs font-semibold text-slate-600">
            Home Budget Tier
          </legend>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((option) => {
              const active = profile.budgetTier === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeProfile({ ...profile, budgetTier: option })}
                  className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-teal-600/40 hover:text-slate-900'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
