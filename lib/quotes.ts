import { z } from "zod";
import { LANGUAGES } from "@/lib/i18n";

export const COUNTRIES = ["United Kingdom", "Belgium", "Netherlands", "Germany", "France", "Ireland", "Portugal", "Italy", "Switzerland", "Norway", "Sweden", "Denmark", "Poland", "Spain", "Other"] as const;
export const PROVINCES = ["A Coruña", "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Bizkaia", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "Cuenca", "Gipuzkoa", "Girona", "Granada", "Guadalajara", "Huelva", "Huesca", "Illes Balears", "Jaén", "La Rioja", "Las Palmas", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Zamora", "Zaragoza", "Not decided yet"] as const;
export const TYPES = ["Car / SUV", "Van", "Motorcycle", "Camper / motorhome", "Other vehicle"] as const;
export const FUELS = ["Petrol", "Diesel", "Hybrid", "Plug-in hybrid", "Electric", "LPG / other", "Not sure"] as const;
export const PURPOSES = ["Moving to Spain with my vehicle", "Buying / importing a vehicle", "Already in Spain with foreign plates", "Other / I need advice"] as const;
export const STATUSES = ["new", "reviewing", "quoted", "closed"] as const;
const short = (max: number) => z.string().trim().max(max, `Please use ${max} characters or fewer.`);
const required = (label: string, max = 100) => short(max).min(1, `Enter ${label}.`);
const optionalNumber = (max: number) => short(20).refine(v => !v || (/^\d+(\.\d+)?$/.test(v) && Number(v) <= max), `Enter a number between 0 and ${max.toLocaleString("en-GB")}, or leave blank.`);
export const quoteSchema = z.object({
  language: z.enum(LANGUAGES).default("en"),
  vehicleType: z.enum(TYPES), make: required("the vehicle make", 60), model: required("the model", 100), variant: short(100),
  year: required("the first registration year", 4).refine(v => /^\d{4}$/.test(v) && Number(v) >= 1900 && Number(v) <= new Date().getFullYear() + 1, "Enter a valid four-digit year."),
  fuel: z.enum(FUELS), country: z.enum(COUNTRIES), otherCountry: short(80), registration: short(30),
  vin: short(17).transform(v => v.toUpperCase()).refine(v => !v || /^[A-HJ-NPR-Z0-9]{6,17}$/.test(v), "Check the chassis / VIN number (6–17 letters and numbers; no I, O or Q)."),
  engineCC: optionalNumber(30000), co2: optionalNumber(1000), mileage: optionalNumber(3000000),
  purpose: z.enum(PURPOSES), inSpain: z.enum(["Yes", "No", "Arriving soon"]), province: z.enum(PROVINCES), town: short(100),
  steering: z.enum(["Left-hand drive", "Right-hand drive", "Not applicable / not sure"]),
  coc: z.enum(["Yes", "No", "Not sure"]), modified: z.enum(["No", "Yes", "Not sure"]), timeframe: z.enum(["As soon as possible", "Within 1 month", "Within 3 months", "Just planning"]),
  name: required("your full name", 120), email: required("your email address", 200).email("Enter a valid email address.").transform(v => v.toLowerCase()),
  phone: short(40).refine(v => !v || /^[+()\d .-]{7,40}$/.test(v), "Enter a valid phone number, including country code."),
  contact: z.enum(["Email", "Phone", "WhatsApp"]), notes: short(2000),
  consent: z.boolean().refine(v => v, "Please agree to being contacted about your request."),
}).superRefine((data, ctx) => {
  if (data.country === "Other" && !data.otherCountry) ctx.addIssue({code:"custom",path:["otherCountry"],message:"Enter the country of registration."});
  if (data.contact !== "Email" && !data.phone) ctx.addIssue({code:"custom",path:["phone"],message:"Add your phone number for this contact preference."});
});
export type QuoteInput = z.input<typeof quoteSchema>;
export type QuoteData = z.output<typeof quoteSchema>;
export type Status = typeof STATUSES[number];
export const emptyQuote: QuoteInput = {language:"en",vehicleType:"Car / SUV",make:"",model:"",variant:"",year:"",fuel:"Not sure",country:"United Kingdom",otherCountry:"",registration:"",vin:"",engineCC:"",co2:"",mileage:"",purpose:"Moving to Spain with my vehicle",inSpain:"No",province:"Not decided yet",town:"",steering:"Not applicable / not sure",coc:"Not sure",modified:"Not sure",timeframe:"Just planning",name:"",email:"",phone:"",contact:"Email",notes:"",consent:false};
export const STEP_FIELDS: (keyof QuoteInput)[][] = [["vehicleType","make","model","variant","year","fuel","country","otherCountry","registration","vin","engineCC","co2","mileage"],["purpose","inSpain","province","town","steering","coc","modified","timeframe"],["name","email","phone","contact","notes","consent"]];
export type Settings = {contactEmail:string;phone:string;whatsapp:string;legalName:string;address:string};
export const emptySettings:Settings = {contactEmail:"",phone:"",whatsapp:"",legalName:"",address:""};
export const settingsSchema = z.object({contactEmail:short(200).refine(v => !v || z.string().email().safeParse(v).success,"Enter a valid contact email."),phone:short(40).refine(v=>!v||/^[+()\d .-]{7,40}$/.test(v),"Enter a valid phone number."),whatsapp:short(20).refine(v=>!v||/^\+?[1-9]\d{6,14}$/.test(v),"Use an international number, for example +34 followed by the number."),legalName:short(160),address:short(300)});
export type QuoteRecord = {id:string;reference:string;createdAt:number;updatedAt:number;version:number;status:Status;notes:string;data:QuoteData};
export function vehicleLabel(q:QuoteInput){return `${q.year} ${q.make} ${q.model}${q.variant ? ` · ${q.variant}` : ""}`;}
export function countryLabel(q:QuoteInput){return q.country === "Other" ? q.otherCountry : q.country;}
export function csvCell(v:unknown){const s=String(v??"");return `"${(/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replace(/"/g,'""')}"`;}
