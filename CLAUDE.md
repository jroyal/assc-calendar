# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Run tests**: `npm test` (uses Vitest with Miniflare environment)
- **Install dependencies**: `npm i`
- **Run the worker locally**: `wrangler dev`

## Project Overview

This is a Cloudflare Worker application that scrapes Austin Sports & Social Club (ASSC) schedule data and converts it to iCalendar format for import into calendar applications.

### Architecture

The application is built on Hono framework for routing with the following key components:

- **Web scraping**: Uses Cloudflare Puppeteer browser binding (`MYBROWSER`) and custom HTMLRewriter-based scraper
- **Data storage**: Cloudflare KV for caching generated ICS files
- **Scheduled execution**: Cron trigger at 8am daily to refresh schedule data
- **Authentication**: Handles ASSC login flow with cookies and CSRF tokens

### Core Flow

1. `/generate` endpoint authenticates with ASSC, scrapes schedule data, converts to ICS format, and stores in KV
2. `/schedule` endpoint serves cached ICS file from KV
3. Scheduled worker runs daily to keep data fresh

### Key Files

- `src/index.ts`: Main Hono app with endpoints and worker export
- `src/lib/assc.ts`: ASSC authentication and schedule scraping logic
- `src/lib/scraper.ts`: HTMLRewriter-based web scraping utility
- `src/lib/ics.ts`: ICS calendar file generation
- `src/lib/format.ts`: Date/time formatting utilities
- `src/lib/browser.ts`: Cloudflare browser integration

### Environment Setup

Required secrets and variables (configured in wrangler.toml):

- `ASSC_USERNAME`: Username for ASSC login (in vars)
- `ASSC_PASSWORD`: Password for ASSC login (worker secret)
- `MYBROWSER`: Cloudflare browser binding
- `KV`: KV namespace binding for data storage

### Testing

Tests use Vitest with miniflare environment to simulate Cloudflare Worker runtime. Test files are in `/tests/` directory.

### Deployment

Deployed to Cloudflare Workers at `assc-cal.hypersloth.io` route.
