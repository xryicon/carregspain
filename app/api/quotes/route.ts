import { z } from "zod";
import { database } from "@/db/store";
import { quoteSchema, vehicleLabel } from "@/lib/quotes";
export const dynamic="force-dynamic";
const submissionSchema=z.object({submissionId:z.string().uuid(),website:z.string().max(200).optional().default(""),data:quoteSchema});
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
 try{
  if(req.headers.get("origin")!==new URL(req.url).origin)return reply({error:"Please submit your request from this website."},403);
  if(!req.headers.get("content-type")?.includes("application/json"))return reply({error:"Invalid request format."},415);
  const text=await req.text();if(text.length>16000)return reply({error:"Your request is too long."},413);
  const parsed=submissionSchema.safeParse(JSON.parse(text));if(!parsed.success)return reply({error:"Please check your vehicle and contact details.",fields:parsed.error.issues.map(issue=>({field:issue.path.filter(p=>p!=="data").join("."),message:issue.message}))},400);
  const {submissionId,data,website}=parsed.data;if(website)return reply({error:"This request could not be accepted. Please try again."},400);
  const db=database(),payload=JSON.stringify(data);
  const existing=await db.prepare("SELECT reference,payload FROM quote_requests WHERE id = ?").bind(submissionId).first<{reference:string;payload:string}>();
  if(existing)return existing.payload===payload?reply({reference:existing.reference}):reply({error:"This request was already received with different details. Start a new request to make changes."},409);
  const now=Date.now(),hour=Math.floor(now/3600000),ip=req.headers.get("cf-connecting-ip")||req.headers.get("oai-authenticated-user-id")||"unknown";
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${hour}:${ip}`)))).map(v=>v.toString(16).padStart(2,"0")).join("");
  const token=crypto.randomUUID(),reference=`CR-${new Date(now).getUTCFullYear()}-${crypto.randomUUID().replace(/-/g,"").slice(0,10).toUpperCase()}`;
  const results=await db.batch([
   db.prepare("INSERT INTO quote_throttle(id,hits,token,expires_at) VALUES (?,1,?,?) ON CONFLICT(id) DO UPDATE SET hits = hits + 1, token = excluded.token WHERE hits < 5").bind(hash,token,(hour+1)*3600000),
   db.prepare("INSERT INTO quote_requests(id,reference,payload,name,email,vehicle,created_at,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM quote_throttle WHERE id = ? AND token = ?) ON CONFLICT(id) DO NOTHING").bind(submissionId,reference,payload,data.name,data.email,vehicleLabel(data),now,now,hash,token),
   db.prepare("DELETE FROM quote_throttle WHERE expires_at < ?").bind(now),
  ]);
  if(results[0].meta.changes!==1)return reply({error:"Several requests have been submitted from your connection. Please try again in an hour."},429);
  if(results[1].meta.changes!==1){const prior=await db.prepare("SELECT reference,payload FROM quote_requests WHERE id = ?").bind(submissionId).first<{reference:string;payload:string}>();return prior?.payload===payload?reply({reference:prior.reference}):reply({error:"Your request could not be confirmed. Please try again."},409);}
  return reply({reference},201);
 }catch(e){if(e instanceof SyntaxError)return reply({error:"Invalid request format."},400);console.error("Quote submission failed",e instanceof Error?e.name:"Unknown error");return reply({error:"We couldn’t save your request. Your details are still here—please try again."},503);}
}
