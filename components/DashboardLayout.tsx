"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Award, Briefcase, CalendarCheck, ClipboardCheck, History, Home, KeyRound, LifeBuoy,
  LogOut, Megaphone, Menu, ReceiptText, Rocket, Settings, Sparkles, UsersRound, X,
} from "lucide-react";
import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { navForRole } from "@/lib/nav";
import type { UserRole } from "@/lib/rbac";

const icons: Record<string, typeof Home> = {
  home: Home,
  sparkles: Sparkles,
  history: History,
  users: UsersRound,
  briefcase: Briefcase,
  key: KeyRound,
  clipboard: ClipboardCheck,
  calendar: CalendarCheck,
  award: Award,
  receipt: ReceiptText,
  settings: Settings,
  megaphone: Megaphone,
  rocket: Rocket,
};

export type DashboardUser = {
  name: string;
  role: UserRole;
  roleLabel: string;
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "–";
}

export function DashboardLayout({ children, user, schoolName }: { children: React.ReactNode; user: DashboardUser; schoolName: string }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const sections = navForRole(user.role);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {
      // The session cookie is httpOnly; a failed call still ends below.
    } finally {
      window.location.href = "/login";
    }
  }

  const nav = (
    <nav aria-label="Dashboard">
      {sections.map((section) => (
        <div key={section.label} className="dash-nav-section">
          <p className="dash-nav-heading">{section.label}</p>
          <ul>
            {section.items.map((item) => {
              const Icon = icons[item.icon] ?? Home;
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                    <Icon size={18} aria-hidden="true" /> {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="dash-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <HorizonsLogo />
        </div>
        <div className="dash-nav-scroll">{nav}</div>
        <div className="dash-sidebar-foot">
          <Link href="/support"><LifeBuoy size={18} aria-hidden="true" /> Help & support</Link>
          <button type="button" onClick={signOut} disabled={signingOut}>
            <LogOut size={18} aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {open ? (
        <div className="dash-mobile-nav" role="dialog" aria-label="Dashboard navigation">
          <div className="dash-mobile-head">
            <HorizonsLogo />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
              <X size={20} />
            </button>
          </div>
          <div className="dash-nav-scroll">{nav}</div>
          <div className="dash-sidebar-foot">
            <Link href="/support" onClick={() => setOpen(false)}><LifeBuoy size={18} aria-hidden="true" /> Help & support</Link>
            <button type="button" onClick={signOut} disabled={signingOut}>
              <LogOut size={18} aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="dash-main">
        <header className="dash-topbar">
          <button type="button" className="dash-menu-button" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <p className="dash-school">{schoolName}</p>
          <div className="dash-user">
            <div className="dash-avatar" aria-hidden="true">{initials(user.name)}</div>
            <div>
              <p className="dash-user-name">{user.name}</p>
              <p className="dash-user-role">{user.roleLabel}</p>
            </div>
          </div>
        </header>

        <main className="dash-content" id="main-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
