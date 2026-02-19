/**
 * @file src/__tests__/delivery.test.ts
 * Unit tests for computeScheduledDelivery() from lib/delivery.ts.
 *
 * Critical test cases per SPEC §12:
 *   Monday 5pm   → Wednesday 4pm
 *   Monday 3pm   → Tuesday 4pm
 *   Friday 5pm   → Tuesday 4pm  (skip weekend)
 *   Thursday 4pm → Friday 4pm   (exactly 24h = same 4pm)
 *   Saturday 10am → Tuesday 4pm
 *
 * TODO (Session 2): Implement tests once computeScheduledDelivery() is done.
 */

import { computeScheduledDelivery } from "@/lib/delivery";

describe("computeScheduledDelivery", () => {
  // Helper: build a UTC Date from a local time in a given timezone
  // We use fixed dates to avoid DST ambiguity in the test setup itself.

  // TODO (Session 2): implement these tests

  it.todo("Monday 5pm receiver TZ → earliest Tuesday 5pm → deliver Wednesday 4pm");
  it.todo("Monday 3pm receiver TZ → earliest Tuesday 3pm → deliver Tuesday 4pm");
  it.todo("Friday 5pm receiver TZ → earliest Monday 5pm → deliver Tuesday 4pm");
  it.todo("Thursday 4pm receiver TZ → earliest Friday 4pm → deliver Friday 4pm");
  it.todo("Saturday 10am receiver TZ → earliest Tuesday 10am → deliver Tuesday 4pm");
  it.todo("Handles DST spring-forward correctly (Luxon handles automatically)");
  it.todo("Handles DST fall-back correctly (Luxon handles automatically)");

  // Placeholder assertion so the test file is valid before implementation
  it("exports computeScheduledDelivery function", () => {
    expect(typeof computeScheduledDelivery).toBe("function");
  });
});
