/**
 * @file src/lib/delivery.ts
 * Delivery scheduling logic for Missive.
 *
 * Core function: computeScheduledDelivery(sentAtUTC, receiverTimezone)
 * Implements the "24 business hours + next 4PM" rule:
 *   1. Count 24 clock hours that fall on Mon–Fri in the receiver's timezone.
 *   2. The result is `earliestDelivery`.
 *   3. The actual delivery is the next 4:00 PM in the receiver's timezone on
 *      or after `earliestDelivery`, on a business day (Mon–Fri).
 *
 * All timezone math uses Luxon for correctness across DST transitions.
 *
 * TODO (Session 2): Implement fully.
 * See SPEC.md §6 for detailed business hours algorithm and test cases.
 */

import { DateTime } from "luxon";

// ===== Types =====

/**
 * Result of the delivery computation.
 */
export interface DeliverySchedule {
  /** Earliest possible delivery moment (UTC), after 24 business hours */
  earliestDeliveryUtc: Date;
  /** Actual scheduled delivery: next 4PM on a business day ≥ earliest (UTC) */
  scheduledDeliveryUtc: Date;
}

// ===== Constants =====

/** Target delivery hour in the receiver's local timezone (4:00 PM) */
const DELIVERY_HOUR = 16;

// ===== Helpers =====

/**
 * Returns true if the given Luxon DateTime falls on a business day (Mon–Fri).
 *
 * @param dt - A Luxon DateTime (timezone should already be set correctly)
 */
function isBusinessDay(dt: DateTime): boolean {
  // Luxon weekday: 1=Monday, 7=Sunday
  return dt.weekday >= 1 && dt.weekday <= 5;
}

// ===== Main =====

/**
 * Computes the scheduled delivery time for a letter.
 *
 * Two-phase algorithm (per SPEC.md §6):
 *
 * PHASE 1 — Earliest delivery (24 business hours):
 *   Walk forward through time in the receiver's timezone, hour by hour,
 *   counting only hours that fall on Mon–Fri. Stop after 24 counted hours.
 *
 *   Special case: if the letter is sent on a weekend, start counting from
 *   the following Monday at the same local wall-clock time (not from
 *   Sunday/Saturday midnight). This matches the SPEC equivalence rule:
 *   "if sent on weekend, start counting from next business day same local time."
 *
 * PHASE 2 — Scheduled delivery (next 4:00 PM on a business day):
 *   - If earliest is before or at 4:00 PM on a business day → same-day 4 PM.
 *   - If earliest is after 4:00 PM, or earliest falls on a weekend →
 *     advance to the next 4:00 PM on a business day (skipping weekends).
 *
 * All calculations use Luxon for DST correctness. `plus({ days: N })` on a
 * named-timezone DateTime preserves wall-clock time (adjusting UTC offset
 * for DST automatically). `plus({ hours: N })` adds elapsed clock time.
 *
 * @param sentAtUTC        - When the letter was sent (UTC JS Date)
 * @param receiverTimezone - IANA timezone of the recipient (e.g. "Australia/Melbourne")
 * @returns DeliverySchedule containing earliestDeliveryUtc and scheduledDeliveryUtc
 *
 * @throws Error if receiverTimezone is not a recognised IANA timezone
 *
 * @example
 * // Friday 5 PM receiver TZ → earliest Monday 5 PM → deliver Tuesday 4 PM
 * computeScheduledDelivery(fridayAt5pmUTC, "America/New_York");
 */
export function computeScheduledDelivery(
  sentAtUTC: Date,
  receiverTimezone: string
): DeliverySchedule {
  // ===== Validate timezone =====
  if (!isValidIanaTimezone(receiverTimezone)) {
    throw new Error(`Invalid IANA timezone: "${receiverTimezone}"`);
  }

  // ===== Phase 1: Compute earliest delivery (24 business hours) =====

  // Convert sent time to the receiver's local timezone for all calculations.
  let current = DateTime.fromJSDate(sentAtUTC, { zone: receiverTimezone });

  // Weekend fast-forward: if sent on Sat or Sun, jump to Monday at the same
  // local wall-clock time. Luxon's plus({ days: N }) on a named-timezone DateTime
  // preserves local HH:MM, adjusting the UTC offset automatically for DST.
  if (!isBusinessDay(current)) {
    // Saturday (weekday=6) → +2 days → Monday
    // Sunday  (weekday=7) → +1 day  → Monday
    const daysToMonday = current.weekday === 6 ? 2 : 1;
    current = current.plus({ days: daysToMonday });
  }

  // Walk hour by hour; count only hours falling on Mon–Fri.
  // "plus({ hours: 1 })" adds 60 minutes of elapsed time (correct across DST).
  let hoursCounted = 0;
  while (hoursCounted < 24) {
    if (isBusinessDay(current)) {
      hoursCounted++;
    }
    current = current.plus({ hours: 1 });
  }

  // After the loop, `current` is one hour past the 24th counted hour —
  // that is the earliest possible delivery moment in the receiver's TZ.
  const earliestLocal = current;
  const earliestDeliveryUtc = earliestLocal.toUTC().toJSDate();

  // ===== Phase 2: Find next 4:00 PM on a business day (≥ earliest) =====

  // Try 4 PM on the same calendar day as earliest.
  const sameDayAt4pm = earliestLocal.set({
    hour: DELIVERY_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  let scheduled: DateTime;

  if (sameDayAt4pm >= earliestLocal) {
    // Same-day 4 PM is on/after earliest → use it as the candidate.
    scheduled = sameDayAt4pm;
  } else {
    // Earliest is past 4 PM (or exactly at 4 PM but with remaining ms) →
    // schedule for the next calendar day's 4 PM.
    scheduled = earliestLocal
      .plus({ days: 1 })
      .set({ hour: DELIVERY_HOUR, minute: 0, second: 0, millisecond: 0 });
  }

  // If the candidate 4 PM falls on a weekend, keep advancing day by day
  // until we land on a business day (e.g. Sat 4 PM → Sun 4 PM → Mon 4 PM).
  while (!isBusinessDay(scheduled)) {
    scheduled = scheduled.plus({ days: 1 });
  }

  return {
    earliestDeliveryUtc,
    scheduledDeliveryUtc: scheduled.toUTC().toJSDate(),
  };
}

/**
 * Checks whether a given IANA timezone string is valid.
 *
 * @param tz - IANA timezone string to validate (e.g. "Australia/Melbourne")
 * @returns true if valid, false otherwise
 */
export function isValidIanaTimezone(tz: string): boolean {
  return DateTime.local().setZone(tz).isValid;
}
