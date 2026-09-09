import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { createRemoteJWKSet,jwtVerify } from 'jose';
import { getChatGPTUser,chatGPTSignInPath } from '@/app/chatgpt-auth';

const keySets=new Map<string,ReturnType<typeof createRemoteJWKSet>>();
function accessIssuer(){const team=env.ACCESS_TEAM_DOMAIN?.trim();return team&&/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)?`https://${team}`:null;}
/** Explicit hosting mode: unconfigured or invalid authentication always denies access. */
export async function ownerIdentity():Promise<{email:string}|null>{
 const allowed=env.ADMIN_EMAIL?.trim().toLowerCase();if(!allowed)return null;
 if(env.ADMIN_AUTH_MODE==='sites'){
  const user=await getChatGPTUser();return user?.email.trim().toLowerCase()===allowed?{email:allowed}:null;
 }
 if(env.ADMIN_AUTH_MODE!=='cloudflare-access')return null;
 const issuer=accessIssuer(),audience=env.ACCESS_AUD?.trim();if(!issuer||!audience)return null;
 const token=(await headers()).get('cf-access-jwt-assertion');if(!token)return null;
 try{
  let keys=keySets.get(issuer);if(!keys){keys=createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));keySets.set(issuer,keys);}
  const {payload}=await jwtVerify(token,keys,{issuer,audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
  return typeof payload.email==='string'&&payload.email.trim().toLowerCase()===allowed?{email:allowed}:null;
 }catch{return null;}
}
export async function isOwner(){return !!await ownerIdentity();}
export function ownerSignIn():string|undefined {
 if(env.ADMIN_AUTH_MODE==='sites')return chatGPTSignInPath('/admin');
 // Cloudflare Access protects /admin before it reaches this application.
 return undefined;
}
