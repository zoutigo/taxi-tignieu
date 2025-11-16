"use client";

import Link from "next/link";
import { Car, PhoneCall, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const navLinks = [
  { label: "Tarifs", href: "/tarifs" },
  { label: "Services", href: "#services" },
  { label: "Avis", href: "#avis" },
  { label: "Entreprises", href: "#entreprises" },
  { label: "À propos", href: "#a-propos" },
  { label: "Contact", href: "#contact" },
];

const defaultLoginProviderId = process.env.NEXT_PUBLIC_AUTH_PROVIDER_ID ?? "google";
const e2eLoginEmail = process.env.NEXT_PUBLIC_E2E_TEST_USER_EMAIL;
const e2eLoginName = process.env.NEXT_PUBLIC_E2E_TEST_USER_NAME;

declare global {
  interface Window {
    __E2E_AUTH_PROVIDER__?: string;
    __E2E_LOGIN_EMAIL__?: string;
    __E2E_LOGIN_NAME__?: string;
  }
}

const getRuntimeLoginConfig = () => {
  if (typeof window !== "undefined") {
    const providerOverride = window.__E2E_AUTH_PROVIDER__;
    const emailOverride = window.__E2E_LOGIN_EMAIL__;
    const nameOverride = window.__E2E_LOGIN_NAME__;

    return {
      provider: providerOverride ?? defaultLoginProviderId,
      email: emailOverride ?? e2eLoginEmail,
      name: nameOverride ?? e2eLoginName,
    };
  }

  return {
    provider: defaultLoginProviderId,
    email: e2eLoginEmail,
    name: e2eLoginName,
  };
};

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);
  const handleLogin = () => {
    const { provider, email, name } = getRuntimeLoginConfig();
    const loginOptions: Record<string, string> = { callbackUrl: "/espace-client" };

    if (provider !== "google") {
      if (email) {
        loginOptions.email = email;
      }
      if (name) {
        loginOptions.name = name;
      }
    }

    void signIn(provider, loginOptions);
  };
  const handleLogout = () => {
    void signOut({ redirectTo: "/" });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-sidebar/95 text-sidebar-foreground shadow-[0_12px_30px_rgba(2,8,18,0.65)] backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_15px_25px_rgba(246,196,49,0.45)]">
              <Car className="h-6 w-6" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-semibold">Taxi Tignieu</span>
              <span className="text-xs font-medium text-white/70">À votre service 24/7</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/espace-client"
                  className="btn btn-outline hidden text-sm lg:inline-flex"
                >
                  Espace client
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-secondary hidden text-sm lg:inline-flex"
                >
                  Se déconnecter
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="btn btn-outline hidden text-sm lg:inline-flex"
              >
                Login
              </button>
            )}
            <a
              href="tel:+33495785400"
              className="hidden items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-sidebar-foreground transition hover:border-primary/80 hover:text-primary lg:flex"
            >
              <PhoneCall className="h-4 w-4" />
              Appeler
            </a>
            <Link href="/reserver" className="btn btn-primary hidden text-sm lg:inline-flex">
              Réserver
            </Link>
            <button
              type="button"
              onClick={toggleMenu}
              aria-label="Ouvrir le menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 text-white transition hover:border-primary/80 hover:text-primary lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={closeMenu}
          >
            <div
              className="ml-auto flex h-full w-80 max-w-full flex-col gap-6 border-l border-white/10 bg-sidebar px-6 py-6 text-sidebar-foreground shadow-[0_25px_60px_rgba(1,6,18,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Menu</p>
                  <p className="font-display text-xl">Taxi Tignieu</p>
                </div>
                <button
                  onClick={closeMenu}
                  aria-label="Fermer le menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 text-white transition hover:border-primary/70 hover:text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-4 text-base font-medium text-white/90">
                {navLinks.map((link) => (
                  <Link
                    key={`drawer-${link.href}`}
                    href={link.href}
                    className="rounded-2xl border border-transparent px-2 py-2 transition hover:border-white/15 hover:text-white"
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="space-y-4">
                <ThemeToggle />
                {isAuthenticated ? (
                  <Link
                    href="/espace-client"
                    className="btn btn-outline w-full"
                    onClick={closeMenu}
                  >
                    Espace client
                  </Link>
                ) : null}
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    onClick={() => {
                      closeMenu();
                      handleLogout();
                    }}
                  >
                    Se déconnecter
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline w-full"
                    onClick={() => {
                      closeMenu();
                      handleLogin();
                    }}
                  >
                    Login
                  </button>
                )}
                <a
                  href="tel:+33495785400"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary/70 hover:text-primary"
                  onClick={closeMenu}
                >
                  <PhoneCall className="h-4 w-4" />
                  Appeler
                </a>
                <Link href="/reserver" className="btn btn-primary w-full" onClick={closeMenu}>
                  Réserver
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
