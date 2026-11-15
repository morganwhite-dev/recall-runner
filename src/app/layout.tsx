import type { Metadata } from "next";
import { Archivo, Red_Hat_Mono } from "next/font/google";
import { IconSprite } from "@/components/Icon";
import "./globals.css";

// Archivo carries the width axis so headlines can run condensed (font-stretch) from one file.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Labels, case numbers and the MODEL / RULE / TOOL / YOU marks.
const redHatMono = Red_Hat_Mono({
  variable: "--font-red-hat-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recall Runner",
  description:
    "An AI agent finds a store's buyers affected by a product recall and settles each one through PayPal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${redHatMono.variable}`}>
      <body>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
