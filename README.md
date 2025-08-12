# Austin Sports and Social ICAL feed

This is a Cloudflare Worker that scrapes my ASSC schedule and generates an ICS file that can be imported into Google Calendar or Apple Calendar. It fetches both past and future games for complete calendar backfill.

## Setup

Run `npm i` to install the required files

Required environment variables:

- `ASSC_USERNAME` - stored in wrangler.toml
- `ASSC_PASSWORD` - stored as a worker secret

## Testing

Run `npm test` to execute the unit tests. Tests are also run automatically on pull requests using GitHub Actions.

## Routes

### Main Routes

- **`/schedule`** - Returns the ICS calendar file (use this URL in your calendar app)
- **`/generate`** - Manually refresh the schedule and update the ICS file

### Debug Routes

- **`/test-browser`** - Test the browser scraping and return parsed games as JSON
- **`/test`** - Test the legacy scraping method
- **`/fetch-url`** - Test browser functionality (returns screenshot)

## Usage

Subscribe to calendar: `https://assc-cal.hypersloth.io/schedule`

Manually refresh: `curl https://assc-cal.hypersloth.io/generate`

Debug parsing: `curl https://assc-cal.hypersloth.io/test-browser`
