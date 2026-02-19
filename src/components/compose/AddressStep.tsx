/**
 * @file src/components/compose/AddressStep.tsx
 * Step 1 of the compose flow: addressing the letter.
 *
 * UI:
 *   - Radio buttons: Username | Email | Phone | Address
 *   - Input field for the selected type
 *   - If not username: static message "If an account exists, we'll route it."
 *   - "Write to a stranger" option (if user has pen pal matching enabled)
 */

"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import type { AddressingInputType } from "@/types";

type AddressMode = AddressingInputType | "PEN_PAL_MATCH";

interface AddressStepProps {
  onNext: (type: AddressMode, value: string) => void;
  isPenPalEligible: boolean;
}

const MODES: { value: AddressingInputType; label: string; placeholder: string }[] = [
  { value: "USERNAME", label: "Username", placeholder: "their_username" },
  { value: "EMAIL", label: "Email address", placeholder: "name@example.com" },
  { value: "PHONE", label: "Phone number", placeholder: "+1 555 000 0000" },
  { value: "ADDRESS", label: "Mailing address", placeholder: "123 Main St, City, State" },
];

export default function AddressStep({ onNext, isPenPalEligible }: AddressStepProps) {
  const [mode, setMode] = useState<AddressMode>("USERNAME");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    if (mode === "PEN_PAL_MATCH") {
      onNext("PEN_PAL_MATCH", "");
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter a value.");
      return;
    }
    setError(null);
    onNext(mode, trimmed);
  }

  const selectedMode = MODES.find((m) => m.value === mode);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-serif text-ink">Who is this letter for?</h2>

      <fieldset className="space-y-2">
        <legend className="sr-only">Addressing method</legend>

        {MODES.map((m) => (
          <label key={m.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="addressMode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => {
                setMode(m.value);
                setValue("");
                setError(null);
              }}
              className="accent-seal"
            />
            <span className="text-sm text-ink">{m.label}</span>
          </label>
        ))}

        {isPenPalEligible && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="addressMode"
              value="PEN_PAL_MATCH"
              checked={mode === "PEN_PAL_MATCH"}
              onChange={() => {
                setMode("PEN_PAL_MATCH");
                setValue("");
                setError(null);
              }}
              className="accent-seal"
            />
            <span className="text-sm text-ink">Write to a stranger (pen pal)</span>
          </label>
        )}
      </fieldset>

      {mode !== "PEN_PAL_MATCH" && (
        <div className="space-y-1">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={selectedMode?.placeholder ?? ""}
            className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
          />
          {mode !== "USERNAME" && (
            <p className="text-xs text-ink-muted">
              If an account with this {mode.toLowerCase().replace("_", " ")} exists,
              we&apos;ll route your letter to them.
            </p>
          )}
          {error && <p className="text-xs text-seal">{error}</p>}
        </div>
      )}

      {mode === "PEN_PAL_MATCH" && (
        <p className="text-sm text-ink-muted">
          We&apos;ll match you with someone looking for a pen pal. Your letter will be
          delivered when a match is found.
        </p>
      )}

      <Button variant="primary" size="md" onClick={handleContinue}>
        Continue
      </Button>
    </div>
  );
}
