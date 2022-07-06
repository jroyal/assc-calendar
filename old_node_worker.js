import fetch from "node-fetch";
import * as cheerio from "cheerio";
import ics from "ics";
import { DateTime } from "luxon";

const SCHEDULE_URL = "https://austinssc.leaguelab.com/player/schedule";

async function getSchedule() {
  const cookies =
    "leaguelabsession=671e3dbcf0c7de8f9da94d0f6c0e4cca; leaguelabuser=6f4f2f97711efd4c9cbb70185bb50046_2b56029fcad0f1962533a815d3a8811f_jroyal; leaguelabtoken=b02bc26e497a13fae0c30862f614ff6a";
  const resp = await fetch(SCHEDULE_URL, { headers: { cookie: cookies } });
  console.log(resp.status);
  return resp.text();
}

function processSchedule(rawSchedule) {
  const $ = cheerio.load(rawSchedule);
  const allDates = $(".myScheduleDate");

  const games = [];
  allDates.each((i, elem) => {
    const date = $(elem).find("h2").text();
    const location = $(elem).find(".location a").text();
    const field = $(elem).find(".myScheduleField").text();
    const time = $(elem).find(".time").text();
    const myTeam = $(elem).find(".myteam").text();
    const opponent = $(elem).find(".opponent").text();
    games.push({
      date,
      location,
      field,
      time,
      myTeam,
      opponent,
    });
  });

  // filter out all the games that do not yet have a time
  return games.filter((elem) => elem.time);
}

function getDateArray(date, time) {
  const now = DateTime.now().setZone("America/Chicago");
  if (date === "Tomorrow") {
    const tomorrow = now.plus({ days: 1 });
    date = `${tomorrow.weekdayLong}, ${tomorrow.monthLong} ${tomorrow.day}`;
  }
  console.log(date);
  let d = DateTime.fromFormat(`${date} ${time}`, "EEEE, MMMM d h:mm a");
  if (d.invalid) {
    const nextYear = now.plus({ year: 1 });
    d = DateTime.fromFormat(
      `${date} ${nextYear.year} ${time}`,
      "EEEE, MMMM d, yyyy h:mm a"
    );
  }
  return [d.year, d.month, d.day, d.hour, d.minute];
}

function createICal(games) {
  const { error, value } = ics.createEvents(
    games.map((game) => {
      return {
        title: `${game.myTeam} vs ${game.opponent}`,
        start: getDateArray(game.date, game.time),
        location: game.location,
        duration: { hours: 1 },
        description: game.field,
      };
    })
  );
  if (error) {
    console.log(error);
    return null;
  }

  return value;
}

async function main() {
  const rawSchedule = await getSchedule();
  console.log(rawSchedule);
  // const rawSchedule = getHTMLFromFile();
  const games = processSchedule(rawSchedule);
  const calfeed = createICal(games);
  console.log(calfeed);
  if (calfeed) {
    try {
      fs.writeFileSync("assc_schedule.ics", calfeed);
      //file written successfully
    } catch (err) {
      console.error(err);
    }
  }
}

await main();
