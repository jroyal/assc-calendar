import { nanoid } from "nanoid";
import { DateArray, Duration, formatDate, formatDuration } from "./format";

type ReturnObject = { error?: Error; value?: string };

interface ICSEvent {
  title: string;
  start: DateArray;
  duration: Duration;
  location: string;
}

const ICS_START = `\
BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:jroyal/assc-calendar
METHOD:PUBLISH
X-PUBLISHED-TTL:PT1H`;
const ICS_END = `END:VCALENDAR`;
const EVENT_START = "BEGIN:VEVENT";
const EVENT_END = "END:VEVENT";

export function createICS(events: ICSEvent[]): ReturnObject {
  if (events.length == 0) {
    return { error: new Error("no events passed") };
  }
  let cal = [ICS_START];
  for (let e of events) {
    cal.push(EVENT_START);
    cal.push(`UID:${nanoid()}`);
    cal.push(`SUMMARY:${e.title}`);
    cal.push(`DTSTAMP:${formatDate()}`);
    cal.push(`DTSTART:${formatDate(e.start)}`);
    cal.push(`LOCATION:${e.location}`);
    cal.push(`DURATION:${formatDuration(e.duration)}`);
    cal.push(EVENT_END);
  }
  cal.push(ICS_END);
  return { value: cal.join("\n") };
}
