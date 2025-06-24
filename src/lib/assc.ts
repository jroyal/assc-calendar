import setCookieParser from "set-cookie-parser";
import Scraper from "./scraper";
import { Env } from "..";

const SCHEDULE_URL = "https://austinssc.leaguelab.com/player/schedule";
const LOGIN_URL = "https://austinssc.leaguelab.com/login";

async function getLoginCreds(env: Env) {
  // Get the needed cookies and csrf token from the initial login page read
  let resp = await fetch(LOGIN_URL);
  let scraper = new Scraper({ resp });
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

export async function getSchedule(env: Env) {
  const loginCookies = await getLoginCreds(env);
  const headers = {
    cookie: loginCookies,
  };
  const resp = await fetch(SCHEDULE_URL, { headers });
  let scraper = new Scraper({ resp });
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
    if (matches.length === 0) {
      throw new Error("failed to find team info");
    }
    let info = matches[0];
    const team1 = info[1];
    const team2 = info[3];
    const teams = `${team1} vs ${team2}`;

    const timeAndLocationRegex = /(.* PM) (.*?) -|Full/gm;
    matches = [...parts[2].trim().matchAll(timeAndLocationRegex)];
    if (matches.length === 0) {
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
