import { readFileSync,writeFileSync } from 'node:fs';
const value=name=>{const v=process.env[name]?.trim();if(!v)throw new Error(`Set ${name}. See HOSTING.md.`);return v;};
const databaseId=value('CLOUDFLARE_D1_DATABASE_ID');
if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(databaseId)||databaseId==='00000000-0000-4000-8000-000000000000')throw new Error('Use the real D1 database ID from your Cloudflare account.');
const domain=value('CUSTOM_DOMAIN');
if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain))throw new Error('CUSTOM_DOMAIN must be a hostname without https:// or a path.');
const team=value('ACCESS_TEAM_DOMAIN');if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team))throw new Error('ACCESS_TEAM_DOMAIN must be your team.cloudflareaccess.com hostname.');
const audience=value('ACCESS_AUD');if(!/^[a-f0-9]{64}$/i.test(audience))throw new Error('ACCESS_AUD must be the application audience tag from Cloudflare Access.');
const email=value('ADMIN_EMAIL');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('ADMIN_EMAIL must be your owner sign-in email.');
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
config.name='carreg-spain';
config.workers_dev=false;
config.preview_urls=false;
config.routes=[{pattern:domain,custom_domain:true}];
config.d1_databases=[{binding:'DB',database_name:'carreg-spain',database_id:databaseId,migrations_dir:'../../drizzle'}];
config.vars={ADMIN_AUTH_MODE:'cloudflare-access',ADMIN_EMAIL:email,ACCESS_TEAM_DOMAIN:team,ACCESS_AUD:audience};
// Keep paths beside the generated manifest so Vite's module and asset paths stay valid.
writeFileSync('dist/server/wrangler.selfhost.json',JSON.stringify(config,null,2)+'\n',{mode:0o600});
console.log('Cloudflare hosting configuration prepared. Deploy only after the Access policy in HOSTING.md is configured.');
