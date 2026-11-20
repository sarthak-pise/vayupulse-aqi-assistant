import { AlertTriangle, ShieldAlert, ShieldCheck, Wind } from 'lucide-react';
import type { AirQualityPayload, AqiBand, GrapStageCode } from '../types/airQuality';

interface AqiHeroCardProps {
  airQuality: AirQualityPayload | null;
  isLoading: boolean;
}

function getBandStyle(band: AqiBand): {
  pillClass: string;
  numberClass: string;
  summary: string;
} {
  switch (band) {
    case 'Good':
      return {
        pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        numberClass: 'text-emerald-700',
        summary: 'Minimal impact. Safe for outdoor walks and cross-ventilation.',
      };
    case 'Satisfactory':
      return {
        pillClass: 'bg-teal-50 text-teal-800 border-teal-200',
        numberClass: 'text-teal-700',
        summary: 'Minor breathing discomfort possible only for unusually sensitive groups.',
      };
    case 'Moderate':
      return {
        pillClass: 'bg-amber-50 text-amber-900 border-amber-300',
        numberClass: 'text-amber-700',
        summary: 'Sensitive individuals with asthma or heart conditions should pace outdoor exertion.',
      };
    case 'Poor':
      return {
        pillClass: 'bg-orange-50 text-orange-900 border-orange-300',
        numberClass: 'text-orange-700',
        summary: 'Breathing discomfort on prolonged outdoor exposure. Use masks during commute.',
      };
    case 'Very Poor':
      return {
        pillClass: 'bg-red-50 text-red-800 border-red-300',
        numberClass: 'text-red-700',
        summary: 'Respiratory illness risk on prolonged exposure. Limit outdoor time to the safe window.',
      };
    case 'Severe':
      return {
        pillClass: 'bg-rose-100 text-rose-950 border-rose-300',
        numberClass: 'text-rose-800',
        summary: 'Affects healthy people and seriously impacts children, seniors, and asthma patients.',
      };
  }
}

function getGrapPillStyle(stage: GrapStageCode): string {
  switch (stage) {
    case 'Stage IV':
      return 'bg-rose-900 text-white border-rose-900';
    case 'Stage III':
      return 'bg-red-700 text-white border-red-700';
    case 'Stage II':
      return 'bg-amber-600 text-white border-amber-600';
    case 'Stage I':
      return 'bg-amber-100 text-amber-950 border-amber-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function AqiHeroCard({ airQuality, isLoading }: AqiHeroCardProps) {
  if (isLoading && !airQuality) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-full flex flex-col justify-between animate-pulse">
        <div className="space-y-4">
          <div className="h-5 w-44 bg-slate-200 rounded" />
          <div className="h-16 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-full bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 mt-6">
          <div className="h-12 bg-slate-100 rounded" />
          <div className="h-12 bg-slate-100 rounded" />
          <div className="h-12 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!airQuality) return null;

  const { current, cityName, regionLabel, source, sourceNote } = airQuality;
  const bandStyle = getBandStyle(current.band);
  const grapClass = getGrapPillStyle(current.grap.stage);
  const isSevereOrVeryPoor = current.band === 'Severe' || current.band === 'Very Poor';

  return (
    <article
      id="air-quality"
      aria-label={`Current air quality in ${cityName}`}
      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-full flex flex-col justify-between"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {cityName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
              <span>{regionLabel}</span>
              <span aria-hidden="true">·</span>
              <span>Dominant: {current.dominantPollutant}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="aqi-band-pill"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${bandStyle.pillClass}`}
            >
              {isSevereOrVeryPoor ? (
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              ) : current.band === 'Poor' || current.band === 'Moderate' ? (
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{current.band}</span>
            </span>

            <span
              data-testid="grap-stage-pill"
              className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${grapClass}`}
            >
              {current.grap.label}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-4 pt-1">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="aqi-value"
              className={`font-mono text-6xl sm:text-7xl font-semibold tracking-tight tabular-nums leading-none ${bandStyle.numberClass}`}
            >
              {current.aqi}
            </span>
            <span className="text-sm font-medium text-slate-500">CPCB AQI</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-slate-700 leading-relaxed">{bandStyle.summary}</p>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200/70">
            <span className="font-semibold text-slate-800">{current.grap.label}:</span>{' '}
            {current.grap.mandate}
          </p>
        </div>
      </div>

      <div className="pt-5 mt-6 border-t border-slate-100 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">PM2.5</p>
            <p className="font-mono text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {current.pm25}
              <span className="text-xs font-normal text-slate-500 ml-1">µg/m³</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">PM10</p>
            <p className="font-mono text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {current.pm10}
              <span className="text-xs font-normal text-slate-500 ml-1">µg/m³</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">NO₂</p>
            <p className="font-mono text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {current.no2}
              <span className="text-xs font-normal text-slate-500 ml-1">µg/m³</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-teal-700 shrink-0" aria-hidden="true" />
            <span>
              {source === 'live'
                ? 'Live Open-Meteo Air Quality (IST)'
                : sourceNote}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}
