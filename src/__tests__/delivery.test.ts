/**
 * @file src/__tests__/delivery.test.ts
 * Unit tests for computeScheduledDelivery() from lib/delivery.ts.
 *
 * All "business day" tests use UTC as the receiver timezone to eliminate
 * DST ambiguity from the fixture setup. DST tests use America/New_York
 * with dates that straddle real DST transitions.
 *
 * Reference week used in non-DST tests:
 *   Mon 2024-02-05, Tue 2024-02-06, Wed 2024-02-07
 *   Thu 2024-02-08, Fri 2024-02-09, Sat 2024-02-10
 *   Mon 2024-02-12, Tue 2024-02-13, Wed 2024-02-14
 *
 * Critical test cases per SPEC §12:
 *   Monday 5pm   → earliest Tue 5pm  → Wednesday 4pm
 *   Monday 3pm   → earliest Tue 3pm  → Tuesday 4pm
 *   Friday 5pm   → earliest Mon 5pm  → Tuesday 4pm  (skip weekend)
 *   Thursday 4pm → earliest Fri 4pm  → Friday 4pm   (exactly at 4pm boundary)
 *   Saturday 10am → earliest Tue 10am → Tuesday 4pm (weekend fast-forward)
 */

import { DateTime } from "luxon";
import { computeScheduledDelivery } from "@/lib/delivery";

// ===== Test Helpers =====

/**
 * Builds a UTC JS Date from a local date/time in a given IANA timezone.
 * Use this to create `sentAtUTC` fixtures from human-readable local times.
 *
 * @param year   - Full year (e.g. 2024)
 * @param month  - Month (1-12)
 * @param day    - Day of month
 * @param hour   - Local hour (0-23)
 * @param minute - Local minute (0-59)
 * @param tz     - IANA timezone (e.g. "UTC", "America/New_York")
 */
function fromLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string
): Date {
  return DateTime.fromObject(
    { year, month, day, hour, minute, second: 0, millisecond: 0 },
    { zone: tz }
  )
    .toUTC()
    .toJSDate();
}

/**
 * Converts a UTC Date to a human-readable object in the given IANA timezone.
 * Used in assertions to compare expected delivery times.
 */
function toLocalParts(
  utcDate: Date,
  tz: string
): { year: number; month: number; day: number; hour: number; minute: number; weekdayName: string } {
  const dt = DateTime.fromJSDate(utcDate, { zone: tz });
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour: dt.hour,
    minute: dt.minute,
    weekdayName: dt.weekdayLong ?? "",
  };
}

// ===== Tests =====

describe("computeScheduledDelivery", () => {
  // Receiver timezone: UTC (no DST) for all business-day logic tests
  const TZ = "UTC";

  it("Monday 5pm → earliest Tuesday 5pm → deliver Wednesday 4pm", () => {
    // Mon 2024-02-05 17:00 UTC
    const sentAt = fromLocal(2024, 2, 5, 17, 0, TZ);
    const result = computeScheduledDelivery(sentAt, TZ);

    // Earliest: walk 7h Mon(5-11pm) + skip Tue midnight doesn't apply (Tue is business day)
    // Mon 5pm→11pm = 7 counted; then Tue 12am→4pm = 17 more = 24 total → earliest = Tue 5pm
    const expected = fromLocal(2024, 2, 7, 16, 0, TZ); // Wed 2024-02-07 16:00
    expect(result.scheduledDeliveryUtc.getTime()).toBe(expected.getTime());

    // Also verify the day is Wednesday
    const parts = toLocalParts(result.scheduledDeliveryUtc, TZ);
    expect(parts.weekdayName).toBe("Wednesday");
    expect(parts.hour).toBe(16);
    expect(parts.minute).toBe(0);
  });

  it("Monday 3pm → earliest Tuesday 3pm → deliver Tuesday 4pm", () => {
    // Mon 2024-02-05 15:00 UTC
    const sentAt = fromLocal(2024, 2, 5, 15, 0, TZ);
    const result = computeScheduledDelivery(sentAt, TZ);

    // Mon 3pm→11pm = 9 counted; Tue 12am→2pm = 15 more = 24 total → earliest = Tue 3pm
    // Next 4pm on/after Tue 3pm → Tue 4pm (same day, business day)
    const expected = fromLocal(2024, 2, 6, 16, 0, TZ); // Tue 2024-02-06 16:00
    expect(result.scheduledDeliveryUtc.getTime()).toBe(expected.getTime());

    const parts = toLocalParts(result.scheduledDeliveryUtc, TZ);
    expect(parts.weekdayName).toBe("Tuesday");
    expect(parts.hour).toBe(16);
  });

  it("Friday 5pm → earliest Monday 5pm → deliver Tuesday 4pm", () => {
    // Fri 2024-02-09 17:00 UTC
    const sentAt = fromLocal(2024, 2, 9, 17, 0, TZ);
    const result = computeScheduledDelivery(sentAt, TZ);

    // Fri 5pm→11pm = 7 counted (Fri is a business day);
    // skip Sat + Sun (48h not counted);
    // Mon 12am→4pm = 17 more = 24 total → earliest = Mon 5pm
    // Next 4pm on/after Mon 5pm: Mon 4pm < Mon 5pm → use Tue 4pm (business day)
    const expected = fromLocal(2024, 2, 13, 16, 0, TZ); // Tue 2024-02-13 16:00
    expect(result.scheduledDeliveryUtc.getTime()).toBe(expected.getTime());

    const parts = toLocalParts(result.scheduledDeliveryUtc, TZ);
    expect(parts.weekdayName).toBe("Tuesday");
    expect(parts.hour).toBe(16);
  });

  it("Thursday 4pm → earliest Friday 4pm → deliver Friday 4pm", () => {
    // Thu 2024-02-08 16:00 UTC
    const sentAt = fromLocal(2024, 2, 8, 16, 0, TZ);
    const result = computeScheduledDelivery(sentAt, TZ);

    // Thu 4pm→11pm = 8 counted; Fri 12am→3pm = 16 more = 24 total → earliest = Fri 4pm
    // Next 4pm on/after Fri 4pm: Fri 4pm = Fri 4pm exactly → same-day (business day)
    const expected = fromLocal(2024, 2, 9, 16, 0, TZ); // Fri 2024-02-09 16:00
    expect(result.scheduledDeliveryUtc.getTime()).toBe(expected.getTime());

    const parts = toLocalParts(result.scheduledDeliveryUtc, TZ);
    expect(parts.weekdayName).toBe("Friday");
    expect(parts.hour).toBe(16);
  });

  it("Saturday 10am → earliest Tuesday 10am → deliver Tuesday 4pm", () => {
    // Sat 2024-02-10 10:00 UTC
    const sentAt = fromLocal(2024, 2, 10, 10, 0, TZ);
    const result = computeScheduledDelivery(sentAt, TZ);

    // Weekend fast-forward: Sat 10am → Mon 10am (same local time, +2 days)
    // Mon 10am→11pm = 14 counted; Tue 12am→9am = 10 more = 24 total → earliest = Tue 10am
    // Next 4pm on/after Tue 10am: Tue 4pm (same day, business day)
    const expected = fromLocal(2024, 2, 13, 16, 0, TZ); // Tue 2024-02-13 16:00
    expect(result.scheduledDeliveryUtc.getTime()).toBe(expected.getTime());

    const parts = toLocalParts(result.scheduledDeliveryUtc, TZ);
    expect(parts.weekdayName).toBe("Tuesday");
    expect(parts.hour).toBe(16);
  });

  it("Sunday 2pm → earliest Tuesday 2pm → deliver Tuesday 4pm", () => {
    // Sun 2024-02-11 14:00 UTC
    const sentAt = fromLocal(2024, 2, 11, 14, 0, TZ);
    const result = computeScheduledDelivery(sentAt, TZ);

    // Weekend fast-forward: Sun 2pm → Mon 2pm (+1 day)
    // Mon 2pm→11pm = 10 counted; Tue 12am→3pm = 14 more = 24 total → earliest = Tue 2pm
    // Next 4pm on/after Tue 2pm: Tue 4pm
    const expected = fromLocal(2024, 2, 13, 16, 0, TZ); // Tue 2024-02-13 16:00
    expect(result.scheduledDeliveryUtc.getTime()).toBe(expected.getTime());

    const parts = toLocalParts(result.scheduledDeliveryUtc, TZ);
    expect(parts.weekdayName).toBe("Tuesday");
    expect(parts.hour).toBe(16);
  });

  it("handles DST spring-forward correctly (America/New_York, 2024-03-10)", () => {
    const NY = "America/New_York";

    // Send on Friday 2024-03-08 at 5pm EST (UTC-5) = UTC 22:00
    // DST springs forward on 2024-03-10 (Sunday) at 02:00 → 03:00 EST→EDT
    // Earliest = Mon 2024-03-11 5pm EDT (Luxon handles DST in plus({hours}))
    // Scheduled = Tue 2024-03-12 4pm EDT
    const sentAt = fromLocal(2024, 3, 8, 17, 0, NY);

    // Should not throw
    let result: ReturnType<typeof computeScheduledDelivery> | undefined;
    expect(() => {
      result = computeScheduledDelivery(sentAt, NY);
    }).not.toThrow();

    // Result must be a valid future date (after sentAt)
    expect(result!.scheduledDeliveryUtc.getTime()).toBeGreaterThan(sentAt.getTime());

    // Delivery must be at 4pm in NY timezone
    const parts = toLocalParts(result!.scheduledDeliveryUtc, NY);
    expect(parts.hour).toBe(16);
    expect(parts.minute).toBe(0);

    // Must be a weekday (Mon-Fri); weekday 1=Mon, 5=Fri
    const weekday = DateTime.fromJSDate(result!.scheduledDeliveryUtc, { zone: NY }).weekday;
    expect(weekday).toBeGreaterThanOrEqual(1);
    expect(weekday).toBeLessThanOrEqual(5);
  });

  it("handles DST fall-back correctly (America/New_York, 2024-11-03)", () => {
    const NY = "America/New_York";

    // Send on Friday 2024-11-01 at 5pm EDT (UTC-4) = UTC 21:00
    // DST falls back on 2024-11-03 (Sunday) at 02:00 → 01:00 EDT→EST
    // Earliest = Mon 2024-11-04 5pm EST (Luxon handles DST in plus({hours}))
    // Scheduled = Tue 2024-11-05 4pm EST
    const sentAt = fromLocal(2024, 11, 1, 17, 0, NY);

    let result: ReturnType<typeof computeScheduledDelivery> | undefined;
    expect(() => {
      result = computeScheduledDelivery(sentAt, NY);
    }).not.toThrow();

    expect(result!.scheduledDeliveryUtc.getTime()).toBeGreaterThan(sentAt.getTime());

    const parts = toLocalParts(result!.scheduledDeliveryUtc, NY);
    expect(parts.hour).toBe(16);
    expect(parts.minute).toBe(0);

    const weekday = DateTime.fromJSDate(result!.scheduledDeliveryUtc, { zone: NY }).weekday;
    expect(weekday).toBeGreaterThanOrEqual(1);
    expect(weekday).toBeLessThanOrEqual(5);
  });

  it("throws on invalid IANA timezone", () => {
    const sentAt = fromLocal(2024, 2, 5, 12, 0, "UTC");
    expect(() => computeScheduledDelivery(sentAt, "Not/ATimezone")).toThrow(
      /Invalid IANA timezone/
    );
  });

  it("scheduledDeliveryUtc is always at exactly 4:00:00.000 UTC equivalent", () => {
    // Monday 9am send → should deliver Tue 4pm. Verify seconds and ms are zeroed.
    const sentAt = fromLocal(2024, 2, 5, 9, 0, TZ);
    const result = computeScheduledDelivery(sentAt, TZ);
    const dt = DateTime.fromJSDate(result.scheduledDeliveryUtc, { zone: TZ });
    expect(dt.second).toBe(0);
    expect(dt.millisecond).toBe(0);
  });
});
