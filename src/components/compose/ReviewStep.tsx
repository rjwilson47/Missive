/**
 * @file src/components/compose/ReviewStep.tsx
 * Step 4 of the compose flow: review + "Seal envelope".
 *
 * Shows:
 *   - Delivery estimate: "Will arrive Wednesday, Feb 21 at 4:00 PM"
 *   - "Seal envelope" confirmation button
 * On confirm: calls POST /api/letters/:id/send
 * On success: shows "Letter sent!" and navigates away (no sent folder).
 *
 * TODO (Session 3): Implement.
 */

"use client";

interface ReviewStepProps {
  draftId: string;
  scheduledDeliveryAt: string | null; // ISO string from server
}

export default function ReviewStep({ draftId: _draftId, scheduledDeliveryAt: _scheduledDeliveryAt }: ReviewStepProps) {
  // TODO (Session 3): show delivery estimate, handle seal action
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-serif text-ink">Ready to send?</h2>
      <p className="text-ink-muted text-sm">TODO: review step</p>
    </div>
  );
}
