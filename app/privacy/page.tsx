import { getSettings } from '@/db/store';
import { emptySettings } from '@/lib/quotes';
import { PrivacyContent } from '@/components/privacy-content';
import { serverLanguage } from '@/lib/server-language';
import { translator } from '@/lib/i18n';
export async function generateMetadata(){return {title:translator(await serverLanguage())('Privacy & your request | CARREG SPAIN')};}
export const dynamic='force-dynamic';
export default async function Privacy(){return <PrivacyContent settings={await getSettings().catch(()=>emptySettings)}/>;}
