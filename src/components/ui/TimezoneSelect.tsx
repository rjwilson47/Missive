/**
 * @file src/components/ui/TimezoneSelect.tsx
 * IANA timezone picker for signup and settings.
 *
 * Requirements per SPEC §2-A:
 *   - Display format: "City/Region (UTC±X)" e.g. "Australia/Melbourne (UTC+10)"
 *   - Grouped by continent: Americas, Europe, Asia/Pacific, Africa, Middle East
 *   - Searchable/filterable (autocomplete)
 *   - Default: user's browser timezone (Intl.DateTimeFormat().resolvedOptions().timeZone)
 *   - Source: Intl.supportedValuesOf('timeZone') (canonical IANA timezones only)
 *   - DST-aware offset labels (show current offset, not standard)
 *
 * TODO (Session 1): Implement — needed for signup page.
 */

"use client";

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  /** Optional label for the input (defaults to "Timezone") */
  label?: string;
  id?: string;
}

// TODO (Session 1): implement full timezone grouping, offset display, autocomplete
export default function TimezoneSelect({ value, onChange, label = "Timezone", id = "timezone" }: TimezoneSelectProps) {
  // Minimal implementation: native <select> with all IANA timezones
  // V2: replace with grouped autocomplete dropdown
  const timezones = typeof Intl !== "undefined" && "supportedValuesOf" in Intl
    ? (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone")
    : [];

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
        aria-label={label}
      >
        <option value="" disabled>
          Select timezone…
        </option>
        {timezones.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
      {/* TODO (Session 1): add current UTC offset suffix, grouping, and search filter */}
    </div>
  );
}
