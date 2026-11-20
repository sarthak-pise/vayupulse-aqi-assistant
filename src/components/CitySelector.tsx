import { MapPin } from 'lucide-react';
import { CITY_PRESETS } from '../utils/aqi';
import type { CityPresetId } from '../types/airQuality';

interface CitySelectorProps {
  selectedCityId: CityPresetId;
  customLocationName: string | null;
  onSelectCity: (cityId: Exclude<CityPresetId, 'custom'>) => void;
  locationMessage: string | null;
}

export function CitySelector({
  selectedCityId,
  customLocationName,
  onSelectCity,
  locationMessage,
}: CitySelectorProps) {
  return (
    <section aria-label="Indian city selection" className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Indian city presets"
          className="flex flex-wrap items-center gap-2"
        >
          {CITY_PRESETS.map((city) => {
            const isActive = selectedCityId === city.id;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => onSelectCity(city.id)}
                aria-pressed={isActive}
                className={`min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {city.name}
              </button>
            );
          })}

          {selectedCityId === 'custom' && customLocationName && (
            <span className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium whitespace-nowrap shrink-0">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{customLocationName}</span>
            </span>
          )}
        </div>

        {locationMessage && (
          <p role="status" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            {locationMessage}
          </p>
        )}
      </div>
    </section>
  );
}
