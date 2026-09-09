import { env } from "cloudflare:workers";
import { emptySettings, settingsSchema, type Settings, type QuoteRecord, type Status } from "@/lib/quotes";
export function database():D1Database {if(!env.DB)throw new Error("Enquiry database unavailable.");return env.DB;}
export async function getSettings():Promise<Settings> {const row=await database().prepare("SELECT value FROM site_settings WHERE id = 'contact'").first<{value:string}>();return row?settingsSchema.parse(JSON.parse(row.value)):emptySettings;}
export type QuoteRow={id:string;reference:string;payload:string;status:Status;notes:string;created_at:number;updated_at:number;version:number};
export function quoteView(r:QuoteRow):QuoteRecord{return {id:r.id,reference:r.reference,data:JSON.parse(r.payload),status:r.status,notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at,version:r.version};}
