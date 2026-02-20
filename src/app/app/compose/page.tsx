/**
 * @file src/app/app/compose/page.tsx
 * Compose a new letter (/app/compose).
 *
 * Multi-step flow:
 *   Step 1 — Address: enter recipient (username / email / phone / address / pen pal)
 *   Step 2 — Type: choose Typed | Handwritten | Voice (disabled)
 *   Step 3 — Write: LetterEditor (typed) or image upload (handwritten)
 *   Step 4 — Review: delivery estimate + "Seal envelope" confirmation
 *
 * Continuing a draft: ?draft=<uuid>&contentType=<TYPED|HANDWRITTEN> skips to step 3.
 */

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AddressStep from "@/components/compose/AddressStep";
import TypeStep from "@/components/compose/TypeStep";
import WriteStep from "@/components/compose/WriteStep";
import ReviewStep from "@/components/compose/ReviewStep";
import type { ContentType, AddressingInputType } from "@/types";

const TOKEN_KEY = "missive_token";

type Step = "address" | "type" | "write" | "review";
type AddressMode = AddressingInputType | "PEN_PAL_MATCH";

// Step indicator labels
const STEP_LABELS: Record<Step, string> = {
  address: "Address",
  type: "Type",
  write: "Write",
  review: "Review",
};

const STEP_ORDER: Step[] = ["address", "type", "write", "review"];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <ol className="flex items-center gap-1 text-xs text-ink-muted mb-6">
      {STEP_ORDER.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          {i > 0 && <span className="text-ink-faint">›</span>}
          <span
            className={
              i === currentIdx
                ? "text-ink font-medium"
                : i < currentIdx
                ? "text-ink-muted line-through"
                : "text-ink-faint"
            }
          >
            {STEP_LABELS[s]}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function ComposePage() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("address");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentType>("TYPED");
  const [addressMode, setAddressMode] = useState<AddressMode>("USERNAME");
  const [addressValue, setAddressValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Delivery estimate passed to ReviewStep (null = show generic "1-5 business days")
  const [scheduledDeliveryAt, setScheduledDeliveryAt] = useState<string | null>(null);
  // Pen pal eligibility — read from user's real opt-in setting (FIX-6)
  const [isPenPalEligible, setIsPenPalEligible] = useState(false);

  // Handle ?draft=UUID&contentType=TYPED — continue an existing draft
  useEffect(() => {
    const draftParam = searchParams.get("draft");
    const ctParam = searchParams.get("contentType") as ContentType | null;
    if (draftParam) {
      setDraftId(draftParam);
      if (ctParam) setContentType(ctParam);
      setStep("write");
    }
  }, [searchParams]);

  // Fetch the current user's pen pal opt-in setting (FIX-6).
  // AppShell already verified auth; this second call is lightweight and safe.
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";
    if (!token) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: { availableForPenPalMatching?: boolean }) => {
        if (data.availableForPenPalMatching) setIsPenPalEligible(true);
      })
      .catch(() => {
        // Fail silently — isPenPalEligible stays false, hiding the pen pal button
      });
  }, []);

  function handleAddressNext(type: AddressMode, value: string) {
    setAddressMode(type);
    setAddressValue(value);
    setStep("type");
  }

  async function handleTypeNext(type: ContentType) {
    setContentType(type);
    setIsCreating(true);
    setCreateError(null);

    const token =
      typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";

    try {
      const body: Record<string, unknown> = { contentType: type };

      if (addressMode === "PEN_PAL_MATCH") {
        body.addressingInputType = "PEN_PAL_MATCH";
      } else {
        body.addressingInputType = addressMode;
        body.addressingInputValue = addressValue;
      }

      const res = await fetch("/api/letters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setCreateError(data.error ?? "Failed to create draft. Please try again.");
        return;
      }

      const data = (await res.json()) as { id: string; scheduledDeliveryAt: string | null };
      setDraftId(data.id);
      setScheduledDeliveryAt(data.scheduledDeliveryAt ?? null);
      setStep("write");
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleWriteNext() {
    setStep("review");
  }

  // Show creation error on the type step if draft creation failed
  if (isCreating) {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-xl font-serif text-ink">Write a letter</h1>
        <p className="text-sm text-ink-muted">Creating your draft…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-serif text-ink mb-2">Write a letter</h1>
      <StepIndicator current={step} />

      {createError && (
        <div
          role="alert"
          className="mb-4 rounded border border-seal/40 bg-seal/10 px-4 py-3 text-sm text-seal"
        >
          {createError}
        </div>
      )}

      {step === "address" && (
        <AddressStep
          onNext={handleAddressNext}
          isPenPalEligible={isPenPalEligible}
        />
      )}

      {step === "type" && (
        <TypeStep onNext={handleTypeNext} />
      )}

      {step === "write" && draftId && (
        <WriteStep
          contentType={contentType}
          draftId={draftId}
          onNext={handleWriteNext}
        />
      )}

      {step === "review" && draftId && (
        <ReviewStep draftId={draftId} scheduledDeliveryAt={scheduledDeliveryAt} />
      )}
    </div>
  );
}
