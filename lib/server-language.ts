import { cookies } from 'next/headers';
import { isLanguage,type Language } from './i18n';
export async function serverLanguage():Promise<Language>{const value=(await cookies()).get('carreg_language')?.value;return isLanguage(value)?value:'en';}
