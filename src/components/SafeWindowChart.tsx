import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clock, Sun } from 'lucide-react';
import type { AirQualityPayload, HourlyAirQualityPoint } from '../types/airQuality';

interface SafeWindowChartProps {
  airQuality: AirQualityPayload | null;
  isLoading: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: HourlyAirQualityPoint }>;
}

function CustomSmogTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md px-3.5 py-2.5 text-xs space-y-1">
      <p className="font-semibold text-slate-900">{point.hourLabel} IST</p>
      <p className="font-mono text-slate-700 tabular-nums">
        PM2.5: <span className="font-semibold text-teal-800">{point.pm25} µg/m³</span>
      </p>
      <p className="font-mono text-slate-500 tabular-nums">
        PM10: {point.pm10} · NO₂: {point.no2} µg/m³
      </p>
    </div>
  );
}

export function SafeWindowChart({ airQuality, isLoading }: SafeWindowChartProps) {
  if (isLoading && !airQuality) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-full animate-pulse flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-6 w-56 bg-slate-200 rounded" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="h-56 bg-slate-100 rounded-xl mt-6" />
      </div>
    );
  }

  if (!airQuality) return null;

  const { hourly, safeWindow } = airQuality;
  const startKey = hourly[safeWindow.startIndex]?.shortHour;
  const endKey =
    hourly[Math.min(safeWindow.endIndex + 1, hourly.length - 1)]?.shortHour ??
    hourly[safeWindow.endIndex]?.shortHour;
  const maxVal = Math.max(...hourly.map((h) => h.pm25), 90);
  const yMax = Math.ceil((maxVal * 1.15) / 25) * 25;

  return (
    <section
      id="safe-window"
      aria-label="24-hour PM2.5 curve and safest outdoor window"
      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-full flex flex-col justify-between"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            24-Hour Safe Outdoor Window
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Hourly PM2.5 forecast highlighting the cleanest 2-hour block for walks, errands, or ventilation.
          </p>
        </div>

        <div
          data-testid="safe-window-callout"
          className="bg-teal-50 border border-teal-200/90 rounded-xl px-4 py-2.5 shrink-0"
        >
          <p className="text-xs font-medium text-teal-800 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Safest 2-Hour Window</span>
          </p>
          <p className="font-mono text-sm sm:text-base font-semibold text-teal-950 tabular-nums mt-0.5">
            {safeWindow.rangeLabel}
          </p>
          <p className="text-xs text-teal-800/90 tabular-nums mt-0.5">
            Avg {safeWindow.avgPm25} µg/m³ · {safeWindow.reductionPercentVsPeak}% lower than peak
          </p>
        </div>
      </div>

      <div className="h-60 sm:h-64 w-full mt-5" data-testid="pm25-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourly} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
            <defs>
              <linearGradient id="pm25Fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="shortHour"
              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              interval={2}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<CustomSmogTooltip />} />

            {startKey && endKey && (
              <ReferenceArea
                x1={startKey}
                x2={endKey}
                fill="#0d9488"
                fillOpacity={0.18}
                stroke="#0f766e"
                strokeOpacity={0.55}
                strokeDasharray="4 4"
              />
            )}

            <ReferenceLine
              y={60}
              stroke="#d97706"
              strokeDasharray="3 3"
              label={{
                value: 'CPCB Safe Limit (60 µg/m³)',
                position: 'insideTopLeft',
                fill: '#b45309',
                fontSize: 10,
                dy: -2,
              }}
            />

            <Area
              type="monotone"
              dataKey="pm25"
              stroke="#0f766e"
              strokeWidth={2.5}
              fill="url(#pm25Fill)"
              activeDot={{ r: 5, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
          <span>Shaded band marks the lowest 2-hour PM2.5 average in the next 24 hours.</span>
        </span>
        <span className="font-mono tabular-nums text-slate-600">
          Peak forecast: {safeWindow.peakPm25} µg/m³
        </span>
      </div>
    </section>
  );
}
