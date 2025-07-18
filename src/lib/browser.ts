import puppeteer from "@cloudflare/puppeteer";
import { Env } from "../index";

// Create a basic async function that takes a url. No return.
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
