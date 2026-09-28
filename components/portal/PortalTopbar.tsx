"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { Button } from "@/components/ui/Button";

export function PortalTopbar({ label, homeHref }: { label: string; homeHref: string }) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {
      // Even if the call fails, leaving the portal ends the visit.
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <header className="portal-topbar">
      <HorizonsLogo href={homeHref} />
      <p className="portal-topbar-label">{label}</p>
      <Button variant="ghost" size="sm" onClick={signOut} disabled={signingOut}>
        <LogOut size={16} aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </header>
  );
}
