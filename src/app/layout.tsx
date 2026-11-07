import type { Metadata, Viewport } from "next";
import { Big_Shoulders, DM_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { FaixaPiracema } from "@/components/FaixaPiracema";
import { Cabecalho } from "@/components/Cabecalho";
import { NavegacaoBase } from "@/components/Navegacao";
import { RegistrarSW } from "@/components/RegistrarSW";
import { SITE } from "@/config/site";

const display = Big_Shoulders({ subsets: ["latin", "latin-ext"], weight: ["600", "800", "900"], variable: "--fonte-display" });
const corpo = Instrument_Sans({ subsets: ["latin", "latin-ext"], variable: "--fonte-corpo" });
const mono = DM_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], variable: "--fonte-mono" });

export const metadata: Metadata = {
  title: { default: `${SITE.nome} · ${SITE.significado} em ${SITE.regiao}`, template: `%s · ${SITE.nome}` },
  description: SITE.descricao,
  applicationName: SITE.nome,
  robots: { index: false, follow: false },
  icons: { icon: "/icons/favicon.png", apple: "/icons/apple-touch.png" },
  appleWebApp: { capable: true, title: SITE.nome, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#11170f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${corpo.variable} ${mono.variable}`}>
      <body>
        <Cabecalho />
        <FaixaPiracema />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-16 md:pt-6">{children}</main>
        <NavegacaoBase />
        <RegistrarSW />
      </body>
    </html>
  );
}
