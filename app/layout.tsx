import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language";
import { serverLanguage } from "@/lib/server-language";
import { translator } from "@/lib/i18n";

export async function generateMetadata():Promise<Metadata>{const t=translator(await serverLanguage());return {
  title: t("CARREG SPAIN | Vehicle Registration Made Simple"),
  description: t("Vehicle registration support in Spain, from import advice and ITV to DGT paperwork and Spanish plates. Request your personalised quote."),
  icons: {
    icon: "/images/carreg-logo.jpeg",
    shortcut: "/images/carreg-logo.jpeg",
  },
};}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language=await serverLanguage();
  return (
    <html lang={language}>
      <body className="antialiased"><LanguageProvider initialLanguage={language}>{children}</LanguageProvider></body>
    </html>
  );
}
