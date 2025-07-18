import { Hono } from "hono";
import { getSchedule } from "./lib/assc";
import { createICS } from "./lib/ics";
import { getDateArray } from "./lib/format";
import { BrowserWorker } from "@cloudflare/puppeteer";
import { fetchUrl } from "./lib/browser";

export interface Env {
  KV: KVNamespace;
  ASSC_USERNAME: string;
  ASSC_PASSWORD: string;
  MYBROWSER: BrowserWorker;
}

async function createICal(games: any) {
  const { error, value } = createICS(
    games.map((game: any) => {
      return {
        title: game.teams,
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

function generateKey(env: Env) {
  return `ics_${env.ASSC_USERNAME.toLowerCase()}`;
}

export async function generateICS(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  console.log(`generating ics`, new Date());
  try {
    const games = await getSchedule(env);
    const ical = await createICal(games);
    if (!ical) {
      throw new Error("could not generate an ical feed");
    }
    await env.KV.put(generateKey(env), ical);
    return new Response(ical);
  } catch (e) {
    console.log(`something went wrong ${e}`);
    return new Response(`something went wrong ${e}`, { status: 500 });
  }
}

async function getScheduleICS(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const cal = await env.KV.get(generateKey(env), "text");
  if (cal) {
    return new Response(cal);
  }
  return new Response("failed to find calendar", { status: 404 });
}

const app = new Hono<{ Bindings: Env }>();

app.get("/schedule", async (c) => {
  return getScheduleICS(c.req.raw, c.env, c.executionCtx);
});

app.get("/generate", async (c) => {
  return generateICS(c.req.raw, c.env, c.executionCtx);
});

app.get("/test", async (c) => {
  try {
    return fetchUrl(c.env, "https://austinssc.leaguelab.com/login");
  } catch (e) {
    console.error("Error fetching URL:", e);
    return new Response("Error fetching URL", { status: 500 });
  }
});

app.all("*", (c) => c.text("/generate to update feed"));

export default {
  fetch: app.fetch,
  scheduled: generateICS,
};
