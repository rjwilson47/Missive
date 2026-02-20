/**
 * @file src/components/compose/TypeStep.tsx
 * Step 2 of the compose flow: choosing the letter type.
 *
 * Options:
 *   - Typed (plain text + italics, TipTap editor)
 *   - Handwritten (photo upload of handwritten pages)
 *   - Voice — shown as disabled "coming soon"
 */

"use client";

import type { ContentType } from "@/types";

interface TypeStepProps {
  onNext: (type: ContentType) => void;
}

interface TypeOption {
  value: ContentType;
  label: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "TYPED",
    label: "Typed",
    description: "Write in plain text with italic styling, using your choice of stationery font.",
  },
  {
    value: "HANDWRITTEN",
    label: "Handwritten",
    description: "Upload photos of your handwritten pages (up to 10 images, 5 MB each).",
  },
  {
    value: "VOICE",
    label: "Voice",
    description: "Record a voice message to accompany your letter.",
    disabled: true,
    comingSoon: true,
  },
];

export default function TypeStep({ onNext }: TypeStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-serif text-ink">How would you like to write?</h2>

      <div className="space-y-3">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onNext(opt.value)}
            className={[
              "w-full text-left rounded border px-4 py-3 space-y-0.5 transition-colors",
              opt.disabled
                ? "border-paper-dark bg-paper text-ink-faint cursor-not-allowed"
                : "border-paper-dark bg-white hover:border-seal hover:bg-seal/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-seal",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{opt.label}</span>
              {opt.comingSoon && (
                <span className="text-xs text-ink-faint">Coming soon</span>
              )}
            </div>
            <p className="text-xs text-ink-muted">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
