import puppeteer from "@cloudflare/puppeteer";
import { Env } from "../index";

interface GameData {
  date: string;
  time: string;
  teams: string;
  location: string;
}

function parseScheduleHTML(html: string): GameData[] {
  const games: GameData[] = [];
  
  // The issue is nested divs aren't handled properly by simple regex
  // Let's use a manual parsing approach to find myScheduleDate divs
  let pos = 0;
  
  while (true) {
    // Find the next myScheduleDate div
    const startPattern = /<div[^>]*class="[^"]*myScheduleDate[^"]*"[^>]*>/;
    const startMatch = html.substring(pos).match(startPattern);
    
    if (!startMatch) break;
    
    const startIndex = pos + startMatch.index!;
    const openTagEnd = startIndex + startMatch[0].length;
    
    // Find the matching closing div using proper depth counting
    let depth = 1;
    let currentPos = openTagEnd;
    let content = '';
    
    while (depth > 0 && currentPos < html.length) {
      const char = html[currentPos];
      
      if (char === '<') {
        // Look ahead to see if this is a div tag
        const remaining = html.substring(currentPos);
        if (remaining.startsWith('<div')) {
          depth++;
        } else if (remaining.startsWith('</div>')) {
          depth--;
        }
      }
      
      if (depth > 0) {
        content += char;
      }
      
      currentPos++;
    }
    
    // Move position for next search
    pos = currentPos;
    
    // Skip if this doesn't contain actual games (just unscheduled teams)
    if (!content.includes('<div class="vs">vs.</div>')) {
      continue;
    }
    
    // Extract date from h2 tag
    const dateMatch = content.match(/<h2[^>]*>(.*?)<\/h2>/);
    if (!dateMatch) continue;
    const date = dateMatch[1].trim();
    
    // Find team information
    const myTeamMatch = content.match(/<a[^>]*class="[^"]*myteam[^"]*"[^>]*>([^<]+)<\/a>/);
    const opponentMatch = content.match(/<a[^>]*class="[^"]*opponent[^"]*"[^>]*>([^<]+)<\/a>/);
    
    if (!myTeamMatch || !opponentMatch) continue;
    
    const myTeam = myTeamMatch[1].trim();
    const opponent = opponentMatch[1].trim();
    const teams = `${myTeam} vs ${opponent}`;
    
    // Find time
    const timeMatch = content.match(/<div[^>]*class="time"[^>]*>([^<]+)<\/div>/);
    if (!timeMatch) continue;
    const time = timeMatch[1].trim();
    
    // Find location - be more flexible with the pattern
    const locationLinkMatch = content.match(/<a[^>]*href="[^"]*location[^"]*"[^>]*>([^<]+)<\/a>/);
    const locationFieldMatch = content.match(/<p[^>]*class="myScheduleField"[^>]*>([^<]+)<\/p>/);
    
    if (!locationLinkMatch) continue;
    
    let location = locationLinkMatch[1].trim();
    if (locationFieldMatch) {
      location += ` - ${locationFieldMatch[1].trim()}`;
    }
    
    if (date && time && teams && location) {
      games.push({
        date,
        time,
        teams,
        location
      });
    }
  }
  
  return games;
}

// Export for testing
export { parseScheduleHTML };

export async function getSchedule(env: Env): Promise<GameData[]> {
  const browser = await puppeteer.launch(env.MYBROWSER);
  const page = await browser.newPage();
  
  try {
    await page.goto("https://austinssc.leaguelab.com/login", {
      waitUntil: "networkidle2",
    });

    // Fill in username and password
    await page.type('input[name="Username"], input#username', env.ASSC_USERNAME);
    await page.type('input[name="Password"], input#password', env.ASSC_PASSWORD);

    // Click the login button
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    // Navigate directly to future games first  
    await page.goto("https://austinssc.leaguelab.com/player/schedule#upcomingDates", {
      waitUntil: "networkidle2",
    });
    
    // Wait for future games to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get future games
    const futureHtml = await page.content();
    const futureGames = parseScheduleHTML(futureHtml);

    // Navigate to past games view
    await page.goto("https://austinssc.leaguelab.com/player/schedule#pastMonthDates", {
      waitUntil: "networkidle2",
    });
    
    // Wait for past games to load
    await new Promise(resolve => setTimeout(resolve, 2000)); // Give time for JavaScript to switch views
    
    // Get past games
    const pastHtml = await page.content();
    const pastGames = parseScheduleHTML(pastHtml);

    // Combine both past and future games
    const allGames = [...pastGames, ...futureGames];
    
    // Remove duplicates based on date, time, teams, and location
    const uniqueGames = allGames.filter((game, index, arr) => {
      return index === arr.findIndex(g => 
        g.date === game.date && 
        g.time === game.time && 
        g.teams === game.teams && 
        g.location === game.location
      );
    });
    
    // Sort games by date (newest first) - helpful for debugging
    uniqueGames.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    
    return uniqueGames;
  } finally {
    await browser.close();
  }
}

// Legacy function for returning screenshot
export async function fetchUrl(env: Env, url: string): Promise<any> {
  const browser = await puppeteer.launch(env.MYBROWSER);
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: "networkidle2",
  });

  // Fill in username and password
  await page.type('input[name="Username"], input#username', env.ASSC_USERNAME);
  await page.type('input[name="Password"], input#password', env.ASSC_PASSWORD);

  // Click the login button (adjust selector as needed)
  await Promise.all([
    page.click('button[type="submit"], input[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2" }),
  ]);

  // wait for that “Schedule” tab to appear
  await page.waitForSelector("li.inactive.schedule a");

  // click it and wait for navigation (if it navigates)
  await Promise.all([
    page.click("li.inactive.schedule a"),
    page.waitForNavigation({ waitUntil: "networkidle2" }),
  ]);

  const img = await page.screenshot({ fullPage: true });
  await browser.close();
  return new Response(img, {
    headers: {
      "content-type": "image/jpeg",
    },
  });
}
