import { DateTime } from "luxon";

export type DateArray = number[];
export interface Duration {
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function getDateArray(date: string, time: string) {
  const now = DateTime.now().setZone("America/Chicago");
  if (date === "Tomorrow") {
    const tomorrow = now.plus({ days: 1 });
    date = `${tomorrow.weekdayLong}, ${tomorrow.monthLong} ${tomorrow.day}`;
  }
  
  // Try parsing with current year first
  let d = DateTime.fromFormat(`${date} ${now.year} ${time}`, "EEEE, MMMM d yyyy h:mm a", {
    zone: "America/Chicago",
  });
  
  // If that fails, try without year (original format)
  if (!d.isValid) {
    d = DateTime.fromFormat(`${date} ${time}`, "EEEE, MMMM d h:mm a", {
      zone: "America/Chicago",
    });
  }
  
  // If still invalid, try next year (for dates that might be in the future)
  if (!d.isValid) {
    const nextYear = now.plus({ year: 1 });
    d = DateTime.fromFormat(
      `${date} ${nextYear.year} ${time}`,
      "EEEE, MMMM d yyyy h:mm a",
      { zone: "America/Chicago" }
    );
  }
  
  // If still invalid, log the issue
  if (!d.isValid) {
    console.log(`Failed to parse date: "${date}" time: "${time}"`);
    console.log('Luxon parsing error:', d.invalidReason);
    // Fallback to current time
    d = now;
  }
  
  d = d.toUTC();
  return [d.year, d.month, d.day, d.hour, d.minute];
}

export function formatDate(args = [] as number[]) {
  if (Array.isArray(args) && args.length === 3) {
    const [year, month, date] = args;
    return `${year}${pad(month)}${pad(date)}`;
  }

  let outDate = new Date(new Date().setUTCSeconds(0, 0));
  if (Array.isArray(args) && args.length > 0 && args[0]) {
    const [year, month, date, hours = 0, minutes = 0, seconds = 0] = args;
    outDate = new Date(
      Date.UTC(year, month - 1, date, hours, minutes, seconds)
    );
  }

  return [
    outDate.getUTCFullYear(),
    pad(outDate.getUTCMonth() + 1),
    pad(outDate.getUTCDate()),
    "T",
    pad(outDate.getUTCHours()),
    pad(outDate.getUTCMinutes()),
    pad(outDate.getUTCSeconds()),
    "Z",
  ].join("");
}

export function formatDuration(attributes = {} as Duration) {
  const { weeks, days, hours, minutes, seconds } = attributes;

  let formattedDuration = "P";
  if (weeks) formattedDuration += `${weeks}W`;
  if (days) formattedDuration += `${days}D`;

  if (hours || minutes || seconds) {
    formattedDuration += "T";
    if (hours) formattedDuration += `${hours}H`;
    if (minutes) formattedDuration += `${minutes}M`;
    if (seconds) formattedDuration += `${seconds}S`;
  }

  return formattedDuration;
}
