'use client';
import { Brand } from './carreg-website';
import { useLanguage,LanguageSwitcher } from './language';
export function OwnerGate({signIn}:{signIn?:string}){const {t}=useLanguage();return <main className="owner-gate"><Brand/><LanguageSwitcher/><h1>{t(signIn?'Your enquiries, in one place.':'This area is private.')}</h1><p>{t(signIn?'Sign in with the website owner’s account to manage quote requests.':'Enquiries are only available to the website owner.')}</p>{signIn&&<a className="button button-red" href={signIn} target="_top">{t('Sign in to your inbox')}</a>}<a href="/">{t('Back to the website')}</a></main>;}
