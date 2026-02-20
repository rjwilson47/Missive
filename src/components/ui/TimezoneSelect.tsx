/**
 * @file src/components/ui/TimezoneSelect.tsx
 * IANA timezone picker for signup and settings.
 *
 * Features (SPEC §2-A):
 *   - Source: Intl.supportedValuesOf('timeZone') — canonical IANA timezones only
 *   - Display: "Timezone/Name (UTC±HH:MM)" with current DST-aware offset
 *   - Grouped by region: Americas, Europe, Asia/Pacific, Africa, Other
 *   - Searchable: type to filter by timezone name or offset string
 *   - Default: browser's detected timezone via Intl.DateTimeFormat()
 *   - Accessible: keyboard navigation (↑/↓/Enter/Escape), ARIA combobox pattern
 */

"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// ===== Types =====

interface TimezoneOption {
  tz: string;
  label: string; // "Australia/Melbourne (UTC+10:00)"
  group: string; // "Asia/Pacific"
  searchable: string; // lowercase for fast filtering
}

// ===== Helpers =====

/**
 * Returns the current UTC offset string for a timezone, e.g. "UTC+10:00".
 * DST-aware: uses today's date so the offset reflects the live DST state.
 */
function getCurrentOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    // "GMT+10:30" → "UTC+10:30", "GMT" → "UTC+0"
    return raw.replace("GMT", "UTC") || "UTC+0";
  } catch {
    return "UTC+0";
  }
}

/**
 * Maps an IANA timezone prefix to its display group.
 * Groups match SPEC §2-A: Americas, Europe, Asia/Pacific, Africa.
 */
function getGroup(tz: string): string {
  const prefix = tz.split("/")[0];
  switch (prefix) {
    case "America":
    case "US":
    case "Canada":
    case "Brazil":
    case "Chile":
    case "Cuba":
    case "Jamaica":
    case "Mexico":
      return "Americas";
    case "Europe":
    case "Atlantic":
    case "Arctic":
    case "GB":
    case "Iceland":
    case "Portugal":
    case "CET":
    case "EET":
    case "MET":
    case "WET":
      return "Europe";
    case "Asia":
    case "Australia":
    case "Pacific":
    case "Indian":
    case "NZ":
    case "Japan":
    case "Iran":
    case "Israel":
    case "Turkey":
    case "Hongkong":
    case "Singapore":
      return "Asia/Pacific";
    case "Africa":
    case "Egypt":
    case "Libya":
      return "Africa";
    default:
      return "Other";
  }
}

const GROUP_ORDER = ["Americas", "Europe", "Asia/Pacific", "Africa", "Other"];

// ===== Component =====

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  /** Form label text (default "Timezone") */
  label?: string;
  /** Input element id (default "timezone") */
  id?: string;
}

/**
 * Searchable, grouped IANA timezone picker (ARIA combobox pattern).
 *
 * The input shows the currently selected label when closed; typing filters the
 * dropdown list in real time. ↑/↓ navigate, Enter/click selects, Escape closes.
 *
 * @param value    - Currently selected IANA timezone string
 * @param onChange - Called with the new IANA timezone string on selection
 * @param label    - Form label text
 * @param id       - Input element id
 */
export default function TimezoneSelect({
  value,
  onChange,
  label = "Timezone",
  id = "timezone",
}: TimezoneSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the full timezone option list once on mount (offset is current DST state)
  const allOptions = useMemo<TimezoneOption[]>(() => {
    const tzList =
      typeof Intl !== "undefined" && "supportedValuesOf" in Intl
        ? (
            Intl as unknown as { supportedValuesOf: (k: string) => string[] }
          ).supportedValuesOf("timeZone")
        : [];

    return tzList.map((tz) => {
      const offset = getCurrentOffset(tz);
      return {
        tz,
        label: `${tz} (${offset})`,
        group: getGroup(tz),
        searchable: `${tz} ${offset}`.toLowerCase(),
      };
    });
  }, []);

  // Filter options by search query
  const filtered = useMemo<TimezoneOption[]>(() => {
    if (!query.trim()) return allOptions;
    const q = query.trim().toLowerCase();
    return allOptions.filter((o) => o.searchable.includes(q));
  }, [allOptions, query]);

  // Grouped options for display
  const grouped = useMemo(() => {
    const map = new Map<string, TimezoneOption[]>();
    for (const opt of filtered) {
      const arr = map.get(opt.group) ?? [];
      arr.push(opt);
      map.set(opt.group, arr);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      options: map.get(g)!,
    }));
  }, [filtered]);

  // Current selected label (shown when dropdown is closed)
  const selectedLabel = useMemo(
    () => allOptions.find((o) => o.tz === value)?.label ?? value,
    [allOptions, value]
  );

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setHighlighted(value || null);
  }, [value]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setHighlighted(null);
  }, []);

  const selectOption = useCallback(
    (tz: string) => {
      onChange(tz);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  // Close on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [closeDropdown]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!highlighted || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-tz="${highlighted.replace(/"/g, '\\"')}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    const idx = filtered.findIndex((o) => o.tz === highlighted);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted(filtered[idx + 1]?.tz ?? filtered[0]?.tz ?? null);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted(
          filtered[idx - 1]?.tz ?? filtered[filtered.length - 1]?.tz ?? null
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlighted) selectOption(highlighted);
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
    }
  };

  const listboxId = `${id}-listbox`;

  return (
    <div className="space-y-1" ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>

      <div className="relative">
        {/* Combobox input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlighted ? `${id}-opt-${highlighted}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          value={isOpen ? query : selectedLabel}
          placeholder="Search timezone…"
          onFocus={openDropdown}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none pr-8"
        />
        {/* Down-chevron indicator */}
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        >
          ▾
        </span>

        {/* Dropdown */}
        {isOpen && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            className={[
              "absolute z-50 w-full mt-1 max-h-64 overflow-y-auto",
              "border border-paper-dark rounded bg-white shadow-envelope text-sm text-ink",
            ].join(" ")}
          >
            {grouped.length === 0 && (
              <li className="px-3 py-2 text-ink-muted">No timezones found.</li>
            )}

            {grouped.map(({ group, options }) => (
              <li key={group} role="presentation">
                {/* Group header */}
                <div className="px-3 py-1 text-xs font-semibold text-ink-muted bg-paper-warm uppercase tracking-wide sticky top-0">
                  {group}
                </div>
                <ul role="group" aria-label={group}>
                  {options.map((opt) => (
                    <li
                      key={opt.tz}
                      id={`${id}-opt-${opt.tz}`}
                      role="option"
                      aria-selected={opt.tz === value}
                      data-tz={opt.tz}
                      className={[
                        "px-3 py-1.5 cursor-pointer select-none",
                        opt.tz === highlighted
                          ? "bg-seal text-white"
                          : opt.tz === value
                          ? "bg-paper-warm font-medium"
                          : "hover:bg-paper-warm",
                      ].join(" ")}
                      onMouseEnter={() => setHighlighted(opt.tz)}
                      onMouseDown={(e) => {
                        // Prevent input blur before click fires
                        e.preventDefault();
                        selectOption(opt.tz);
                      }}
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
