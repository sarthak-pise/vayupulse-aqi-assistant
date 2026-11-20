export type CityPresetId = 'delhi' | 'mumbai' | 'bengaluru' | 'nagpur' | 'kolkata' | 'custom';

export interface CityPreset {
  id: Exclude<CityPresetId, 'custom'>;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export type AqiBand =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type GrapStageCode = 'None' | 'Stage I' | 'Stage II' | 'Stage III' | 'Stage IV';

export interface GrapStageInfo {
  stage: GrapStageCode;
  label: string;
  thresholdText: string;
  mandate: string;
}

export interface HourlyAirQualityPoint {
  isoTime: string;
  hourLabel: string;
  shortHour: string;
  pm25: number;
  pm10: number;
  no2: number;
}

export interface SafeWindowInfo {
  startIndex: number;
  endIndex: number;
  startLabel: string;
  endLabel: string;
  rangeLabel: string;
  avgPm25: number;
  peakPm25: number;
  reductionPercentVsPeak: number;
}

export interface AirQualityPayload {
  cityId: CityPresetId;
  cityName: string;
  regionLabel: string;
  lat: number;
  lon: number;
  source: 'live' | 'fallback';
  sourceNote: string;
  updatedAtIso: string;
  current: {
    pm25: number;
    pm10: number;
    no2: number;
    aqi: number;
    dominantPollutant: 'PM2.5' | 'PM10' | 'NO2';
    band: AqiBand;
    grap: GrapStageInfo;
  };
  hourly: HourlyAirQualityPoint[];
  safeWindow: SafeWindowInfo;
}

export type SensitivityOption = 'General' | 'Kids & Seniors' | 'Asthma / Respiratory';
export type CommuteOption = '2-Wheeler' | 'Car' | 'Metro / Bus' | 'Work From Home';
export type BudgetTierOption = 'Zero-Cost DIY' | 'Under ₹3,000' | 'Air Purifier Equipped';

export interface HouseholdProfile {
  sensitivity: SensitivityOption;
  commute: CommuteOption;
  budgetTier: BudgetTierOption;
}

export interface RoutineActionItem {
  id: string;
  timeSlot: string;
  title: string;
  guidance: string;
  whyNow: string;
  pm25AvoidedUgM3Hours: number;
  weeklyCo2SavedKg: number;
}

export interface IndoorHackItem {
  id: string;
  budgetLabel: string;
  title: string;
  steps: string;
  estimatedCostInr: string;
  pm25AvoidedUgM3Hours: number;
  weeklyCo2SavedKg: number;
}

export interface SustainableSwapItem {
  id: string;
  swapType: string;
  title: string;
  howToSwitch: string;
  directImpactExplanation: string;
  pm25AvoidedUgM3Hours: number;
  weeklyCo2SavedKg: number;
}

export interface StructuredActionPlan {
  advisorySummary: string;
  dailyRoutine: RoutineActionItem[];
  indoorHacks: IndoorHackItem[];
  sustainableSwaps: SustainableSwapItem[];
  hindiTopActions: [string, string];
  generatedAtIso: string;
}

export interface ImpactTotals {
  checkedCount: number;
  totalCount: number;
  pm25AvoidedUgM3Hours: number;
  cigaretteEquivalentsAvoided: number;
  weeklyCo2SavedKg: number;
}
