import { describe, it, expect } from "vitest";
import { parseScheduleHTML } from "../src/lib/browser";

describe("HTML Schedule Parser", () => {
  it("should parse a single game entry with real structure", () => {
    const mockHTML = `
      <div class="myScheduleDate">
        <h2>Thursday, August 7</h2>
        
        <a class="opponent" href="/team/898381">One Hit Wonder</a>
        <div class="vs">vs.</div>
        <a class="myteam" href="/team/892817">No longer has a pregnant woman playing</a>
        
        <div class="slotInfo">
          <div class="time">7:10 PM</div>
          <div class="location">
            <a href="/location/5646">Project Serve</a>
            <p class="myScheduleField">Court 2</p>
          </div>
        </div>
      </div>
    `;

    const games = parseScheduleHTML(mockHTML);

    expect(games).toHaveLength(1);
    expect(games[0]).toEqual({
      date: "Thursday, August 7",
      time: "7:10 PM",
      teams: "No longer has a pregnant woman playing vs One Hit Wonder",
      location: "Project Serve - Court 2",
    });
  });

  it("should handle unscheduled games (no games)", () => {
    const mockHTML = `
      <div class="myScheduleDate">
        <h2>Wednesday, August 13</h2>
        
        <div class="unscheduledTeam even">
          <div class="unscheduledLeft">
            We are currently working on the schedule for
            <a href="/team/907289" class="myteam">That "pure energy" song by Information Society</a>
            Please check back later.
          </div>
        </div>
      </div>
    `;

    const games = parseScheduleHTML(mockHTML);
    expect(games).toHaveLength(0);
  });

  it("should handle multiple games in different dates", () => {
    const mockHTML = `
      <div class="myScheduleDate">
        <h2>Thursday, August 7</h2>
        <a class="opponent" href="/team/898381">One Hit Wonder</a>
        <div class="vs">vs.</div>
        <a class="myteam" href="/team/892817">Team A</a>
        <div class="slotInfo">
          <div class="time">7:10 PM</div>
          <div class="location">
            <a href="/location/5646">Project Serve</a>
            <p class="myScheduleField">Court 2</p>
          </div>
        </div>
      </div>
      <div class="myScheduleDate">
        <h2>Wednesday, August 6</h2>
        <a class="myteam" href="/team/877252">"Don't mean nothing" by Richard Marx</a>
        <div class="vs">vs.</div>
        <a class="opponent" href="/team/876228">Get Off Our Lawn</a>
        <div class="slotInfo">
          <div class="time">7:00 PM</div>
          <div class="location">
            <a href="/location/4083">South Austin Recreation Center</a>
            <p class="myScheduleField">Field 1</p>
          </div>
        </div>
      </div>
    `;

    const games = parseScheduleHTML(mockHTML);
    expect(games).toHaveLength(2);
    expect(games[0].date).toBe("Thursday, August 7");
    expect(games[1].date).toBe("Wednesday, August 6");
  });

  it("should parse with real example data", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const htmlPath = path.join(__dirname, "assets/example_schedule.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    const games = parseScheduleHTML(html);

    // Based on the real HTML, we should find some scheduled games
    expect(games.length).toBeGreaterThan(0);

    // Each game should have the required fields
    games.forEach((game) => {
      expect(game.date).toBeDefined();
      expect(game.time).toBeDefined();
      expect(game.teams).toBeDefined();
      expect(game.location).toBeDefined();
      expect(game.teams).toContain(" vs ");
    });
  });

  it("should parse past games with same structure", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const htmlPath = path.join(__dirname, "assets/past_games.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    const games = parseScheduleHTML(html);

    // Should find past games using same parser
    expect(games.length).toBeGreaterThan(0);

    // Parser successfully works with past games too

    // Each game should have the required fields
    games.forEach((game) => {
      expect(game.date).toBeDefined();
      expect(game.time).toBeDefined();
      expect(game.teams).toBeDefined();
      expect(game.location).toBeDefined();
      expect(game.teams).toContain(" vs ");
    });
  });
});
