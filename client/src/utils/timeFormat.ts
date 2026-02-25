/**
 * Format extended time (e.g., "25:30") for display
 * Shows times >= 24:00 as regular time with (+1) indicator
 *
 * @example
 * formatDisplayTime("14:00") → "14:00"
 * formatDisplayTime("25:30") → "01:30 (+1)"
 * formatDisplayTime("27:00") → "03:00 (+1)"
 */
export function formatDisplayTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (hours >= 24) {
    const displayHours = (hours - 24).toString().padStart(2, '0');
    return `${displayHours}:${minutes.toString().padStart(2, '0')} (+1)`;
  }
  return time;
}

/**
 * Format a time range for display
 *
 * @example
 * formatTimeRange("14:00", "15:30") → "14:00 - 15:30"
 * formatTimeRange("23:00", "25:30") → "23:00 - 01:30 (+1)"
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatDisplayTime(startTime)} - ${formatDisplayTime(endTime)}`;
}

/**
 * Parse extended time to total minutes from midnight
 * Useful for calculations and comparisons
 *
 * @example
 * parseTimeToMinutes("14:30") → 870
 * parseTimeToMinutes("25:30") → 1530
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Generate hour options for time selects
 *
 * @param extended - If true, includes hours 24-29 for "next day" times
 */
export function getHourOptions(extended: boolean = false): { value: string; label: string }[] {
  const maxHour = extended ? 29 : 23;
  const options: { value: string; label: string }[] = [];

  for (let h = 0; h <= maxHour; h++) {
    const value = h.toString().padStart(2, '0');
    let label = value;
    if (h >= 24) {
      const displayHour = (h - 24).toString().padStart(2, '0');
      label = `${displayHour} (+1)`;
    }
    options.push({ value, label });
  }

  return options;
}

/**
 * Generate minute options (00, 15, 30, 45 or full 00-59)
 */
export function getMinuteOptions(quarterHourOnly: boolean = true): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const step = quarterHourOnly ? 15 : 1;

  for (let m = 0; m < 60; m += step) {
    const value = m.toString().padStart(2, '0');
    options.push({ value, label: value });
  }

  return options;
}
