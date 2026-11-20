import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackAirQuality,
  calculateCpcbAqi,
  calculateDirectImpact,
  calculatePollutantSubIndex,
  findSafestWindow,
  formatWhatsAppBrief,
  getAqiSeverityBand,
  getGrapStage,
  parseOpenMeteoHourly,
} from './aqi';
import type { StructuredActionPlan } from '../types/airQuality';

test('CPCB PM2.5 sub-index maps official Indian breakpoints accurately', () => {
  assert.equal(calculatePollutantSubIndex(0, 'PM2.5'), 0);
  assert.equal(calculatePollutantSubIndex(30, 'PM2.5'), 50);
  assert.equal(calculatePollutantSubIndex(60, 'PM2.5'), 100);
  assert.equal(calculatePollutantSubIndex(90, 'PM2.5'), 200);
  assert.equal(calculatePollutantSubIndex(120, 'PM2.5'), 300);
  assert.equal(calculatePollutantSubIndex(250, 'PM2.5'), 400);
  assert.equal(calculatePollutantSubIndex(420, 'PM2.5'), 500);
});

test('CPCB overall AQI takes maximum pollutant sub-index and assigns severity band and GRAP stage', () => {
  const severeDelhi = calculateCpcbAqi({ pm25: 340, pm10: 470, no2: 95 });
  assert.equal(severeDelhi.dominantPollutant, 'PM2.5');
  assert.equal(severeDelhi.band, 'Severe');
  assert.equal(severeDelhi.grap.stage, 'Stage IV');

  const moderateCity = calculateCpcbAqi({ pm25: 45, pm10: 175, no2: 40 });
  assert.equal(moderateCity.dominantPollutant, 'PM10');
  assert.equal(moderateCity.band, 'Moderate');
  assert.equal(moderateCity.grap.stage, 'None');
});

test('GRAP stages map cleanly across I to IV thresholds', () => {
  assert.equal(getGrapStage(180).stage, 'None');
  assert.equal(getGrapStage(245).stage, 'Stage I');
  assert.equal(getGrapStage(345).stage, 'Stage II');
  assert.equal(getGrapStage(425).stage, 'Stage III');
  assert.equal(getGrapStage(465).stage, 'Stage IV');
  assert.equal(getAqiSeverityBand(45), 'Good');
  assert.equal(getAqiSeverityBand(90), 'Satisfactory');
  assert.equal(getAqiSeverityBand(320), 'Very Poor');
});

test('findSafestWindow locates the single lowest-pollution contiguous 2-hour window', () => {
  const fallback = buildFallbackAirQuality('delhi');
  const win = findSafestWindow(fallback.hourly);
  // Base curve dips to 154 (index 7 = 2 PM) and 148 (index 8 = 3 PM), avg = 151
  assert.equal(win.startIndex, 7);
  assert.equal(win.endIndex, 8);
  assert.equal(win.startLabel, '2:00 PM');
  assert.equal(win.endLabel, '4:00 PM');
  assert.equal(win.avgPm25, 151);
  assert.ok(win.reductionPercentVsPeak >= 55);
});

test('parseOpenMeteoHourly aligns to IST hour prefix and slices 24 points', () => {
  const times = Array.from({ length: 30 }, (_, i) => {
    const day = i < 24 ? '2026-11-20' : '2026-11-21';
    const hh = String(i % 24).padStart(2, '0');
    return `${day}T${hh}:00`;
  });
  const parsed = parseOpenMeteoHourly(
    {
      hourly: {
        time: times,
        pm2_5: times.map((_, i) => 100 + i),
        pm10: times.map((_, i) => 150 + i),
        nitrogen_dioxide: times.map(() => 45),
      },
    },
    '2026-11-20T04'
  );
  assert.equal(parsed.length, 24);
  assert.equal(parsed[0].isoTime, '2026-11-20T04:00');
  assert.equal(parsed[0].pm25, 104);
});

test('calculateDirectImpact computes PM2.5-hours, cigarette equivalents (22 ug/m3 daily avg = 1 cig), and weekly CO2e', () => {
  const samplePlan: StructuredActionPlan = {
    advisorySummary: 'Test advisory',
    dailyRoutine: [
      {
        id: 'r1',
        timeSlot: '2:00 PM – 4:00 PM',
        title: 'Shift outdoor errands to afternoon window',
        guidance: 'Run errands at 2 PM',
        whyNow: 'Lowest PM2.5',
        pm25AvoidedUgM3Hours: 528, // exactly 22 * 24 = 1.00 cigarette equivalent
        weeklyCo2SavedKg: 1.5,
      },
    ],
    indoorHacks: [
      {
        id: 'h1',
        budgetLabel: 'Zero-Cost DIY',
        title: 'Wet mop floors',
        steps: 'Use damp cloth',
        estimatedCostInr: '₹0',
        pm25AvoidedUgM3Hours: 264, // 0.50 cigarette equivalent
        weeklyCo2SavedKg: 0.4,
      },
    ],
    sustainableSwaps: [
      {
        id: 's1',
        swapType: 'Commute',
        title: 'Switch to Metro',
        howToSwitch: 'Use metro card',
        directImpactExplanation: 'Cuts tailpipe PM2.5',
        pm25AvoidedUgM3Hours: 528, // 1.00 cigarette equivalent
        weeklyCo2SavedKg: 6.2,
      },
    ],
    hindiTopActions: ['दोपहर 2 से 4 बजे बाहर जाएं', 'गीले कपड़े से पोंछा लगाएं'],
    generatedAtIso: '2026-11-20T07:00:00.000Z',
  };

  const single = calculateDirectImpact(samplePlan, new Set(['r1']));
  assert.equal(single.pm25AvoidedUgM3Hours, 528);
  assert.equal(single.cigaretteEquivalentsAvoided, 1);
  assert.equal(single.weeklyCo2SavedKg, 1.5);

  const combined = calculateDirectImpact(samplePlan, new Set(['r1', 'h1', 's1']));
  assert.equal(combined.checkedCount, 3);
  assert.equal(combined.pm25AvoidedUgM3Hours, 1320);
  assert.equal(combined.cigaretteEquivalentsAvoided, 2.5);
  assert.equal(combined.weeklyCo2SavedKg, 8.1);
});

test('formatWhatsAppBrief formats English and Hindi briefs with AQI, GRAP stage, safe window, and top 2 actions', () => {
  const airQuality = buildFallbackAirQuality('delhi');
  const enBrief = formatWhatsAppBrief({ airQuality, plan: null, language: 'en' });
  const hiBrief = formatWhatsAppBrief({ airQuality, plan: null, language: 'hi' });

  assert.match(enBrief, /Delhi-NCR/);
  assert.match(enBrief, /GRAP Stage IV/);
  assert.match(enBrief, /2:00 PM – 4:00 PM/);

  assert.match(hiBrief, /परिवार वायु गुणवत्ता अपडेट/);
  assert.match(hiBrief, /GRAP चरण IV/);
  assert.match(hiBrief, /2:00 PM – 4:00 PM/);
});
