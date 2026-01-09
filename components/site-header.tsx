"use client";

import Link from "next/link";
import { PhoneCall, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { SiteLogo } from "@/components/site-logo";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Avis", href: "/avis" },
  { label: "FAQ", href: "/faq" },
  { label: "Réservation", href: "/reserver" },
  { label: "À propos", href: "/apropos" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { status, data } = useSession();
  const isAuthenticated = status === "authenticated";
  const isAdminLike = Boolean(
    (data?.user as { isAdmin?: boolean; isManager?: boolean } | undefined)?.isAdmin ||
      (data?.user as { isAdmin?: boolean; isManager?: boolean } | undefined)?.isManager
  );

  const toggleMenu = () =>
    setMenuOpen((prev) => {
      const next = !prev;
      if (next) setIsHidden(false);
      setAccountMenuOpen(false);
      return next;
    });
  const closeMenu = () => setMenuOpen(false);
  const handleLogin = () => {
    void signIn("google", { callbackUrl: "/espace-client" });
  };
  const handleLogout = () => {
    void signOut({ callbackUrl: "/" });
  };

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;

      // Hide quickly when scrolling down, show when scrolling up or near top
      if (delta > 6 && current > 32) {
        setIsHidden(true);
      } else if (delta < -6 || current <= 16) {
        setIsHidden(false);
      }

      lastScrollY.current = current;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hideHeader = !menuOpen && isHidden;

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-sidebar/95 text-sidebar-foreground shadow-[0_12px_30px_rgba(2,8,18,0.65)] backdrop-blur-md transition-transform duration-150 will-change-transform ${
          hideHeader ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <SiteLogo />
            <div className="flex flex-col">
              <span className="font-display text-lg font-semibold">Taxi Tignieu</span>
              <span className="text-xs font-medium text-white/70">À votre service 24/7</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/80 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-white"
                prefetch={false}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div ref={accountMenuRef} className="relative hidden md:flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (isAuthenticated) {
                    setAccountMenuOpen((prev) => !prev);
                    setIsHidden(false);
                  } else {
                    handleLogin();
                  }
                }}
                aria-label={isAuthenticated ? "Ouvrir l'espace client" : "Se connecter"}
                aria-expanded={accountMenuOpen}
                className={`h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border transition md:inline-flex ${
                  isAuthenticated
                    ? "border-emerald-400 text-emerald-300 hover:border-emerald-300 hover:text-emerald-200"
                    : "border-white/20 text-white hover:border-primary/80 hover:text-primary"
                }`}
              >
                <UserRound className="h-5 w-5" />
              </button>

              {accountMenuOpen && isAuthenticated ? (
                <div className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-2xl border border-border/70 bg-card/95 text-sm text-foreground shadow-[0_18px_35px_rgba(8,22,49,0.22)] backdrop-blur">
                  <div className="flex flex-col divide-y divide-border/70">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold transition hover:bg-muted/70 cursor-pointer"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        router.push("/espace-client");
                      }}
                    >
                      Espace client
                    </button>
                    {isAdminLike ? (
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold transition hover:bg-muted/70 cursor-pointer"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          router.push("/dashboard");
                        }}
                      >
                        Dashboard
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-destructive transition hover:bg-muted/70 cursor-pointer"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={toggleMenu}
              aria-label="Ouvrir le menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 text-white transition hover:border-primary/80 hover:text-primary md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div>
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={closeMenu}
          >
            <div
              className="ml-auto flex h-full w-80 max-w-full flex-col gap-6 overflow-y-auto border-l border-white/10 bg-sidebar px-6 py-6 text-sidebar-foreground shadow-[0_25px_60px_rgba(1,6,18,0.8)]"
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
                {isAdminLike ? (
                  <Link
                    href="/dashboard"
                    className="rounded-2xl border border-transparent px-2 py-2 transition hover:border-white/15 hover:text-white"
                    onClick={closeMenu}
                  >
                    Dashboard
                  </Link>
                ) : null}
              </nav>

              <div className="space-y-4">
                <ThemeToggle />
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="btn btn-outline w-full"
                    onClick={() => {
                      closeMenu();
                      router.push("/espace-client");
                    }}
                  >
                    Espace client
                  </button>
                ) : null}
                {isAdminLike ? (
                  <button
                    type="button"
                    className="btn btn-outline w-full"
                    onClick={() => {
                      closeMenu();
                      router.push("/dashboard");
                    }}
                  >
                    Dashboard
                  </button>
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
                    Se connecter
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
