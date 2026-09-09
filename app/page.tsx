import { CarregWebsite } from "@/components/carreg-website";
import { getSettings } from "@/db/store";
export const dynamic = "force-dynamic";
export default async function Home() {
  const settings = await getSettings().catch(() => null);
  return <CarregWebsite settings={settings} />;
}
