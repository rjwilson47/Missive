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
 * Business-hours algorithm (per SPEC.md §6):
 *   - Convert sentAt to receiver's local time.
 *   - Walk forward hour by hour; only count hours that land on Mon–Fri.
 *   - Stop when 24 business hours have been counted → that's `earliest`.
 *   - Find the next 4:00 PM on a business day on or after `earliest`.
 *
 * @param sentAtUTC    - When the letter was sent (UTC Date)
 * @param receiverTimezone - IANA timezone string (e.g. "Australia/Melbourne")
 * @returns DeliverySchedule with both UTC timestamps
 *
 * @example
 * // Friday 5PM receiver local → earliest Monday 5PM → deliver Tuesday 4PM
 * computeScheduledDelivery(fridayAt5pmUTC, "America/New_York");
 *
 * @throws Error if receiverTimezone is not a valid IANA timezone
 *
 * TODO (Session 2): Implement this function.
 */
export function computeScheduledDelivery(
  sentAtUTC: Date,
  receiverTimezone: string
): DeliverySchedule {
  // TODO (Session 2): Implement full business-hours algorithm.
  // Critical test cases from SPEC:
  //   Friday 5pm  → earliest Monday 5pm   → deliver Tuesday 4pm
  //   Saturday    → earliest Tuesday (same local time) → Tuesday 4pm
  //   Thursday 3pm → earliest Friday 3pm  → deliver Friday 4pm
  //   Monday 3pm  → earliest Tuesday 3pm  → deliver Tuesday 4pm
  // Stub: return same-day 4pm as placeholder — WRONG, replace in Session 2
  const sentLocal = DateTime.fromJSDate(sentAtUTC, { zone: receiverTimezone });
  const placeholder = sentLocal.set({ hour: DELIVERY_HOUR, minute: 0, second: 0, millisecond: 0 });
  return {
    earliestDeliveryUtc: sentAtUTC,
    scheduledDeliveryUtc: placeholder.toUTC().toJSDate(),
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
