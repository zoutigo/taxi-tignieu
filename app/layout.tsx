import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/components/auth-provider";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Taxi Tignieu",
  description: "Réservez vos trajets toutes distances avec Taxi Tignieu.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

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
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
