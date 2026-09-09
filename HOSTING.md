# Host CARREG SPAIN from GitHub

This app runs on **Cloudflare Workers with a D1 database**. The source repository and website access are separate settings: make the GitHub repository Private if you want only authorized people to see the code. Use Cloudflare Access if you want only approved people to visit the website.

No hosting account, domain, database or Access policy is created by uploading the source to GitHub. The instructions below set those up in your own account. Existing enquiries on the ChatGPT-hosted version are not automatically transferred.

## 1. Create your database and choose a domain

Use Node.js 24. Clone the repository and run:

```sh
npm ci
npx wrangler login
npx wrangler d1 create carreg-spain
```

Keep the returned database UUID. Use a hostname in a domain you manage in Cloudflare, such as `cars.yourdomain.com`. Do not use a hostname already serving another website. The deploy configuration attaches the Worker to this hostname and disables `workers.dev` and preview URLs. Cloudflare manages the custom domain's DNS and certificate. [Custom Domain documentation](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## 2. Protect the website before deploying

In Cloudflare Zero Trust, create a **Self-hosted Access application** for the exact hostname, covering all paths. Add an **Allow** policy for your own email and any people who may view this private website. Configure your preferred sign-in method, such as emailed one-time codes. Do not add a public Bypass policy.

Copy the application's **Application Audience (AUD)** tag and your **team domain**, for example `your-team.cloudflareaccess.com`. Set `ADMIN_EMAIL` to the email address that should manage enquiries. Other permitted visitors can use the quote form but cannot open the owner inbox.

The server verifies the Access JWT signature, issuer, audience, expiry and owner email. Merely setting an identity header does not grant inbox access. Missing authentication configuration denies access. [Cloudflare JWT validation documentation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

If you later want a public customer website, change the Access application's protected paths to `/admin`, `/admin/*`, `/api/admin` and `/api/admin/*`, keeping these paths in the same application with the same audience. Keep the owner email policy for those paths. The customer website and quote endpoint may then be public while the inbox stays restricted.

## 3. Configure GitHub deployment

In the repository's **Settings → Environments**, create an environment named `production`. Add these values under that environment:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | A token limited to this account with Workers Scripts Edit, D1 Edit, and the domain permissions needed to attach a Worker custom domain |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| Secret | `ADMIN_EMAIL` | The owner email allowed by your Access policy |
| Variable | `CLOUDFLARE_D1_DATABASE_ID` | The real database UUID from step 1 |
| Variable | `CUSTOM_DOMAIN` | The exact hostname from step 2, without a protocol or path |
| Variable | `ACCESS_TEAM_DOMAIN` | Your team hostname ending in `.cloudflareaccess.com` |
| Variable | `ACCESS_AUD` | The application's 64-character audience tag |

The standard Cloudflare **Edit Cloudflare Workers** API-token template is a starting point for deployment; include D1 Edit and scope permissions to the account and zone being used. Never commit the token or fill in `.env.example` with real credentials.

Select **Actions → Deploy to your Cloudflare account → Run workflow** on `main`. It checks the code, builds the site, writes the hosting configuration, applies the database migrations and deploys. Deployment is manual; later pushes only run the verification workflow.

## 4. Finish the business setup

Open `https://YOUR_HOSTNAME/admin` and sign in through Cloudflare Access. In **Business details**, add your customer-facing email, phone/WhatsApp, legal business name and address. These are stored in your database and shown on the website. The owner sign-in email is not automatically published as a business contact.

Select each language, submit one clearly identified test quote, and check that it appears in the inbox with its reference and customer language. Confirm that an unapproved visitor cannot open the private site and that another permitted visitor cannot open `/api/admin` or export enquiries.

## Deploy from your own terminal instead

After steps 1–2, provide the same values in your shell environment (or an ignored `.env` file). Do not paste tokens into tracked files. Then:

```sh
npm ci
npm test
npm run build
node --env-file=.env scripts/configure-cloudflare.mjs
npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.selfhost.json
npx wrangler deploy --config dist/server/wrangler.selfhost.json
```

When using `wrangler login`, an API token is not required for the terminal workflow. `hosting:configure` also reads already-exported shell variables. The generated configuration lives under ignored `dist/` and must be regenerated after each build.

## Data and ongoing use

D1 stores quote requests, rate-limit records and business details. The migrations create the tables; an empty inbox after a fresh deployment is expected. The source upload does not export or copy the existing site's customer data. Use the owner inbox's CSV export to obtain records for your own use; importing historical records would be a separate migration.

Before changing hosting or applying future schema changes, back up the D1 database. Keep previously applied SQL migrations intact. This site does not automatically email enquiries, upload identity documents, calculate tax amounts or take payments.
