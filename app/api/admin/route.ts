import { z } from "zod";
import { isOwner } from "@/lib/owner";
import { database, getSettings, quoteView, type QuoteRow } from "@/db/store";
import { STATUSES, settingsSchema, csvCell, countryLabel, vehicleLabel } from "@/lib/quotes";
import { isLanguage, translator } from "@/lib/i18n";
export const dynamic="force-dynamic";
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:Request){try{
 if(!await isOwner())return reply({error:"Only the website owner can open enquiries."},403);
 const db=database(),url=new URL(req.url),search=(url.searchParams.get("q")||"").slice(0,100),status=url.searchParams.get("status")||"all",page=Math.max(0,Math.min(100000,Math.floor(Number(url.searchParams.get("page"))||0))),exporting=url.searchParams.get("export")==="csv";
 if(status!=="all"&&!STATUSES.includes(status as typeof STATUSES[number]))return reply({error:"Choose a valid status."},400);
 const where="WHERE (? = 'all' OR status = ?) AND (? = '' OR instr(lower(name || ' ' || email || ' ' || vehicle || ' ' || reference),lower(?)) > 0)";
 const values=[status,status,search,search];
 const [rows,total,counts,settings]=await Promise.all([
  db.prepare(`SELECT * FROM quote_requests ${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(...values,exporting?5000:25,exporting?0:page*25).all<QuoteRow>(),
  db.prepare(`SELECT COUNT(*) AS n FROM quote_requests ${where}`).bind(...values).first<{n:number}>(),
  db.prepare("SELECT status,COUNT(*) AS n FROM quote_requests GROUP BY status").all<{status:string;n:number}>(),getSettings()]);
 if(exporting){if((total?.n||0)>5000)return reply({error:"Narrow your search to export at most 5,000 enquiries."},400);const lang=url.searchParams.get("lang"),t=translator(isLanguage(lang)?lang:"en");const header=["Reference","Received","Status","Name","Email","Phone","Preferred contact","Vehicle","Vehicle type","Fuel","Country","Registration","VIN","Engine cc","CO2 g/km","Mileage km","Purpose","In Spain","Province","Town","Steering","Certificate of conformity","Modified","Timeframe","Customer notes","Internal notes","Customer language"];
 const lines=rows.results.map(r=>{const q=quoteView(r),d=q.data;return [q.reference,new Date(q.createdAt).toISOString(),q.status,d.name,d.email,d.phone,d.contact,vehicleLabel(d),d.vehicleType,d.fuel,countryLabel(d),d.registration,d.vin,d.engineCC,d.co2,d.mileage,d.purpose,d.inSpain,d.province,d.town,d.steering,d.coc,d.modified,d.timeframe,d.notes,q.notes,t(d.language||"en")].map(csvCell).join(",")});
 return new Response("\uFEFF"+[header.map(h=>csvCell(t(h))).join(","),...lines].join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="carreg-enquiries.csv"',"Cache-Control":"no-store"}});}
 return reply({quotes:rows.results.map(quoteView),total:total?.n||0,counts:Object.fromEntries(counts.results.map(c=>[c.status,c.n])),page,settings});
 }catch(e){console.error("Enquiry inbox unavailable",e instanceof Error?e.name:"Unknown");return reply({error:"Your inbox could not be loaded. Please try again."},503);}}
const updateSchema=z.object({id:z.string().uuid(),version:z.number().int().nonnegative(),status:z.enum(STATUSES),notes:z.string().trim().max(4000)});
export async function POST(req:Request){try{
 if(req.headers.get("origin")!==new URL(req.url).origin)return reply({error:"Invalid request origin."},403);
 if(!await isOwner())return reply({error:"Only the website owner can change enquiries."},403);
 const raw=await req.text();if(raw.length>16000)return reply({error:"This update is too long."},413);const body=JSON.parse(raw),db=database();
 if(body.action==="settings"){const parsed=settingsSchema.safeParse(body.data);if(!parsed.success)return reply({error:parsed.error.issues[0].message},400);await db.prepare("INSERT INTO site_settings(id,value) VALUES ('contact',?) ON CONFLICT(id) DO UPDATE SET value = excluded.value").bind(JSON.stringify(parsed.data)).run();return reply({settings:parsed.data});}
 if(body.action!=="update")return reply({error:"Unknown inbox action."},400);
 const parsed=updateSchema.safeParse(body.data);if(!parsed.success)return reply({error:"Check the enquiry status and notes."},400);const d=parsed.data;
 const result=await db.prepare("UPDATE quote_requests SET status = ?, notes = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?").bind(d.status,d.notes,Date.now(),d.id,d.version).run();
 if(result.meta.changes!==1)return reply({error:"This enquiry changed in another session. Reload it before saving."},409);
 const row=await db.prepare("SELECT * FROM quote_requests WHERE id = ?").bind(d.id).first<QuoteRow>();return reply({quote:row?quoteView(row):null});
 }catch(e){if(e instanceof SyntaxError)return reply({error:"Invalid update."},400);console.error("Inbox update failed",e instanceof Error?e.name:"Unknown");return reply({error:"Your changes could not be confirmed. Reload before trying again."},503);}}
