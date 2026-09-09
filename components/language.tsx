'use client';
import { createContext,useContext,useState,useEffect,type ReactNode } from 'react';
import { Globe2 } from 'lucide-react';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import { LANGUAGES,LANGUAGE_NAMES,isLanguage,translator,type Language } from '@/lib/i18n';
const LanguageContext=createContext({language:'en' as Language,setLanguage:(_language:Language)=>{}});
export function LanguageProvider({children,initialLanguage}:{children:ReactNode;initialLanguage:Language}){
 const [language,setLanguage]=useState(initialLanguage);
 useEffect(()=>{const requested=new URLSearchParams(window.location.search).get('lang');if(isLanguage(requested))setLanguage(requested);},[]);
 useEffect(()=>{document.documentElement.lang=language;document.cookie=`carreg_language=${language}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol==='https:'?'; Secure':''}`;const t=translator(language);document.title=t(window.location.pathname==='/admin'?'Owner inbox | CARREG SPAIN':window.location.pathname==='/privacy'?'Privacy & your request | CARREG SPAIN':'CARREG SPAIN | Vehicle Registration Made Simple');},[language]);
 return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){const context=useContext(LanguageContext);return {...context,t:translator(context.language)};}
export function LanguageSwitcher(){const {language,setLanguage,t}=useLanguage();return <Select value={language} onValueChange={value=>{if(isLanguage(value)){setLanguage(value);const url=new URL(window.location.href);url.searchParams.set('lang',value);window.history.replaceState(null,'',url);}}}><SelectTrigger className="language-switcher" aria-label={t('Website language')}><Globe2 size={16}/><SelectValue>{language.toUpperCase()}</SelectValue></SelectTrigger><SelectContent position="popper">{LANGUAGES.map(code=><SelectItem value={code} key={code}>{LANGUAGE_NAMES[code]}</SelectItem>)}</SelectContent></Select>;}
