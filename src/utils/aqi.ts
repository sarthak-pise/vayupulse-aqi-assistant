import type {
  AirQualityPayload,
  AqiBand,
  CityPreset,
  CityPresetId,
  GrapStageInfo,
  HourlyAirQualityPoint,
  ImpactTotals,
  SafeWindowInfo,
  StructuredActionPlan,
} from '../types/airQuality';

export const CITY_PRESETS: CityPreset[] = [
  { id: 'delhi', name: 'Delhi-NCR', state: 'National Capital Region', lat: 28.6139, lon: 77.209 },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lon: 72.8777 },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lon: 79.0882 },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
];

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 30, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 60, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 90, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 250, cHigh: 380, iLow: 401, iHigh: 500 },
];

const PM10_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 430, cHigh: 600, iLow: 401, iHigh: 500 },
];

const NO2_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 40, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 80, cHigh: 180, iLow: 101, iHigh: 200 },
  { cLow: 180, cHigh: 280, iLow: 201, iHigh: 300 },
  { cLow: 280, cHigh: 400, iLow: 301, iHigh: 400 },
  { cLow: 400, cHigh: 600, iLow: 401, iHigh: 500 },
];

export function calculatePollutantSubIndex(
  concentration: number,
  pollutant: 'PM2.5' | 'PM10' | 'NO2'
): number {
  const safeVal = Number.isFinite(concentration) ? Math.max(0, concentration) : 0;
  const table =
    pollutant === 'PM2.5'
      ? PM25_BREAKPOINTS
      : pollutant === 'PM10'
      ? PM10_BREAKPOINTS
      : NO2_BREAKPOINTS;

  for (const bp of table) {
    if (safeVal <= bp.cHigh) {
      const ratio = (safeVal - bp.cLow) / (bp.cHigh - bp.cLow);
      return Math.round(bp.iLow + ratio * (bp.iHigh - bp.iLow));
    }
  }

  return 500;
}

export function calculateCpcbAqi(pollutants: {
  pm25: number;
  pm10: number;
  no2: number;
}): {
  aqi: number;
  dominantPollutant: 'PM2.5' | 'PM10' | 'NO2';
  band: AqiBand;
  grap: GrapStageInfo;
} {
  const pm25Sub = calculatePollutantSubIndex(pollutants.pm25, 'PM2.5');
  const pm10Sub = calculatePollutantSubIndex(pollutants.pm10, 'PM10');
  const no2Sub = calculatePollutantSubIndex(pollutants.no2, 'NO2');

  let aqi = pm25Sub;
  let dominantPollutant: 'PM2.5' | 'PM10' | 'NO2' = 'PM2.5';

  if (pm10Sub > aqi) {
    aqi = pm10Sub;
    dominantPollutant = 'PM10';
  }
  if (no2Sub > aqi) {
    aqi = no2Sub;
    dominantPollutant = 'NO2';
  }

  const band = getAqiSeverityBand(aqi);
  const grap = getGrapStage(aqi);

  return { aqi, dominantPollutant, band, grap };
}

export function getAqiSeverityBand(aqi: number): AqiBand {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function getGrapStage(aqi: number): GrapStageInfo {
  if (aqi > 450) {
    return {
      stage: 'Stage IV',
      label: 'GRAP Stage IV',
      thresholdText: 'AQI > 450 (Severe+)',
      mandate:
        'Emergency measures: halt non-essential outdoor activity, shift schools online, restrict diesel medium/heavy vehicles, and encourage 50% work-from-home.',
    };
  }
  if (aqi > 400) {
    return {
      stage: 'Stage III',
      label: 'GRAP Stage III',
      thresholdText: 'AQI 401–450 (Severe)',
      mandate:
        'Strict curbs on non-essential construction, BS-III petrol / BS-IV diesel cars, and primary school outdoor assemblies.',
    };
  }
  if (aqi > 300) {
    return {
      stage: 'Stage II',
      label: 'GRAP Stage II',
      thresholdText: 'AQI 301–400 (Very Poor)',
      mandate:
        'Targeted restrictions on diesel generators, coal/firewood tandoors, enhanced public transit frequency, and dust suppression.',
    };
  }
  if (aqi > 200) {
    return {
      stage: 'Stage I',
      label: 'GRAP Stage I',
      thresholdText: 'AQI 201–300 (Poor)',
      mandate:
        'Dust mitigation at construction sites, strict anti-open-burning enforcement, and mandatory PUC vehicle checks.',
    };
  }
  return {
    stage: 'None',
    label: 'No GRAP Curbs',
    thresholdText: 'AQI ≤ 200',
    mandate:
      'Standard CPCB advisory active. Sensitive groups should still monitor morning and late-evening PM2.5 peaks.',
  };
}

export function formatHour12(hour24: number): { hourLabel: string; shortHour: string } {
  const normalized = ((hour24 % 24) + 24) % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const h12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return {
    hourLabel: `${h12}:00 ${suffix}`,
    shortHour: `${h12}${suffix.toLowerCase()}`,
  };
}

export function parseHourFromIso(isoTime: string): number {
  const match = isoTime.match(/T(\d{2}):/);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  const date = new Date(isoTime);
  return Number.isNaN(date.getTime()) ? 0 : date.getHours();
}

export function findSafestWindow(hourly: HourlyAirQualityPoint[]): SafeWindowInfo {
  if (hourly.length === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      startLabel: '2:00 PM',
      endLabel: '4:00 PM',
      rangeLabel: '2:00 PM – 4:00 PM',
      avgPm25: 0,
      peakPm25: 0,
      reductionPercentVsPeak: 0,
    };
  }

  if (hourly.length === 1) {
    const startH = parseHourFromIso(hourly[0].isoTime);
    const endH = formatHour12(startH + 2).hourLabel;
    return {
      startIndex: 0,
      endIndex: 0,
      startLabel: hourly[0].hourLabel,
      endLabel: endH,
      rangeLabel: `${hourly[0].hourLabel} – ${endH}`,
      avgPm25: Math.round(hourly[0].pm25),
      peakPm25: Math.round(hourly[0].pm25),
      reductionPercentVsPeak: 0,
    };
  }

  let bestStart = 0;
  let lowestAvg = Number.POSITIVE_INFINITY;
  let peakPm25 = 0;

  for (let i = 0; i < hourly.length; i++) {
    if (hourly[i].pm25 > peakPm25) {
      peakPm25 = hourly[i].pm25;
    }
    if (i < hourly.length - 1) {
      const avg = (hourly[i].pm25 + hourly[i + 1].pm25) / 2;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        bestStart = i;
      }
    }
  }

  const endIndex = bestStart + 1;
  const startHourNum = parseHourFromIso(hourly[bestStart].isoTime);
  const startLabel = hourly[bestStart].hourLabel;
  const endLabel = formatHour12(startHourNum + 2).hourLabel;
  const roundedAvg = Math.round(lowestAvg);
  const roundedPeak = Math.round(peakPm25);
  const reductionPercentVsPeak =
    roundedPeak > 0 ? Math.max(0, Math.round(((roundedPeak - roundedAvg) / roundedPeak) * 100)) : 0;

  return {
    startIndex: bestStart,
    endIndex,
    startLabel,
    endLabel,
    rangeLabel: `${startLabel} – ${endLabel}`,
    avgPm25: roundedAvg,
    peakPm25: roundedPeak,
    reductionPercentVsPeak,
  };
}

export interface OpenMeteoAirQualityRaw {
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    nitrogen_dioxide?: Array<number | null>;
  };
}

export function parseOpenMeteoHourly(
  raw: OpenMeteoAirQualityRaw,
  nowIstIsoPrefix?: string
): HourlyAirQualityPoint[] {
  const times = raw.hourly?.time ?? [];
  const pm25Arr = raw.hourly?.pm2_5 ?? [];
  const pm10Arr = raw.hourly?.pm10 ?? [];
  const no2Arr = raw.hourly?.nitrogen_dioxide ?? [];

  if (times.length === 0) return [];

  let startIdx = 0;
  if (nowIstIsoPrefix) {
    const exact = times.findIndex((t) => t.startsWith(nowIstIsoPrefix));
    if (exact >= 0) {
      startIdx = exact;
    } else {
      const fallbackIdx = times.findIndex((t) => t >= nowIstIsoPrefix);
      if (fallbackIdx >= 0) startIdx = fallbackIdx;
    }
  }

  const points: HourlyAirQualityPoint[] = [];
  for (let i = startIdx; i < Math.min(times.length, startIdx + 24); i++) {
    const pm25 = pm25Arr[i];
    const pm10 = pm10Arr[i];
    const no2 = no2Arr[i];
    if (pm25 == null && pm10 == null && no2 == null) continue;

    const hourNum = parseHourFromIso(times[i]);
    const { hourLabel, shortHour } = formatHour12(hourNum);

    points.push({
      isoTime: times[i],
      hourLabel,
      shortHour,
      pm25: Math.round((pm25 ?? 0) * 10) / 10,
      pm10: Math.round((pm10 ?? 0) * 10) / 10,
      no2: Math.round((no2 ?? 0) * 10) / 10,
    });
  }

  return points;
}

export function getCurrentIstHourPrefix(now: Date = new Date()): string {
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  const yyyy = istDate.getUTCFullYear();
  const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getUTCDate()).padStart(2, '0');
  const hh = String(istDate.getUTCHours()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}`;
}

export function buildFallbackAirQuality(
  cityId: CityPresetId = 'delhi',
  customCityName?: string,
  customLat?: number,
  customLon?: number
): AirQualityPayload {
  const preset = CITY_PRESETS.find((c) => c.id === cityId) ?? CITY_PRESETS[0];

  // Realistic winter diurnal curve scaled for each city (Delhi-NCR default is severe winter inversion smog)
  const cityScale: Record<CityPresetId, number> = {
    delhi: 1.0,
    kolkata: 0.62,
    mumbai: 0.48,
    nagpur: 0.44,
    bengaluru: 0.28,
    custom: 0.85,
  };
  const scale = cityScale[cityId] ?? 1.0;

  // 24-hour winter inversion profile starting at 7 AM IST:
  // High morning inversion (7-10 AM), clears around 2-4 PM (safest window), spikes after sunset (8 PM-1 AM).
  const delhiBasePm25 = [
    348, 362, 334, 286, 232, 196, 174, 154, 148, 168, 212, 265,
    318, 356, 384, 392, 378, 360, 342, 326, 315, 310, 318, 332,
  ];
  const delhiBasePm10 = [
    488, 512, 472, 405, 338, 290, 264, 238, 228, 256, 315, 388,
    458, 502, 538, 548, 526, 498, 475, 452, 438, 430, 444, 466,
  ];
  const delhiBaseNo2 = [
    94, 108, 114, 92, 68, 54, 46, 42, 44, 58, 86, 116,
    132, 128, 118, 102, 88, 76, 68, 62, 60, 66, 78, 88,
  ];

  const today = new Date();
  const baseStartHour = 7;

  const hourly: HourlyAirQualityPoint[] = delhiBasePm25.map((basePm25, idx) => {
    const hour24 = (baseStartHour + idx) % 24;
    const dayOffset = baseStartHour + idx >= 24 ? 1 : 0;
    const d = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(hour24).padStart(2, '0');
    const { hourLabel, shortHour } = formatHour12(hour24);

    return {
      isoTime: `${yyyy}-${mm}-${dd}T${hh}:00`,
      hourLabel,
      shortHour,
      pm25: Math.round(basePm25 * scale),
      pm10: Math.round(delhiBasePm10[idx] * scale),
      no2: Math.round(delhiBaseNo2[idx] * scale),
    };
  });

  const currentPoint = hourly[0];
  const cpcb = calculateCpcbAqi({
    pm25: currentPoint.pm25,
    pm10: currentPoint.pm10,
    no2: currentPoint.no2,
  });

  return {
    cityId,
    cityName: customCityName ?? preset.name,
    regionLabel: customCityName ? 'Detected Location' : preset.state,
    lat: customLat ?? preset.lat,
    lon: customLon ?? preset.lon,
    source: 'fallback',
    sourceNote: 'Winter smog offline reference dataset active (live Open-Meteo unreachable)',
    updatedAtIso: new Date().toISOString(),
    current: {
      pm25: currentPoint.pm25,
      pm10: currentPoint.pm10,
      no2: currentPoint.no2,
      aqi: cpcb.aqi,
      dominantPollutant: cpcb.dominantPollutant,
      band: cpcb.band,
      grap: cpcb.grap,
    },
    hourly,
    safeWindow: findSafestWindow(hourly),
  };
}

export function findNearestPresetCity(lat: number, lon: number): CityPreset | null {
  let closest: CityPreset | null = null;
  let minDistSq = Number.POSITIVE_INFINITY;

  for (const city of CITY_PRESETS) {
    const dLat = city.lat - lat;
    const dLon = city.lon - lon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closest = city;
    }
  }

  // Within ~1.2 degrees (~130 km) snap label to metro area
  return minDistSq <= 1.44 ? closest : null;
}

/**
 * Computes live impact totals for checked actions.
 * Cigarette-equivalents formula:
 * Berkeley Earth rule: 22 µg/m³ daily average (24-hr mean) = 1 cigarette.
 * Therefore 1 cigarette = 22 * 24 = 528 µg/m³-hours of PM2.5 exposure.
 */
export function calculateDirectImpact(
  plan: StructuredActionPlan | null,
  checkedIds: ReadonlySet<string>
): ImpactTotals {
  if (!plan) {
    return {
      checkedCount: 0,
      totalCount: 0,
      pm25AvoidedUgM3Hours: 0,
      cigaretteEquivalentsAvoided: 0,
      weeklyCo2SavedKg: 0,
    };
  }

  const allItems = [
    ...plan.dailyRoutine,
    ...plan.indoorHacks,
    ...plan.sustainableSwaps,
  ];

  let checkedCount = 0;
  let pm25AvoidedUgM3Hours = 0;
  let weeklyCo2SavedKg = 0;

  for (const item of allItems) {
    if (checkedIds.has(item.id)) {
      checkedCount += 1;
      pm25AvoidedUgM3Hours += Math.max(0, item.pm25AvoidedUgM3Hours);
      weeklyCo2SavedKg += Math.max(0, item.weeklyCo2SavedKg);
    }
  }

  const cigaretteEquivalentsAvoided =
    Math.round((pm25AvoidedUgM3Hours / (22 * 24)) * 100) / 100;

  return {
    checkedCount,
    totalCount: allItems.length,
    pm25AvoidedUgM3Hours: Math.round(pm25AvoidedUgM3Hours),
    cigaretteEquivalentsAvoided,
    weeklyCo2SavedKg: Math.round(weeklyCo2SavedKg * 10) / 10,
  };
}

const HINDI_BAND_MAP: Record<AqiBand, string> = {
  Good: 'अच्छा (Good)',
  Satisfactory: 'संतोषजनक (Satisfactory)',
  Moderate: 'मध्यम (Moderate)',
  Poor: 'खराब (Poor)',
  'Very Poor': 'बेहद खराब (Very Poor)',
  Severe: 'गंभीर (Severe)',
};

const HINDI_GRAP_MAP: Record<GrapStageInfo['stage'], string> = {
  None: 'कोई GRAP प्रतिबंध नहीं',
  'Stage I': 'GRAP चरण I',
  'Stage II': 'GRAP चरण II',
  'Stage III': 'GRAP चरण III',
  'Stage IV': 'GRAP चरण IV (आपातकालीन)',
};

export function formatWhatsAppBrief(params: {
  airQuality: AirQualityPayload;
  plan: StructuredActionPlan | null;
  language: 'en' | 'hi';
}): string {
  const { airQuality, plan, language } = params;
  const { current, safeWindow, cityName } = airQuality;

  const topTwoEn: [string, string] = plan
    ? [
        plan.dailyRoutine[0]?.title ?? 'Keep windows shut during morning & night smog peaks',
        plan.indoorHacks[0]?.title ?? 'Wet-mop floors instead of dry sweeping to settle PM2.5',
      ]
    : [
        `Schedule outdoor errands only during ${safeWindow.rangeLabel}`,
        'Wear an N95 mask outdoors and wet-mop rooms to trap indoor dust',
      ];

  const topTwoHi: [string, string] =
    plan?.hindiTopActions && plan.hindiTopActions[0] && plan.hindiTopActions[1]
      ? plan.hindiTopActions
      : [
          `बाहर के ज़रूरी काम केवल ${safeWindow.rangeLabel} के बीच करें`,
          'बाहर जाते समय N95 मास्क पहनें और घर में झाड़ू की जगह गीला पोंछा लगाएं',
        ];

  if (language === 'hi') {
    return [
      `VayuPulse परिवार वायु गुणवत्ता अपडेट — ${cityName}`,
      `आज का CPCB AQI: ${current.aqi} (${HINDI_BAND_MAP[current.band]})`,
      `प्रदूषण स्तर: ${HINDI_GRAP_MAP[current.grap.stage]} | PM2.5: ${current.pm25} µg/m³`,
      `सबसे सुरक्षित बाहरी समय (2 घंटे): ${safeWindow.rangeLabel} (औसत PM2.5: ${safeWindow.avgPm25} µg/m³)`,
      '',
      'आज के 2 ज़रूरी घरेलू कदम:',
      `1. ${topTwoHi[0]}`,
      `2. ${topTwoHi[1]}`,
      '',
      'कृपया सुबह और देर शाम खिड़कियाँ बंद रखें व सुरक्षित रहें।',
    ].join('\n');
  }

  return [
    `VayuPulse Family Air Brief — ${cityName}`,
    `Today's CPCB AQI: ${current.aqi} (${current.band})`,
    `Advisory: ${current.grap.label} | PM2.5: ${current.pm25} µg/m³ · PM10: ${current.pm10} µg/m³`,
    `Safest 2-Hr Outdoor Window: ${safeWindow.rangeLabel} (Avg PM2.5: ${safeWindow.avgPm25} µg/m³)`,
    '',
    'Top 2 Household Actions Today:',
    `1. ${topTwoEn[0]}`,
    `2. ${topTwoEn[1]}`,
    '',
    'Keep windows sealed during morning and late-evening peaks. Stay safe!',
  ].join('\n');
}
