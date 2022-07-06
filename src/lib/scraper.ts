// This was taken from https://github.com/adamschwartz/web.scraper.workers.dev/blob/master/scraper.js and
// modified for typescript and a few minor changes that I needed

const cleanText = (s: string) => s.trim().replace(/\s\s+/g, " ");

class Scraper {
  rewriter: HTMLRewriter;
  url: string;
  selector: string;
  response: Response;

  constructor({ resp }: { resp?: Response }) {
    this.rewriter = new HTMLRewriter();
    this.url = "";
    this.selector = "";
    this.response = resp ? resp : new Response();
    return this;
  }

  async fetch(url: string) {
    this.url = url;
    this.response = await fetch(url);

    const server = this.response.headers.get("server");

    const isThisWorkerErrorNotErrorWithinScrapedSite =
      [530, 503, 502, 403, 400].includes(this.response.status) &&
      (server === "cloudflare" || !server); /* Workers preview editor */

    if (isThisWorkerErrorNotErrorWithinScrapedSite) {
      throw new Error(`Status ${this.response.status} requesting ${url}`);
    }

    return this;
  }

  querySelector(selector: string) {
    this.selector = selector;
    return this;
  }

  async getText({ spaced }: { spaced?: boolean }) {
    const matches: { [key: string]: any } = {};
    const selectors = new Set(this.selector.split(",").map((s) => s.trim()));

    selectors.forEach((selector) => {
      matches[selector] = [];

      let nextText = "";

      this.rewriter.on(selector, {
        element(element) {
          matches[selector].push(true);
          nextText = "";
        },

        text(text) {
          nextText += text.text;

          if (text.lastInTextNode) {
            if (spaced) nextText += " ";
            matches[selector].push(nextText);
            nextText = "";
          }
        },
      });
    });

    const transformed = this.rewriter.transform(this.response);

    await transformed.arrayBuffer();

    selectors.forEach((selector) => {
      const nodeCompleteTexts = [];

      let nextText = "";

      matches[selector].forEach((text: any) => {
        if (text === true) {
          if (nextText.trim() !== "") {
            nodeCompleteTexts.push(cleanText(nextText));
            nextText = "";
          }
        } else {
          nextText += text;
        }
      });

      const lastText = cleanText(nextText);
      if (lastText !== "") nodeCompleteTexts.push(lastText);
      matches[selector] = nodeCompleteTexts;
    });

    // @ts-ignore (probably an error here)
    return selectors.length === 1 ? matches[selectors[0]] : matches;
  }

  async getAttribute(attribute: string) {
    class AttributeScraper {
      attr: string;
      value: string | null;
      constructor(attr: string) {
        this.attr = attr;
        this.value = "";
      }

      element(element: Element) {
        if (this.value) return;

        this.value = element.getAttribute(this.attr);
      }
    }

    const scraper = new AttributeScraper(attribute);

    await new HTMLRewriter()
      .on(this.selector, scraper)
      .transform(this.response)
      .arrayBuffer();

    return scraper.value || "";
  }
}

export default Scraper;
