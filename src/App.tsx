import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { CitySelector } from './components/CitySelector';
import { AqiHeroCard } from './components/AqiHeroCard';
import { SafeWindowChart } from './components/SafeWindowChart';
import { HouseholdProfiler } from './components/HouseholdProfiler';
import { ActionPlanTabs } from './components/ActionPlanTabs';
import { ImpactCalculator } from './components/ImpactCalculator';
import { FamilyBroadcastCard } from './components/FamilyBroadcastCard';
import { buildFallbackAirQuality, calculateDirectImpact } from './utils/aqi';
import type {
  AirQualityPayload,
  CityPresetId,
  HouseholdProfile,
  StructuredActionPlan,
} from './types/airQuality';

const DEFAULT_PROFILE: HouseholdProfile = {
  sensitivity: 'Kids & Seniors',
  commute: 'Metro / Bus',
  budgetTier: 'Under ₹3,000',
};

export default function App() {
  const [selectedCityId, setSelectedCityId] = useState<CityPresetId>('delhi');
  const [customLocationName, setCustomLocationName] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Start immediately with realistic Delhi-NCR winter smog fallback so the screen is never empty,
  // then seamlessly hydrate with live Open-Meteo telemetry on mount.
  const [airQuality, setAirQuality] = useState<AirQualityPayload>(() =>
    buildFallbackAirQuality('delhi')
  );
  const [isLoadingAq, setIsLoadingAq] = useState(true);

  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [appliedProfileKey, setAppliedProfileKey] = useState<string>('');
  const [plan, setPlan] = useState<StructuredActionPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const planRequestCounter = useRef(0);

  const profileKey = `${profile.sensitivity}|${profile.commute}|${profile.budgetTier}`;
  const isProfileDirty = Boolean(appliedProfileKey) && appliedProfileKey !== profileKey;

  const generateActionPlan = useCallback(
    async (aqData: AirQualityPayload, targetProfile: HouseholdProfile) => {
      const requestId = ++planRequestCounter.current;
      setIsGeneratingPlan(true);
      setPlanError(null);

      try {
        const res = await fetch('/api/action-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ airQuality: aqData, profile: targetProfile }),
        });

        const body = (await res.json()) as StructuredActionPlan & { error?: string };
        if (!res.ok) {
          throw new Error(body.error || `Server error (${res.status})`);
        }

        if (requestId !== planRequestCounter.current) return;

        setPlan(body);
        setAppliedProfileKey(
          `${targetProfile.sensitivity}|${targetProfile.commute}|${targetProfile.budgetTier}`
        );
        // Pre-select the top routine action so users immediately see live impact feedback
        const firstId = body.dailyRoutine?.[0]?.id;
        setCheckedIds(firstId ? new Set([firstId]) : new Set());
      } catch (err) {
        if (requestId !== planRequestCounter.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to reach Gemini action plan service.';
        setPlanError(msg);
      } finally {
        if (requestId === planRequestCounter.current) {
          setIsGeneratingPlan(false);
        }
      }
    },
    []
  );

  const fetchAirQuality = useCallback(
    async (
      params:
        | { mode: 'preset'; cityId: Exclude<CityPresetId, 'custom'> }
        | { mode: 'coords'; lat: number; lon: number },
      targetProfile: HouseholdProfile
    ) => {
      setIsLoadingAq(true);
      setLocationMessage(null);

      const query =
        params.mode === 'preset'
          ? `city=${encodeURIComponent(params.cityId)}`
          : `city=custom&lat=${encodeURIComponent(params.lat)}&lon=${encodeURIComponent(params.lon)}`;

      try {
        const res = await fetch(`/api/air-quality?${query}`);
        if (!res.ok) {
          throw new Error(`Air quality request failed (${res.status})`);
        }
        const data = (await res.json()) as AirQualityPayload;
        setAirQuality(data);
        if (params.mode === 'coords') {
          setSelectedCityId('custom');
          setCustomLocationName(data.cityName);
        } else {
          setSelectedCityId(params.cityId);
          setCustomLocationName(null);
        }
        await generateActionPlan(data, targetProfile);
      } catch {
        const fallbackCityId: CityPresetId =
          params.mode === 'preset' ? params.cityId : 'delhi';
        const fallback = buildFallbackAirQuality(fallbackCityId);
        setAirQuality(fallback);
        await generateActionPlan(fallback, targetProfile);
      } finally {
        setIsLoadingAq(false);
      }
    },
    [generateActionPlan]
  );

  // Initial Delhi-NCR load
  useEffect(() => {
    void fetchAirQuality({ mode: 'preset', cityId: 'delhi' }, DEFAULT_PROFILE);
  }, [fetchAirQuality]);

  const handleSelectCity = (cityId: Exclude<CityPresetId, 'custom'>) => {
    setSelectedCityId(cityId);
    void fetchAirQuality({ mode: 'preset', cityId }, profile);
  };

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationMessage('Geolocation is not supported in this browser. Choose a city preset.');
      return;
    }

    setIsLocating(true);
    setLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        void fetchAirQuality(
          {
            mode: 'coords',
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
          profile
        );
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationMessage('Location access denied — showing selected Indian city preset.');
        } else {
          setLocationMessage('Could not detect GPS location — showing selected Indian city preset.');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const handleToggleAction = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!plan) return;
    const allIds = [
      ...plan.dailyRoutine.map((i) => i.id),
      ...plan.indoorHacks.map((i) => i.id),
      ...plan.sustainableSwaps.map((i) => i.id),
    ];
    setCheckedIds(new Set(allIds));
  };

  const handleClearAll = () => {
    setCheckedIds(new Set());
  };

  const impactTotals = useMemo(
    () => calculateDirectImpact(plan, checkedIds),
    [plan, checkedIds]
  );

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#141918] flex flex-col">
      <Header onUseMyLocation={handleUseMyLocation} isLocating={isLocating} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* City Preset Strip */}
        <CitySelector
          selectedCityId={selectedCityId}
          customLocationName={customLocationName}
          onSelectCity={handleSelectCity}
          locationMessage={locationMessage}
        />

        {/* Hero Row: CPCB AQI Summary + 24-Hour Safe Outdoor Window Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5">
            <AqiHeroCard airQuality={airQuality} isLoading={isLoadingAq} />
          </div>
          <div className="lg:col-span-7">
            <SafeWindowChart airQuality={airQuality} isLoading={isLoadingAq} />
          </div>
        </div>

        {/* Household & Lifestyle Profiler */}
        <HouseholdProfiler
          profile={profile}
          onChangeProfile={setProfile}
          onGeneratePlan={() => void generateActionPlan(airQuality, profile)}
          isGenerating={isGeneratingPlan}
          isDirty={isProfileDirty}
        />

        {/* Action Plan + Sticky Direct Impact & Family Broadcast Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <ActionPlanTabs
              plan={plan}
              isLoading={isGeneratingPlan}
              error={planError}
              onRetry={() => void generateActionPlan(airQuality, profile)}
              checkedIds={checkedIds}
              onToggleAction={handleToggleAction}
              cityName={airQuality.cityName}
            />
          </div>

          <aside
            aria-label="Impact summary and family sharing"
            className="lg:col-span-4 space-y-6 lg:sticky lg:top-20"
          >
            <ImpactCalculator
              impact={impactTotals}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              disabled={!plan || isGeneratingPlan}
            />
            <FamilyBroadcastCard airQuality={airQuality} plan={plan} />
          </aside>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            VayuPulse · Indian CPCB National AQI & CAQM GRAP guidance for families.
          </p>
          <p>
            Air quality telemetry via Open-Meteo · Cigarette equivalence: 22 µg/m³ daily average = 1 cigarette.
          </p>
        </div>
      </footer>
    </div>
  );
}
