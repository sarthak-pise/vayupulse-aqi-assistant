import { LocateFixed, Loader2 } from 'lucide-react';

interface HeaderProps {
  onUseMyLocation: () => void;
  isLocating: boolean;
}

export function Header({ onUseMyLocation, isLocating }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        <a
          href="#air-quality"
          className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          VayuPulse
        </a>

        <nav
          aria-label="Primary sections"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#air-quality"
            className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Air Quality
          </a>
          <a
            href="#safe-window"
            className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            24h Window
          </a>
          <a
            href="#action-plan"
            className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Action Plan
          </a>
          <a
            href="#family-brief"
            className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Family Brief
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onUseMyLocation}
            disabled={isLocating}
            aria-label="Use my current location for air quality"
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:bg-teal-700/70 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isLocating ? 'Locating…' : 'Use My Location'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
