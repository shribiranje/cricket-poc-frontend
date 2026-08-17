/**
 * Timezone helpers (no external library).
 *
 * Convention: the API always speaks UTC ISO strings ('...Z'). A match also
 * carries the IANA `timezone` the admin scheduled it in, purely for display.
 * Regular users see times in their own browser zone via Angular's date pipe.
 */

export function browserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    return RENAMED_ZONES[tz] || tz;
  } catch {
    return 'UTC';
  }
}

/**
 * Some engines (Chrome/ICU) still report legacy IANA aliases — most notably
 * Asia/Calcutta instead of Asia/Kolkata. Both are valid inputs to every Intl
 * API, but users search for the modern names, so normalize for display.
 */
const RENAMED_ZONES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Dacca': 'Asia/Dhaka',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Godthab': 'America/Nuuk',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Truk': 'Pacific/Chuuk',
};

/** True if Intl accepts the zone name (covers aliases not present in the list). */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const FALLBACK_ZONES = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Europe/London', 'Europe/Paris', 'Africa/Johannesburg',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Pacific/Auckland',
];

/** All IANA zones the browser knows (modern names, deduped, sorted), or a fallback list. */
export function listTimeZones(): string[] {
  const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  let zones: string[] = FALLBACK_ZONES;
  if (typeof anyIntl.supportedValuesOf === 'function') {
    try {
      const raw = anyIntl.supportedValuesOf('timeZone');
      if (raw?.length) zones = raw;
    } catch { /* fall through */ }
  }
  const normalized = new Set<string>(zones.map((z) => RENAMED_ZONES[z] || z));
  // Make sure the well-known ones are present even on sparse engines
  FALLBACK_ZONES.forEach((z) => normalized.add(z));
  return [...normalized].sort();
}

/**
 * Offset of `timeZone` (ms east of UTC) at a given instant, computed WITHOUT
 * any dependency on the runtime's local zone. We format the instant into the
 * target zone's wall clock, read it back as if it were UTC, and diff. This
 * avoids `new Date(string)` local parsing, which is what made the old
 * conversion give different answers in different browsers.
 */
function tzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') m[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(m['year'], m['month'] - 1, m['day'], m['hour'], m['minute'], m['second']);
  return asUtc - date.getTime();
}

/**
 * Interpret 'YYYY-MM-DDTHH:mm' as wall time in `timeZone` and return the
 * equivalent UTC instant as an ISO string. Independent of the browser's own
 * timezone, and DST-safe (a second pass corrects the offset at transitions).
 */
export function wallTimeToUtcIso(local: string, timeZone: string): string {
  const [datePart, timePart] = local.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = (timePart || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi); // treat the wall time as UTC first
  let offset = tzOffsetMs(timeZone, new Date(guess));
  let utc = guess - offset;
  // Near a DST boundary the offset at the guess and at the true instant can
  // differ — one refinement pass settles it.
  const offset2 = tzOffsetMs(timeZone, new Date(utc));
  if (offset2 !== offset) utc = guess - offset2;
  return new Date(utc).toISOString();
}

/** UTC ISO -> 'YYYY-MM-DDTHH:mm' wall time in `timeZone` (prefills datetime-local). */
export function utcIsoToWallTime(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  let hour = get('hour');
  if (hour === '24') hour = '00'; // some engines render midnight as 24
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** Pretty-print a UTC ISO instant in a specific zone, e.g. "13 Jul, 7:30 pm". */
export function formatInTz(iso: string, timeZone: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      timeZone, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}
