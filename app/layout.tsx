import type { Metadata } from "next";
import { Bowlby_One, Caveat, Special_Elite } from "next/font/google";
import { PaperDefs } from "@/components/paper/PaperDefs";
import "./globals.css";

const bowlby = Bowlby_One({ variable: "--font-bowlby", weight: "400", subsets: ["latin"] });
const elite = Special_Elite({ variable: "--font-elite", weight: "400", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hivemind Simulator",
  description: "Type any event, watch a simulated internet react.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bowlby.variable} ${elite.variable} ${caveat.variable} antialiased`}>
        <PaperDefs />
        {children}
      </body>
    </html>
  );
}
