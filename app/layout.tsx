import type { Metadata } from "next";
import { Public_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const bodySans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const displaySans = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taxi Tignieu",
  description: "Réservez vos trajets toutes distances avec Taxi Tignieu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${bodySans.variable} ${displaySans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
