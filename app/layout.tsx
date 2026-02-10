import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/components/auth-provider";
import { auth } from "@/auth";
import { getSiteContact } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Taxi Tignieu",
  description: "Réservez vos trajets toutes distances avec Taxi Tignieu.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, contact] = await Promise.all([auth(), getSiteContact()]);

  return (
    <html lang="fr" className="scroll-smooth" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {/* Ensure client components receive the server session on first paint */}
        <AuthProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <div className="flex min-h-screen flex-col bg-background text-foreground">
              <SiteHeader phone={contact.phone} />
              <main className="flex-1 pt-20 md:pt-24">{children}</main>
              <SiteFooter />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
