import fs from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { generateKeyPair,exportJWK,SignJWT } from 'jose';
const require=createRequire(import.meta.url);
const {publicKey,privateKey}=await generateKeyPair('RS256');
const publicJwk={...await exportJWK(publicKey),kid:'test-key',alg:'RS256',use:'sig'};
const originalFetch=globalThis.fetch;
const env={ADMIN_EMAIL:'owner@example.test',ADMIN_AUTH_MODE:'cloudflare-access',ACCESS_TEAM_DOMAIN:'carreg-test.cloudflareaccess.com',ACCESS_AUD:'a'.repeat(64)};
let requestHeaders=new Headers(),reads=0;
globalThis.fetch=async url=>{assert.equal(String(url),'https://carreg-test.cloudflareaccess.com/cdn-cgi/access/certs');return Response.json({keys:[publicJwk]});};
const module={exports:{}};
const code=ts.transpileModule(fs.readFileSync('lib/owner.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
new Function('require','module','exports',code)(id=>{
 if(id==='cloudflare:workers')return {env};
 if(id==='next/headers')return {headers:async()=>requestHeaders};
 if(id==='@/app/chatgpt-auth')return {getChatGPTUser:async()=>{reads++;return {email:'owner@example.test'}},chatGPTSignInPath:()=>'/signin-with-chatgpt?return_to=%2Fadmin'};
 return require(id);
},module,module.exports);
const {isOwner}=module.exports;
let count=0;const check=async(expected,message)=>{assert.equal(await isOwner(),expected,message);count++;};
async function signed(overrides={},key=privateKey,alg='RS256'){return new SignJWT({email:'OWNER@example.test',sub:'owner',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,iss:'https://carreg-test.cloudflareaccess.com',aud:env.ACCESS_AUD,...overrides}).setProtectedHeader({alg,kid:'test-key'}).sign(key);}
try{
 await check(false,'Missing token must deny access');
 requestHeaders=new Headers({'oai-authenticated-user-email':'owner@example.test','oai-authenticated-user-id':'forged'});
 await check(false,'Forged Sites identity must not grant access outside Sites');
 requestHeaders.set('cf-access-jwt-assertion',await signed());await check(true,'Valid signed owner must be admitted');
 for(const claims of [{email:'visitor@example.test'},{exp:Math.floor(Date.now()/1000)-60},{aud:'different-app'},{iss:'https://attacker.example'},{exp:undefined}]){
  requestHeaders.set('cf-access-jwt-assertion',await signed(claims));await check(false,'Wrong email, expiry, issuer, audience or missing expiration must deny access');
 }
 const {privateKey:wrongKey}=await generateKeyPair('RS256');requestHeaders.set('cf-access-jwt-assertion',await signed({},wrongKey));await check(false,'Wrong signing key must deny access');
 requestHeaders.set('cf-access-jwt-assertion',await signed({},new TextEncoder().encode('a-secret-that-is-long-enough-for-hs256'),'HS256'));await check(false,'Unapproved signature algorithm must deny access');
 requestHeaders.set('cf-access-jwt-assertion','not-a-jwt');await check(false,'Malformed token must deny access');
 assert.equal(reads,0,'Self-hosted authentication must never consult Sites identity headers');
 delete env.ADMIN_AUTH_MODE;await check(false,'Missing authentication mode must deny access');
 env.ADMIN_AUTH_MODE='sites';await check(true,'Sites mode preserves platform owner access');
 delete env.ADMIN_EMAIL;await check(false,'Missing owner must deny access');
 console.log(`${count} owner-access checks passed, including real signed JWT verification.`);
}finally{globalThis.fetch=originalFetch;}
