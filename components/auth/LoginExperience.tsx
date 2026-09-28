"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { roleExperiences, roleLabels, UserRole } from "@/lib/rbac";
import { roleHome } from "@/lib/nav";
import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { createBrowserSupabaseClient, hasBrowserSupabaseConfig } from "@/lib/supabase/browser";
import { Alert, type AlertTone } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Invalid email or password. Check your details, or use password reset/sign-in link below.";
  if (lower.includes("already registered") || lower.includes("already been registered") || lower.includes("user already")) return "This email already has an account. Switch to Sign in, or reset your password if you do not remember it.";
  if (lower.includes("email not confirmed")) return "Please confirm your email address before signing in. Check your inbox.";
  return message;
}

export function LoginExperience() {
  const [role, setRole] = useState<UserRole>("SCHOOL_OWNER");
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in with your school account, or create the first owner account for a new school.");
  const [messageTone, setMessageTone] = useState<AlertTone>("info");
  const [loading, setLoading] = useState(false);
  const selected = useMemo(() => roleExperiences.find((item) => item.role === role) ?? roleExperiences[0], [role]);

  function say(text: string, tone: AlertTone = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("reset") === "1") {
        setMode("reset");
        say("Enter a new password to complete account recovery.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function acceptInviteIfPresent() {
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) return;
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message ?? "Unable to accept invitation");
  }

  async function sendPasswordReset() {
    if (!email) {
      say("Enter your email address first, then request password reset.", "warning");
      return;
    }
    setLoading(true);
    try {
      if (!hasBrowserSupabaseConfig()) throw new Error("Authentication is not configured yet.");
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/login?reset=1")}` });
      if (error) throw error;
      say("Password reset link sent. Check your email inbox.", "success");
    } catch (error) {
      say(error instanceof Error ? friendlyAuthError(error.message) : "Unable to send password reset.", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    if (!email) {
      say("Enter your email address first, then request a sign-in link.", "warning");
      return;
    }
    setLoading(true);
    try {
      if (!hasBrowserSupabaseConfig()) throw new Error("Authentication is not configured yet.");
      const supabase = createBrowserSupabaseClient();
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
      if (error) throw error;
      say("Sign-in link sent. Check your email inbox.", "success");
    } catch (error) {
      say(error instanceof Error ? friendlyAuthError(error.message) : "Unable to send sign-in link.", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    say(mode === "signin" ? "Signing in..." : mode === "signup" ? "Creating account..." : "Updating password...");

    try {
      if (!hasBrowserSupabaseConfig()) {
        say("Authentication is not configured yet. Add Supabase environment variables to enable access.", "warning");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          say(friendlyAuthError(error.message), "danger");
          return;
        }
        say("Password updated. You can now sign in with your new password.", "success");
        setPassword("");
        setMode("signin");
        return;
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          say(friendlyAuthError(error.message), "danger");
          return;
        }
        await acceptInviteIfPresent();
        const next = new URLSearchParams(window.location.search).get("next");
        if (next) {
          window.location.href = next;
          return;
        }
        try {
          const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
          const payload = await sessionResponse.json();
          const role = payload?.session?.user?.role as UserRole | undefined;
          window.location.href = role ? roleHome(role) : "/dashboard";
        } catch {
          window.location.href = "/dashboard";
        }
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/setup` },
      });
      if (error) {
        const friendly = friendlyAuthError(error.message);
        say(friendly, "danger");
        if (friendly.includes("already has an account")) setMode("signin");
        return;
      }

      if (data.session) {
        await acceptInviteIfPresent().catch(() => undefined);
        window.location.href = new URLSearchParams(window.location.search).get("invite") ? "/dashboard" : "/dashboard/setup";
        return;
      }

      say("Account created. Check your email to confirm your account, then sign in.", "success");
      setMode("signin");
    } catch (error) {
      say(error instanceof Error ? friendlyAuthError(error.message) : "Unable to continue.", "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand-logo"><HorizonsLogo href="" /></div>
        <span className="ui-eyebrow ui-eyebrow-light"><ShieldCheck size={14} /> Secure School OS</span>
        <h1>Role-aware access built for serious school operations.</h1>
        <p>Horizons is designed for owners, principals, teachers, accountants, parents and students — each with a focused workspace and permission boundary.</p>
        <div className="login-showcase">
          <strong>{selected.workspace}</strong>
          <span>{selected.headline}</span>
          <div>{selected.metrics.map((metric) => <small key={metric}>{metric}</small>)}</div>
        </div>
      </section>

      <section className="login-card">
        <span className="ui-eyebrow">Secure Access</span>
        <h2>{mode === "signin" ? "Sign in to Horizons" : mode === "signup" ? "Create school owner account" : "Set a new password"}</h2>
        <p>{mode === "signin" ? "Access your school workspace." : mode === "signup" ? "Create the first account, then set up your school profile." : "Complete password recovery for your account."}</p>

        {mode !== "reset" ? (
          <div className="ui-segmented" role="group" aria-label="Authentication mode">
            <button type="button" aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>Sign in</button>
            <button type="button" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>Create account</button>
          </div>
        ) : null}

        {mode !== "reset" ? (
          <div className="ui-segmented" role="group" aria-label="Your role">
            {roleExperiences.filter((item) => mode === "signup" ? item.role === "SCHOOL_OWNER" : true).map((item) => (
              <button key={item.role} type="button" aria-pressed={item.role === role} onClick={() => setRole(item.role)}>
                {roleLabels[item.role]}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="ui-form">
          {mode === "signup" ? (
            <Field label="Full name" required>
              {(id) => <Input id={id} value={name} onChange={(event) => setName(event.target.value)} type="text" required placeholder="School owner name" autoComplete="name" leading={<UserRound size={18} aria-hidden="true" />} />}
            </Field>
          ) : null}
          {mode !== "reset" ? (
            <Field label="Email address" required>
              {(id) => <Input id={id} value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="you@school.com" autoComplete="email" leading={<Mail size={18} aria-hidden="true" />} />}
            </Field>
          ) : null}
          <Field label="Password" required hint={mode === "reset" ? undefined : "Minimum 6 characters"}>
            {(id) => (
              <Input
                id={id}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                leading={<LockKeyhole size={18} aria-hidden="true" />}
                trailing={
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            )}
          </Field>

          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />} {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Update password"}
          </Button>
        </form>
        {mode === "signin" ? (
          <div className="auth-recovery-actions">
            <Button variant="secondary" size="sm" onClick={sendPasswordReset} disabled={loading}><KeyRound size={15} /> Reset password</Button>
            <Button variant="secondary" size="sm" onClick={sendMagicLink} disabled={loading}><Mail size={15} /> Email sign-in link</Button>
          </div>
        ) : null}
        <Alert tone={messageTone}><p>{message}</p></Alert>
        <Button href="/contact" variant="ghost">Need access? Contact your school administrator</Button>
      </section>
    </main>
  );
}
