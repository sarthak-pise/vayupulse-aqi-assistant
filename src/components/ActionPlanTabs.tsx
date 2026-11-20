import { useState } from 'react';
import { AlertCircle, Check, Clock, Home, Leaf, RefreshCw } from 'lucide-react';
import type { StructuredActionPlan } from '../types/airQuality';

export type ActionTabKey = 'routine' | 'indoor' | 'swaps';

interface ActionPlanTabsProps {
  plan: StructuredActionPlan | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  checkedIds: ReadonlySet<string>;
  onToggleAction: (id: string) => void;
  cityName: string;
}

export function ActionPlanTabs({
  plan,
  isLoading,
  error,
  onRetry,
  checkedIds,
  onToggleAction,
  cityName,
}: ActionPlanTabsProps) {
  const [activeTab, setActiveTab] = useState<ActionTabKey>('routine');

  const routineCount = plan?.dailyRoutine.length ?? 3;
  const indoorCount = plan?.indoorHacks.length ?? 3;
  const swapsCount = plan?.sustainableSwaps.length ?? 2;

  const tabs: Array<{ key: ActionTabKey; label: string; shortLabel: string; count: number }> = [
    {
      key: 'routine',
      label: 'Low-Emission Daily Routine',
      shortLabel: 'Daily Routine',
      count: routineCount,
    },
    {
      key: 'indoor',
      label: 'Indoor Air Quality Hacks',
      shortLabel: 'Indoor Hacks',
      count: indoorCount,
    },
    {
      key: 'swaps',
      label: 'Sustainable Swaps',
      shortLabel: 'Sustainable Swaps',
      count: swapsCount,
    },
  ];

  return (
    <section
      id="action-plan"
      aria-label="Structured smog action plan"
      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-6"
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Today’s Smog Action Plan
          </h2>
          <span className="text-xs text-slate-500">
            Tailored for {cityName} · Check actions to calculate avoided exposure
          </span>
        </div>

        {plan?.advisorySummary && !isLoading && !error && (
          <p className="text-sm text-slate-600 leading-relaxed pt-1">
            {plan.advisorySummary}
          </p>
        )}
      </div>

      {/* Accessible Tab Bar */}
      <div
        role="tablist"
        aria-label="Action plan categories"
        className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              role="tab"
              type="button"
              aria-selected={isSelected}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="space-y-4 py-2"
          data-testid="action-plan-loading"
        >
          <p className="text-xs text-teal-800 font-medium">
            Generating your household smog plan for {cityName}…
          </p>
          {[0, 1, 2].map((skeleton) => (
            <div
              key={skeleton}
              className="border border-slate-100 rounded-xl p-4 space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-slate-200" />
                <div className="h-4 w-48 bg-slate-200 rounded" />
              </div>
              <div className="h-3.5 w-full bg-slate-100 rounded" />
              <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-900">
                Could not generate the tailored action plan
              </p>
              <p className="text-xs text-red-800/90 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Retry Plan</span>
          </button>
        </div>
      )}

      {/* Populated Tab Panels */}
      {!isLoading && !error && plan && (
        <div>
          {activeTab === 'routine' && (
            <div
              id="panel-routine"
              role="tabpanel"
              aria-labelledby="tab-routine"
              className="divide-y divide-slate-100"
            >
              {plan.dailyRoutine.map((item) => {
                const isChecked = checkedIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-4 py-5 first:pt-1 last:pb-1 transition-colors rounded-xl px-2 -mx-2 ${
                      isChecked ? 'bg-teal-50/50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <span className="min-w-[44px] min-h-[44px] -m-2.5 flex items-center justify-center shrink-0 mt-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleAction(item.id)}
                        className="sr-only"
                        aria-label={`Mark "${item.title}" as completed`}
                      />
                      <span
                        aria-hidden="true"
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    </span>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-teal-800 tabular-nums">
                          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{item.timeSlot}</span>
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          −{item.pm25AvoidedUgM3Hours} µg/m³·hr · −{item.weeklyCo2SavedKg} kg CO₂e/wk
                        </span>
                      </div>

                      <h3
                        className={`text-base font-semibold ${
                          isChecked ? 'text-teal-950' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.guidance}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Why this slot:</span>{' '}
                        {item.whyNow}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {activeTab === 'indoor' && (
            <div
              id="panel-indoor"
              role="tabpanel"
              aria-labelledby="tab-indoor"
              className="divide-y divide-slate-100"
            >
              {plan.indoorHacks.map((item) => {
                const isChecked = checkedIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-4 py-5 first:pt-1 last:pb-1 transition-colors rounded-xl px-2 -mx-2 ${
                      isChecked ? 'bg-teal-50/50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <span className="min-w-[44px] min-h-[44px] -m-2.5 flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleAction(item.id)}
                        className="sr-only"
                        aria-label={`Mark "${item.title}" as completed`}
                      />
                      <span
                        aria-hidden="true"
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    </span>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800">
                          <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{item.budgetLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-700">{item.estimatedCostInr}</span>
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          −{item.pm25AvoidedUgM3Hours} µg/m³·hr · −{item.weeklyCo2SavedKg} kg CO₂e/wk
                        </span>
                      </div>

                      <h3
                        className={`text-base font-semibold ${
                          isChecked ? 'text-teal-950' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.steps}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {activeTab === 'swaps' && (
            <div
              id="panel-swaps"
              role="tabpanel"
              aria-labelledby="tab-swaps"
              className="divide-y divide-slate-100"
            >
              {plan.sustainableSwaps.map((item) => {
                const isChecked = checkedIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-4 py-5 first:pt-1 last:pb-1 transition-colors rounded-xl px-2 -mx-2 ${
                      isChecked ? 'bg-teal-50/50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <span className="min-w-[44px] min-h-[44px] -m-2.5 flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleAction(item.id)}
                        className="sr-only"
                        aria-label={`Mark "${item.title}" as completed`}
                      />
                      <span
                        aria-hidden="true"
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    </span>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800">
                          <Leaf className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{item.swapType}</span>
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          −{item.pm25AvoidedUgM3Hours} µg/m³·hr · −{item.weeklyCo2SavedKg} kg CO₂e/wk
                        </span>
                      </div>

                      <h3
                        className={`text-base font-semibold ${
                          isChecked ? 'text-teal-950' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.howToSwitch}</p>
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3.5 py-2.5 border border-slate-200/70 leading-relaxed">
                        <span className="font-semibold text-slate-800">Direct Impact:</span>{' '}
                        {item.directImpactExplanation}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
