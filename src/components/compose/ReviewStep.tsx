/**
 * @file src/components/compose/ReviewStep.tsx
 * Step 4 of the compose flow: review + "Seal envelope".
 *
 * Shows:
 *   - Delivery estimate (formatted date if known, generic text otherwise)
 *   - "Seal envelope" confirmation button
 * On confirm: calls POST /api/letters/:id/send
 * On success: navigates to /app/unopened (no sent folder).
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

const TOKEN_KEY = "missive_token";

interface ReviewStepProps {
  draftId: string;
  scheduledDeliveryAt: string | null; // ISO string from server
}

function formatDelivery(iso: string | null): string {
  if (!iso) return "in 1–5 business days";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ReviewStep({ draftId, scheduledDeliveryAt }: ReviewStepProps) {
  const router = useRouter();
  const [isSealing, setIsSealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSeal() {
    setIsSealing(true);
    setError(null);

    const token =
      typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";

    try {
      const res = await fetch(`/api/letters/${draftId}/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not send letter. Please try again.");
        return;
      }

      setSent(true);

      // Brief pause so the user sees the success state, then navigate away
      setTimeout(() => {
        router.replace("/app/unopened");
      }, 1500);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSealing(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-serif text-ink">Letter sent!</h2>
        <p className="text-sm text-ink-muted">
          Your letter has been sealed and is on its way. Redirecting…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-serif text-ink">Ready to send?</h2>

      <div className="rounded border border-paper-dark bg-white px-4 py-4 space-y-1">
        <p className="text-sm text-ink-muted">Estimated delivery</p>
        <p className="text-sm font-medium text-ink">
          {scheduledDeliveryAt
            ? formatDelivery(scheduledDeliveryAt)
            : "Will arrive " + formatDelivery(null)}
        </p>
        <p className="text-xs text-ink-muted">
          Letters are delivered at 4:00 PM in the recipient&apos;s timezone on a business day.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-seal/40 bg-seal/10 px-4 py-3 text-sm text-seal"
        >
          {error}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        isLoading={isSealing}
        onClick={handleSeal}
        className="w-full"
      >
        Seal envelope &amp; send
      </Button>

      <p className="text-xs text-ink-muted text-center">
        Once sealed, your letter cannot be edited or recalled.
      </p>
    </div>
  );
}
