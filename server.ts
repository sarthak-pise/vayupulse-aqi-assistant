import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildFallbackAirQuality,
  calculateCpcbAqi,
  CITY_PRESETS,
  findNearestPresetCity,
  findSafestWindow,
  getCurrentIstHourPrefix,
  parseOpenMeteoHourly,
  type OpenMeteoAirQualityRaw,
} from './src/utils/aqi.ts';
import type {
  AirQualityPayload,
  CityPresetId,
  HouseholdProfile,
  StructuredActionPlan,
} from './src/types/airQuality.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// Simple in-memory cache for Open-Meteo calls (5 minutes)
const aqCache = new Map<string, { expiresAt: number; payload: AirQualityPayload }>();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function fetchLiveOpenMeteo(
  lat: number,
  lon: number,
  cityId: CityPresetId,
  cityName: string,
  regionLabel: string
): Promise<AirQualityPayload> {
  const cacheKey = `${cityId}:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = aqCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&hourly=pm2_5,pm10,nitrogen_dioxide` +
    `&timezone=Asia%2FKolkata` +
    `&forecast_days=2`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo responded with status ${response.status}`);
    }
    const raw = (await response.json()) as OpenMeteoAirQualityRaw;
    const istPrefix = getCurrentIstHourPrefix();
    const hourly = parseOpenMeteoHourly(raw, istPrefix);

    if (hourly.length < 12) {
      throw new Error('Open-Meteo returned insufficient hourly data');
    }

    const currentPoint = hourly[0];
    const cpcb = calculateCpcbAqi({
      pm25: currentPoint.pm25,
      pm10: currentPoint.pm10,
      no2: currentPoint.no2,
    });

    const payload: AirQualityPayload = {
      cityId,
      cityName,
      regionLabel,
      lat,
      lon,
      source: 'live',
      sourceNote: 'Live hourly telemetry from Open-Meteo Air Quality API (IST)',
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

    aqCache.set(cacheKey, {
      expiresAt: Date.now() + 5 * 60 * 1000,
      payload,
    });

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

const ACTION_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    advisorySummary: {
      type: Type.STRING,
      description: 'Two-sentence plain-English health and smog overview tailored to this Indian household and current CPCB AQI.',
    },
    dailyRoutine: {
      type: Type.ARRAY,
      description: 'Exactly 3 time-slotted low-emission daily actions matched to the 24-hour PM2.5 curve and safest 2-hour window.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Unique short slug like routine-1, routine-2, routine-3.' },
          timeSlot: { type: Type.STRING, description: 'Specific clock range e.g. 6:30 AM – 9:30 AM or 2:00 PM – 4:00 PM.' },
          title: { type: Type.STRING, description: 'Concise actionable headline under 10 words.' },
          guidance: { type: Type.STRING, description: 'Concrete practical instruction for Indian families.' },
          whyNow: { type: Type.STRING, description: 'Short link to today’s PM2.5 curve or GRAP advisory.' },
          pm25AvoidedUgM3Hours: {
            type: Type.NUMBER,
            description: 'Realistic positive integer estimate of PM2.5 µg/m³-hours avoided today (scaled to current PM2.5, typically 60 to 1200).',
          },
          weeklyCo2SavedKg: {
            type: Type.NUMBER,
            description: 'Realistic weekly CO2e saved in kg (0 to 8.0, 1 decimal place).',
          },
        },
        required: [
          'id',
          'timeSlot',
          'title',
          'guidance',
          'whyNow',
          'pm25AvoidedUgM3Hours',
          'weeklyCo2SavedKg',
        ],
      },
    },
    indoorHacks: {
      type: Type.ARRAY,
      description: 'Exactly 3 practical Indian home indoor air quality hacks strictly matched to the user budget tier.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Unique short slug like indoor-1, indoor-2, indoor-3.' },
          budgetLabel: { type: Type.STRING, description: 'Matching budget tier label.' },
          title: { type: Type.STRING, description: 'Concise practical Indian household hack title.' },
          steps: { type: Type.STRING, description: 'Clear step-by-step instructions for an Indian flat or house.' },
          estimatedCostInr: { type: Type.STRING, description: 'Cost in Indian Rupees e.g. ₹0, ₹450, ₹2,200, or Existing Purifier.' },
          pm25AvoidedUgM3Hours: {
            type: Type.NUMBER,
            description: 'Realistic positive integer estimate of PM2.5 µg/m³-hours avoided indoors today (typically 80 to 1400).',
          },
          weeklyCo2SavedKg: {
            type: Type.NUMBER,
            description: 'Realistic weekly CO2e saved in kg (0 to 4.0).',
          },
        },
        required: [
          'id',
          'budgetLabel',
          'title',
          'steps',
          'estimatedCostInr',
          'pm25AvoidedUgM3Hours',
          'weeklyCo2SavedKg',
        ],
      },
    },
    sustainableSwaps: {
      type: Type.ARRAY,
      description: 'Exactly 2 commute or lifestyle swaps tailored to the user commute mode with plain-English Direct Impact explanation.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Unique short slug like swap-1, swap-2.' },
          swapType: { type: Type.STRING, description: 'Short category like Commute Swap or Household Energy Swap.' },
          title: { type: Type.STRING, description: 'Concise actionable swap title.' },
          howToSwitch: { type: Type.STRING, description: 'Practical steps relevant to Indian urban life.' },
          directImpactExplanation: {
            type: Type.STRING,
            description: 'Plain-English explanation of why this swap cuts personal exposure and neighborhood emissions.',
          },
          pm25AvoidedUgM3Hours: {
            type: Type.NUMBER,
            description: 'Realistic positive integer estimate of PM2.5 µg/m³-hours avoided today (typically 50 to 900).',
          },
          weeklyCo2SavedKg: {
            type: Type.NUMBER,
            description: 'Realistic weekly CO2e saved in kg (1.5 to 18.0).',
          },
        },
        required: [
          'id',
          'swapType',
          'title',
          'howToSwitch',
          'directImpactExplanation',
          'pm25AvoidedUgM3Hours',
          'weeklyCo2SavedKg',
        ],
      },
    },
    hindiTopActions: {
      type: Type.ARRAY,
      description: 'Exactly 2 short, natural Hindi (Devanagari) action sentences summarizing the top 2 household steps for a family WhatsApp message.',
      items: { type: Type.STRING },
    },
  },
  required: [
    'advisorySummary',
    'dailyRoutine',
    'indoorHacks',
    'sustainableSwaps',
    'hindiTopActions',
  ],
};

async function generatePlanWithRetry(prompt: string): Promise<StructuredActionPlan> {
  const ai = getGeminiClient();
  const candidates: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.LOW },
  ];
  let lastError: unknown;

  for (let i = 0; i < candidates.length; i++) {
    const { model, thinkingLevel } = candidates[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel },
          systemInstruction:
            'You are VayuPulse, an urban air quality and public-health advisor for Indian families navigating severe winter smog. ' +
            'Provide medically responsible, culturally grounded Indian household guidance (referencing tadka exhaust chimneys, wet mopping, damp cotton window-gap towels, DIY box-fan HEPA / MERV-13 filters, N95/N99 masks, CPCB AQI, GRAP stages, and Indian metro/auto/carpool realities). ' +
            'Scale pm25AvoidedUgM3Hours proportionally to the city’s actual PM2.5 concentration so cigarette-equivalent savings (pm25AvoidedUgM3Hours / 528) are realistic and credible. ' +
            'Return strictly valid JSON matching the schema: exactly 3 dailyRoutine items, 3 indoorHacks items, 2 sustainableSwaps items, and 2 hindiTopActions.',
          responseMimeType: 'application/json',
          responseSchema: ACTION_PLAN_SCHEMA,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsed = JSON.parse(rawText) as Omit<StructuredActionPlan, 'generatedAtIso'>;
      const dailyRoutine = (parsed.dailyRoutine ?? []).slice(0, 3).map((item, idx) => ({
        ...item,
        id: item.id || `routine-${idx + 1}`,
        pm25AvoidedUgM3Hours: Math.max(10, Math.round(Number(item.pm25AvoidedUgM3Hours) || 120)),
        weeklyCo2SavedKg: Math.max(0, Math.round((Number(item.weeklyCo2SavedKg) || 0.5) * 10) / 10),
      }));

      const indoorHacks = (parsed.indoorHacks ?? []).slice(0, 3).map((item, idx) => ({
        ...item,
        id: item.id || `indoor-${idx + 1}`,
        pm25AvoidedUgM3Hours: Math.max(10, Math.round(Number(item.pm25AvoidedUgM3Hours) || 160)),
        weeklyCo2SavedKg: Math.max(0, Math.round((Number(item.weeklyCo2SavedKg) || 0.3) * 10) / 10),
      }));

      const sustainableSwaps = (parsed.sustainableSwaps ?? []).slice(0, 2).map((item, idx) => ({
        ...item,
        id: item.id || `swap-${idx + 1}`,
        pm25AvoidedUgM3Hours: Math.max(10, Math.round(Number(item.pm25AvoidedUgM3Hours) || 100)),
        weeklyCo2SavedKg: Math.max(0.5, Math.round((Number(item.weeklyCo2SavedKg) || 3.5) * 10) / 10),
      }));

      const hindiPair: [string, string] = [
        parsed.hindiTopActions?.[0] || 'सबसे कम प्रदूषण वाले 2 घंटों में ही बाहर के काम निपटाएं।',
        parsed.hindiTopActions?.[1] || 'घर में गीला पोंछा लगाएं और बाहर निकलते समय N95 मास्क पहनें।',
      ];

      return {
        advisorySummary: parsed.advisorySummary || 'Follow the safest outdoor window and seal indoor drafts during peak inversion hours.',
        dailyRoutine,
        indoorHacks,
        sustainableSwaps,
        hindiTopActions: hindiPair,
        generatedAtIso: new Date().toISOString(),
      };
    } catch (err) {
      lastError = err;
      if (i < candidates.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
      }
    }
  }

  throw lastError;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/air-quality', async (req, res) => {
    const cityParam = String(req.query.city || 'delhi') as CityPresetId;
    const latParam = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    const lonParam = req.query.lon !== undefined ? Number(req.query.lon) : undefined;

    const preset = CITY_PRESETS.find((c) => c.id === cityParam);

    let targetCityId: CityPresetId = preset ? preset.id : 'custom';
    let lat = preset ? preset.lat : latParam ?? CITY_PRESETS[0].lat;
    let lon = preset ? preset.lon : lonParam ?? CITY_PRESETS[0].lon;
    let cityName = preset ? preset.name : 'Your Location';
    let regionLabel = preset ? preset.state : `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;

    if (!preset && Number.isFinite(latParam) && Number.isFinite(lonParam)) {
      const nearby = findNearestPresetCity(lat, lon);
      if (nearby) {
        cityName = `${nearby.name} Area`;
        regionLabel = `Near ${nearby.name} · ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
      }
    }

    try {
      const livePayload = await fetchLiveOpenMeteo(lat, lon, targetCityId, cityName, regionLabel);
      res.json(livePayload);
    } catch (error) {
      console.warn('Open-Meteo fetch failed, serving realistic winter smog fallback:', error);
      const fallback = buildFallbackAirQuality(
        targetCityId,
        preset ? preset.name : cityName,
        lat,
        lon
      );
      res.json(fallback);
    }
  });

  app.post('/api/action-plan', async (req, res) => {
    try {
      const { airQuality, profile } = req.body as {
        airQuality?: AirQualityPayload;
        profile?: HouseholdProfile;
      };

      if (!airQuality || !profile) {
        res.status(400).json({ error: 'Both airQuality and household profile are required.' });
        return;
      }

      const hourlySummary = airQuality.hourly
        .filter((_, idx) => idx % 3 === 0)
        .map((h) => `${h.shortHour}: ${h.pm25} µg/m³`)
        .join(', ');

      const prompt = [
        `Generate a structured smog defense action plan for an Indian household in ${airQuality.cityName} (${airQuality.regionLabel}).`,
        `Current Live Conditions:`,
        `- Indian CPCB AQI: ${airQuality.current.aqi} (${airQuality.current.band})`,
        `- Dominant Pollutant: ${airQuality.current.dominantPollutant}`,
        `- Pollutant Breakdown: PM2.5 = ${airQuality.current.pm25} µg/m³, PM10 = ${airQuality.current.pm10} µg/m³, NO2 = ${airQuality.current.no2} µg/m³`,
        `- CAQM GRAP Stage: ${airQuality.current.grap.label} (${airQuality.current.grap.thresholdText})`,
        `- 24-Hour PM2.5 Curve (3-hr samples): ${hourlySummary}`,
        `- Safest 2-Hour Outdoor Window: ${airQuality.safeWindow.rangeLabel} (Average PM2.5: ${airQuality.safeWindow.avgPm25} µg/m³, ${airQuality.safeWindow.reductionPercentVsPeak}% cleaner than peak ${airQuality.safeWindow.peakPm25} µg/m³)`,
        '',
        `Household & Lifestyle Profile:`,
        `- Household Sensitivity: ${profile.sensitivity}`,
        `- Daily Commute: ${profile.commute}`,
        `- Home Budget Tier: ${profile.budgetTier}`,
        '',
        `Requirements:`,
        `1. dailyRoutine: Exactly 3 time-slotted actions explicitly anchored to the 24-hour PM2.5 curve and the ${airQuality.safeWindow.rangeLabel} safe window.`,
        `2. indoorHacks: Exactly 3 practical Indian home hacks strictly tailored to "${profile.budgetTier}" with realistic ₹ estimates.`,
        `3. sustainableSwaps: Exactly 2 practical commute/lifestyle swaps tailored to "${profile.commute}" with a plain-English directImpactExplanation.`,
        `4. hindiTopActions: Exactly 2 concise Hindi (Devanagari) action lines summarizing the top 2 steps for a family WhatsApp alert.`,
      ].join('\n');

      const plan = await generatePlanWithRetry(prompt);
      res.json(plan);
    } catch (error) {
      let message = 'Unable to generate tailored action plan right now. Please try again.';
      if (error instanceof Error) {
        try {
          const parsedErr = JSON.parse(error.message) as { error?: { message?: string } };
          message = parsedErr?.error?.message || error.message;
        } catch {
          message = error.message;
        }
      }
      console.error('Gemini action plan generation failed:', error);
      res.status(502).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VayuPulse server listening on http://localhost:${PORT}`);
  });
}

createServer();
