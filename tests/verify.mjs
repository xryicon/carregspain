import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import ts from "typescript";
const require=createRequire(import.meta.url),root=process.cwd(),sqlite=new DatabaseSync(":memory:");
for(const file of fs.readdirSync("drizzle").filter(f=>f.endsWith(".sql")).sort())sqlite.exec(fs.readFileSync(path.join("drizzle",file),"utf8"));
const prepare=sql=>{let values=[];return {bind(...v){values=v;return this;},first(){return Promise.resolve(sqlite.prepare(sql).get(...values)||null);},all(){return Promise.resolve({results:sqlite.prepare(sql).all(...values)});},run(){return Promise.resolve(this.execute());},execute(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};};
const db={prepare,async batch(queries){sqlite.exec("BEGIN");try{const results=queries.map(q=>q.execute());sqlite.exec("COMMIT");return results;}catch(e){sqlite.exec("ROLLBACK");throw e;}}};
let identity=null;const env={DB:db,ADMIN_EMAIL:"owner@example.test",ADMIN_AUTH_MODE:"sites"},cache=new Map();
function load(file){file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const code=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function("require","module","exports",code)((id)=>{if(id==="next/headers")return {headers:async()=>new Headers()};if(id==="cloudflare:workers")return {env};if(id==="@/app/chatgpt-auth")return {getChatGPTUser:async()=>identity};if(id.startsWith("@/"))return load(id.slice(2)+".ts");if(id.startsWith(".")){const resolved=path.resolve(path.dirname(file),id);if(resolved.endsWith(".json"))return {default:JSON.parse(fs.readFileSync(resolved,"utf8"))};return load(resolved+".ts");}return require(id);},module,module.exports);return module.exports;}
const quotes=load("app/api/quotes/route.ts"),admin=load("app/api/admin/route.ts"),schema=load("lib/quotes.ts");
let count=0;function check(value,message){assert.ok(value,message);count++;}
const valid={...schema.emptyQuote,make:"Volkswagen",model:"Golf",year:"2019",fuel:"Diesel",province:"Alicante",name:"Test Customer",email:"CUSTOMER@example.test",consent:true};
function request(url,body,origin="https://carreg.test",ip="203.0.113.1"){return new Request(`https://carreg.test${url}`,{method:"POST",headers:{"Content-Type":"application/json","Origin":origin,"CF-Connecting-IP":ip},body:JSON.stringify(body)});}
function submit(data=valid,id=crypto.randomUUID(),ip=crypto.randomUUID()){return quotes.POST(request("/api/quotes",{data,submissionId:id,website:""},"https://carreg.test",ip));}
for(const [change,label] of [[{make:""},"missing make"],[{year:"abc"},"invalid year"],[{year:"1899"},"old invalid year"],[{email:"wrong"},"invalid email"],[{vin:"INVALID VIN!"},"invalid VIN"],[{co2:"-20"},"negative CO2"],[{engineCC:"1e9"},"invalid engine capacity"],[{country:"Other",otherCountry:""},"missing country"],[{contact:"WhatsApp",phone:""},"missing WhatsApp number"],[{consent:false},"missing consent"]])check((await submit({...valid,...change})).status===400,`Accepted ${label}`);
check((await quotes.POST(request("/api/quotes",{data:valid,submissionId:crypto.randomUUID()},"https://untrusted.test"))).status===403,"Cross-origin submission was accepted");
check((await quotes.POST(request("/api/quotes",{data:valid,submissionId:crypto.randomUUID(),website:"spam"}))).status===400,"Honeypot submission was accepted");
const id=crypto.randomUUID(),response=await submit(valid,id,"198.51.100.4"),saved=await response.json();
check(response.status===201&&/^CR-\d{4}-[A-F0-9]{10}$/.test(saved.reference),"Valid anonymous quote did not receive reference");
check(Object.keys(saved).join() === "reference","Submission exposed private stored data");
check(sqlite.prepare("SELECT COUNT(*) AS n FROM quote_requests").get().n===1,"Quote was not persisted once");
const repeated=await submit(valid,id,"198.51.100.4");check(repeated.status===200&&(await repeated.json()).reference===saved.reference,"Retry did not return original reference");
check(sqlite.prepare("SELECT COUNT(*) AS n FROM quote_requests").get().n===1,"Retry created a duplicate");
check((await submit({...valid,model:"Polo"},id)).status===409,"Same submission ID silently changed saved data");
for(let i=0;i<4;i++)check((await submit({...valid,name:`Customer ${i}`},crypto.randomUUID(),"198.51.100.4")).status===201,"Rate limit blocked an allowed request");
check((await submit(valid,crypto.randomUUID(),"198.51.100.4")).status===429,"Rate limit did not block excess request");
const get=url=>admin.GET(new Request(`https://carreg.test/api/admin${url}`));
check((await get("")).status===403,"Anonymous user could read inbox");identity={userId:"visitor",email:"visitor@example.test"};check((await get("?export=csv")).status===403,"Non-owner could export customer details");
check((await admin.POST(request("/api/admin",{action:"settings",data:schema.emptySettings}))).status===403,"Non-owner could change business settings");
identity={userId:"owner",email:"OWNER@example.test"};const list=await (await get("")).json();check(list.total===5&&list.quotes.length===5,"Owner could not see persisted enquiries");
const row=list.quotes.find(q=>q.id===id);check(row.data.email==="customer@example.test","Email normalization failed");
check((await admin.POST(request("/api/admin",{action:"update",data:{id,version:0,status:"quoted",notes:"Quote €650 pending technical review"}}))).status===200,"Owner update failed");
check((await admin.POST(request("/api/admin",{action:"update",data:{id,version:0,status:"closed",notes:"stale"}}))).status===409,"Stale owner update overwrote another edit");
check((await (await get("?status=quoted")).json()).total===1,"Status filter failed");
check((await (await get("?q="+encodeURIComponent(saved.reference))).json()).quotes.length===1,"Reference search failed");
const csv=await (await get("?export=csv&status=quoted")).text();check(csv.includes("Quote €650")&&csv.includes("Volkswagen"),"CSV did not include vehicle and internal notes");
check(schema.csvCell("=1+1")==='"\'=1+1"',"CSV formula injection was not escaped");
const settings={contactEmail:"contact@example.test",phone:"+34 600 000 000",whatsapp:"+34600000000",legalName:"Test registration company",address:"Test business address"};
check((await admin.POST(request("/api/admin",{action:"settings",data:settings}))).status===200,"Settings save failed");
check((await load("db/store.ts").getSettings()).contactEmail===settings.contactEmail,"Settings did not persist");
delete env.ADMIN_EMAIL;check((await get("")).status===403,"Missing owner configuration allowed access");
check(sqlite.prepare("SELECT notes,status,version FROM quote_requests WHERE id = ?").get(id).notes!=="stale","Stale write altered private notes");
const i18n=load("lib/i18n.ts");
for(const language of ["en","nl","fr","de"]){
 const localizedId=crypto.randomUUID(),result=await submit({...valid,language},localizedId);
 check(result.status===201,`Valid ${language} request was rejected`);
 const payload=JSON.parse(sqlite.prepare("SELECT payload FROM quote_requests WHERE id = ?").get(localizedId).payload);
 check(payload.language===language&&payload.country==="United Kingdom",`Language or stable vehicle values lost for ${language}`);
 if(language!=="en")check(i18n.localizedError(language,"Enter a valid email address.")!=="Enter a valid email address.",`Validation not translated for ${language}`);
}
const legacy={...valid};delete legacy.language;
check(schema.quoteSchema.parse(legacy).language==="en","Older form requests must default to English");
check((await submit({...valid,language:"xx"})).status===400,"Unsupported customer language accepted");
const invalid=await (await submit({...valid,email:"wrong"})).json();
check(invalid.fields.some(f=>f.field==="email"&&f.message==="Enter a valid email address."),"Server field errors are not actionable");
console.log(`${count} validation, privacy, persistence, retry, rate-limit, inbox and export checks passed.`);
