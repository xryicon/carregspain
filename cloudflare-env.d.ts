declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAIL?: string;
    ADMIN_AUTH_MODE?: "sites" | "cloudflare-access";
    ACCESS_TEAM_DOMAIN?: string;
    ACCESS_AUD?: string;
  }
}
