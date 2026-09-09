# CARREG SPAIN

Vehicle registration in Spain, with a responsive website and a working quote-request inbox.

**Languages:** English, Nederlands, Français, Deutsch. The language switcher translates the customer website, four-step quote form, validation, confirmation, privacy information and owner area. It preserves form entries when switching language and records the customer's chosen language with each enquiry.

## What is included

- Vehicle details, registration country, technical details, location and plans in Spain, contact preference and consent.
- Requests stored in Cloudflare D1, with confirmation references, duplicate-request protection and submission throttling.
- An owner-only inbox at `/admin`: search, status filters, internal notes, CSV exports and editable business contact information.
- CARREG SPAIN branding and supplied imagery, responsive navigation and accessible form controls.
- A manual GitHub Actions deployment workflow for your own Cloudflare account.

The repository contains source and assets. Customer enquiries, live database contents, credentials and private business settings are not included. A new hosting account starts with an empty database. Replies open your own email, phone or WhatsApp app; automatic email notifications are not enabled.

## Host it yourself

Follow **[HOSTING.md](HOSTING.md)** for Cloudflare Workers, D1 and private access. GitHub stores the code; the application also needs a backend and database, so it cannot run as a static GitHub Pages site.

The deployment workflow runs only when you select **Run workflow** after configuring your account. A code upload does not automatically publish the site.

## Development

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

For local database-backed work, build once and apply migrations to the same local Wrangler state used by the preview:

```sh
npm run build
npx wrangler d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
npm run start
```

The owner area is closed unless owner authentication is configured. Production authentication is never bypassed for local convenience. On ChatGPT Sites, use the platform-managed owner identity with `ADMIN_AUTH_MODE=sites`; self-hosted deployments use a verified Cloudflare Access token and `ADMIN_AUTH_MODE=cloudflare-access`.

```sh
npm test
npx tsc --noEmit
npm run build
```

Tests exercise the actual API handlers against an isolated SQLite database, language coverage and signed owner-access tokens. They never send a customer enquiry to production.

## Content and translations

- `components/carreg-website.tsx`: customer pages and navigation.
- `components/quote-form.tsx`: guided enquiry form.
- `components/enquiry-inbox.tsx`: owner tools.
- `lib/locales/{nl,fr,de}.json`: translation dictionaries keyed by the English source text.
- `app/globals.css`: shared CARREG SPAIN styling.
- `drizzle/`: versioned database migrations. Add new migrations; do not change previously applied ones.

Quoted vehicle values use stable internal options regardless of display language. Customer names, vehicle descriptions and personal notes are preserved exactly as entered except the form's documented trimming and normalization.
