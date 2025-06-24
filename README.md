# Austin Sports and Social ICAL feed

This is a Cloudflare Worker that will go fetch my ASSC schedule and make an ics file that can be imported into Google Calendar or Apple Calendar.

## Setup

Run `npm i` to install the required files

Required environment variables

- ASSC_USERNAME - stored in wrangler.toml
- ASSC_PASSWORD - stored in a worker secret

## Using

`/generate` will update the ics file stored in Workers KV
`/schedule` will return the ics file

## Testing

Run `npm test` to execute the unit tests. Tests are also run automatically on pull requests using GitHub Actions.
