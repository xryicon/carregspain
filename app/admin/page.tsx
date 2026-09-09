import { ownerIdentity,ownerSignIn } from '@/lib/owner';
import { EnquiryInbox } from '@/components/enquiry-inbox';
import { OwnerGate } from '@/components/owner-gate';
import { serverLanguage } from '@/lib/server-language';
import { translator } from '@/lib/i18n';
export const dynamic='force-dynamic';
export async function generateMetadata(){return {title:translator(await serverLanguage())('Owner inbox | CARREG SPAIN'),robots:{index:false,follow:false}};}
export default async function Admin(){if(await ownerIdentity())return <EnquiryInbox/>;return <OwnerGate signIn={ownerSignIn()}/>;}
