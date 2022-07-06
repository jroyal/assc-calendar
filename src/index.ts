import { Router } from "itty-router";
import { getSchedule } from "./lib/assc";
import { createICS } from "./lib/ics";
import { getDateArray } from "./lib/format";

export interface Env {
  KV: KVNamespace;
  ASSC_USERNAME: string;
  ASSC_PASSWORD: string;
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

async function generateICS(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  console.log("generating ics", new Date());
  try {
    const url = new URL(request.url);
    if (url.pathname.includes("favicon")) {
      return new Response("fav icon");
    }
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

const router = Router();
router.get("/schedule", getScheduleICS);
router.get("/generate", generateICS);
router.get("*", (request, env, context) => {
  return new Response("/generate to update feed");
});

// alternative advanced/manual approach for downstream control
export default {
  fetch: (...args: any[]) =>
    router
      // @ts-ignore
      .handle(...args)
      .then((response) => {
        return response;
      })
      .catch((err) => {}),
};
