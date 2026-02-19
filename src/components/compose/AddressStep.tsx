/**
 * @file src/components/compose/AddressStep.tsx
 * Step 1 of the compose flow: addressing the letter.
 *
 * UI:
 *   - Radio buttons: Username | Email | Phone | Address
 *   - Input field for the selected type
 *   - If not username: static message "If an account exists, we'll route it."
 *   - "Write to a stranger" button (if user has pen pal matching enabled)
 *
 * TODO (Session 3): Implement.
 */

"use client";

interface AddressStepProps {
  onNext: (recipientUsername?: string) => void;
  isPenPalEligible: boolean;
}

export default function AddressStep({ onNext: _onNext, isPenPalEligible: _isPenPalEligible }: AddressStepProps) {
  // TODO (Session 3): implement addressing form
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-ink">Who is this letter for?</h2>
      <p className="text-ink-muted text-sm">TODO: address step</p>
    </div>
  );
}
