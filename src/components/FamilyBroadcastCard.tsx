import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { formatWhatsAppBrief } from '../utils/aqi';
import type { AirQualityPayload, StructuredActionPlan } from '../types/airQuality';

interface FamilyBroadcastCardProps {
  airQuality: AirQualityPayload | null;
  plan: StructuredActionPlan | null;
}

export function FamilyBroadcastCard({ airQuality, plan }: FamilyBroadcastCardProps) {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [copied, setCopied] = useState(false);

  if (!airQuality) return null;

  const briefText = formatWhatsAppBrief({ airQuality, plan, language });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback copy via textarea for restricted environments
      const textarea = document.createElement('textarea');
      textarea.value = briefText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  }

  return (
    <section
      id="family-brief"
      aria-label="Community and family WhatsApp broadcast card"
      className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Family Broadcast Card
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ready-to-share daily air brief for family and RWA groups.
          </p>
        </div>

        <div
          role="group"
          aria-label="Broadcast language toggle"
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0"
        >
          <button
            type="button"
            aria-pressed={language === 'en'}
            onClick={() => setLanguage('en')}
            className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              language === 'en'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            type="button"
            aria-pressed={language === 'hi'}
            onClick={() => setLanguage('hi')}
            className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              language === 'hi'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      <pre
        data-testid="whatsapp-brief-preview"
        className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl p-4"
      >
        {briefText}
      </pre>

      <button
        type="button"
        onClick={handleCopy}
        className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Copied Family Brief</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" aria-hidden="true" />
            <span>Copy Family WhatsApp Brief</span>
            <Share2 className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
          </>
        )}
      </button>
    </section>
  );
}
