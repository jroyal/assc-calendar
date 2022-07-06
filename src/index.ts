import ics from "ics";
import { DateTime } from "luxon";
import setCookieParser from "set-cookie-parser";
import Scraper from "./lib/scraper";

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  KV: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  ASSC_USERNAME: string;
  ASSC_PASSWORD: string;
}

const SCHEDULE_URL = "https://austinssc.leaguelab.com/player/schedule";
const LOGIN_URL = "https://austinssc.leaguelab.com/login";

async function getLoginCreds(env: Env) {
  // Get the needed cookies and csrf token from the initial login page read
  let resp = await fetch(LOGIN_URL);
  let scraper = await await new Scraper({ resp });
  let setCookieHeader = setCookieParser.splitCookiesString(
    resp.headers.get("set-cookie") || ""
  );

  let cookies = setCookieParser.parse(setCookieHeader!, {
    map: true,
  });
  let leaguelabtoken = cookies.leaguelabtoken.value;
  let leaguelabsession = cookies.leaguelabsession.value;

  const selector = 'input[name="reqToken"]';
  const reqToken = await scraper.querySelector(selector).getAttribute("value");

  // Actually send the login request and get the user cookie and updated session cookies
  const data = `reqToken=${reqToken}&cmd=processLogin&Username=${env.ASSC_USERNAME}&Password=${env.ASSC_PASSWORD}&RememberMe=1&sign+in=Log+In`;
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    cookie: `leaguelabsession=${leaguelabsession}; leaguelabtoken=${leaguelabtoken}`,
  };
  resp = await fetch(LOGIN_URL, {
    method: "POST",
    body: data,
    headers: headers,
    redirect: "manual",
  });
  setCookieHeader = setCookieParser.splitCookiesString(
    resp.headers.get("set-cookie") || ""
  );

  cookies = setCookieParser.parse(setCookieHeader!, {
    map: true,
  });

  // return the final cookie values
  return `leaguelabsession=${cookies.leaguelabsession.value}; leaguelabtoken=${cookies.leaguelabtoken.value}; leaguelabuser=${cookies.leaguelabuser.value}`;
}

async function getSchedule(env: Env, logincookies: string) {
  let input = (await env.KV.get("test-schedule-page", "text")) || "";
  let resp = new Response(input, {
    status: 200,
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
  let scraper = await new Scraper({ resp });
  //   const headers = {
  //     cookie: logincookies,
  //   };
  //   const resp = await fetch(SCHEDULE_URL, { headers });
  //   let scraper = await await new Scraper({ resp });
  const selector = ".myScheduleDate";
  const rawText = await scraper.querySelector(selector).getText({});
  let games = rawText[selector].map((rawgame: string) => {
    const parts = rawgame.split("&nbsp;");
    if (parts.length <= 2) {
      // "no information for this date yet"
      return;
    }

    const date = parts[0].trim();

    const teamRegex = /(.*?) (Visitor\s)?vs\. (.*?)(\sHome)?$/gm;
    let matches = [...parts[1].trim().matchAll(teamRegex)];
    if (matches.length < 0) {
      throw new Error("failed to find team info");
    }
    let info = matches[0];
    const team1 = info[1];
    const team2 = info[3];
    const teams = `${team1} vs ${team2}`;
    console.log(teams);

    const timeAndLocationRegex = /(.* PM) (.*) Full/gm;
    matches = [...parts[2].trim().matchAll(timeAndLocationRegex)];
    if (matches.length < 0) {
      throw new Error("failed to find time and location info");
    }
    info = matches[0];
    const time = info[1];
    const location = info[2];

    return {
      location,
      time,
      teams,
      date,
    };
  });
  return games.filter(Boolean);
}

async function getDateArray(date: string, time: string) {
  const now = DateTime.now().setZone("America/Chicago");
  if (date === "Tomorrow") {
    const tomorrow = now.plus({ days: 1 });
    date = `${tomorrow.weekdayLong}, ${tomorrow.monthLong} ${tomorrow.day}`;
  }
  let d = DateTime.fromFormat(`${date} ${time}`, "EEEE, MMMM d h:mm a");
  if (!d.isValid) {
    const nextYear = now.plus({ year: 1 });
    d = DateTime.fromFormat(
      `${date} ${nextYear.year} ${time}`,
      "EEEE, MMMM d, yyyy h:mm a"
    );
  }
  return [d.year, d.month, d.day, d.hour, d.minute];
}

async function createICal(games: any) {
  const { error, value } = ics.createEvents(
    games.map((game: any) => {
      return {
        title: games.teams,
        start: getDateArray(game.date, game.time),
        location: game.location,
        duration: { hours: 1 },
      };
    })
  );
  if (error) {
    console.log(error);
    return null;
  }
  return value;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      console.log("new request made");
      const url = new URL(request.url);
      if (url.pathname.includes("favicon")) {
        return new Response("fav icon");
      }
      // const creds = await getLoginCreds(env);
      // console.log(creds);
      const games = await getSchedule(env, "");
      const ical = await createICal(games);
      return new Response(ical);
    } catch (e) {
      return new Response("oh noes", { status: 500 });
    }
  },
};
