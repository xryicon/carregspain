import nl from './locales/nl.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
export const LANGUAGES = ['en','nl','fr','de'] as const;
export type Language = typeof LANGUAGES[number];
export const LANGUAGE_NAMES:Record<Language,string> = {en:'English',nl:'Nederlands',fr:'Français',de:'Deutsch'};
export const LANGUAGE_REGIONS:Record<Language,string> = {en:'en-GB',nl:'nl-NL',fr:'fr-FR',de:'de-DE'};
const dictionaries:Record<string,Record<string,string>> = {nl,fr,de};
export function isLanguage(value:unknown):value is Language {return typeof value === 'string' && LANGUAGES.includes(value as Language);}
export function translate(language:Language,text:string,values:Record<string,string|number> = {}) {
 const english:Record<string,string>={en:'English',nl:'Dutch',fr:'French',de:'German',new:'New',reviewing:'In review',quoted:'Quoted',closed:'Closed'};
 const translated=language==='en'?(english[text]??text):(dictionaries[language]?.[text]??text);
 return translated.replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(values,key)?String(values[key]):match);
}
export function translator(language:Language){return (text:string,values?:Record<string,string|number>)=>translate(language,text,values);}

export function localizedError(language:Language,message?:string):string {
 if(!message)return '';
 if(message.includes('\n'))return message.split('\n').map(line=>localizedError(language,line)).join('\n');
 const t=translator(language);
 const length=message.match(/^Please use (\d+) characters or fewer\.$/);
 if(length)return t('Please use {max} characters or fewer.',{max:length[1]});
 const number=message.match(/^Enter a number between 0 and ([\d,]+), or leave blank\.$/);
 if(number)return t('Enter a number between 0 and {max}, or leave blank.',{max:Number(number[1].replaceAll(',','')).toLocaleString(LANGUAGE_REGIONS[language])});
 if(message==='Required'||message.startsWith('Invalid enum value')||message.startsWith('Expected '))return t('Please check this field.');
 return t(message);
}
