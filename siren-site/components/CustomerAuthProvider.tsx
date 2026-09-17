"use client";

import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useOverlayHistory } from "./OverlayHistoryProvider";
import { useModalLock } from "./useModalLock";

const API = process.env.NEXT_PUBLIC_API_URL ?? (typeof window === "undefined" ? "http://localhost:4000/api" : `${window.location.protocol}//${window.location.hostname}:4000/api`);
const TOKEN_KEY = "siren-customer-token";
const REFRESH_TOKEN_KEY = "siren-customer-refresh-token";
type Customer = { id: string; email: string; firstName: string; lastName: string; phone?: string | null; region?: string | null; address?: string; emailVerifiedAt?: string | null; welcomeDiscountEligible?: boolean; welcomeDiscountPercent?: number; welcomeDiscountExpiresAt?: string | null; metadata?: { notificationPreferences?: { blog?: boolean; discounts?: boolean; products?: boolean } } };
type Step = "email" | "password" | "otp" | "details" | "forgot" | "reset";
type Context = { customer: Customer | null; loading: boolean; openAuth: () => void; signOut: () => void; refresh: () => Promise<void> };
const CustomerAuthContext = createContext<Context | null>(null);
const regions = ["Toshkent", "Andijon", "Buxoro", "Farg‘ona", "Jizzax", "Namangan", "Navoiy", "Qashqadaryo", "Qoraqalpog‘iston", "Samarqand", "Sirdaryo", "Surxondaryo", "Xorazm"];

type TokenPair = { accessToken: string; refreshToken: string; accessTokenExpiresIn: number; refreshTokenExpiresIn: number };
let customerRefreshInFlight: Promise<string | null> | null = null;

function storeCustomerTokens(tokens: TokenPair) {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

function clearCustomerTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshCustomerAccessToken() {
  if (typeof window === "undefined") return null;
  if (!customerRefreshInFlight) {
    customerRefreshInFlight = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;
      const response = await fetch(`${API}/auth/customer/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.accessToken || !payload.refreshToken) {
        // Only an explicit authentication rejection means the 30-day session
        // is over.  A temporary network/server error must never erase a valid
        // browser session during a page reload.
        if (response.status === 401 || response.status === 403) {
          clearCustomerTokens();
          window.dispatchEvent(new Event("siren-customer-unauthorized"));
        }
        return null;
      }
      storeCustomerTokens(payload as TokenPair);
      return payload.accessToken as string;
    })().catch(() => null).finally(() => { customerRefreshInFlight = null; });
  }
  return customerRefreshInFlight;
}

export async function customerApi(path: string, body?: unknown, token?: string, method = body ? "POST" : "GET") {
  const send = (accessToken?: string) => fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let res = await send(token);
  if (res.status === 401 && token) {
    const renewedToken = await refreshCustomerAccessToken();
    if (renewedToken) res = await send(renewedToken);
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.message || "Something went wrong");
  return payload;
}
const request = customerApi;

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOverlayOpen, openOverlay, closeOverlay } = useOverlayHistory();
  const isOpen = isOverlayOpen("auth");
  useModalLock(isOpen);
  const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  const refresh = useCallback(async () => {
    // On a new page load renew first.  The stored access token remains a
    // fallback during a temporary backend/network interruption.
    const renewedToken = localStorage.getItem(REFRESH_TOKEN_KEY) ? await refreshCustomerAccessToken() : null;
    const token = renewedToken || localStorage.getItem(TOKEN_KEY);
    if (!token) { setCustomer(null); return; }
    try { setCustomer(await request("/auth/customer/me", undefined, token)); } catch { setCustomer(null); }
  }, []);
  useEffect(() => { void refresh().finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!isAdminRoute && !loading && !customer && !sessionStorage.getItem("siren-auth-dismissed")) {
      const id = window.setTimeout(() => openOverlay("auth"), 850);
      return () => window.clearTimeout(id);
    }
  }, [isAdminRoute, loading, customer]);
  const signOut = () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) void fetch(`${API}/auth/customer/logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
    clearCustomerTokens();
    setCustomer(null);
  };
  const value = useMemo(() => ({ customer, loading, openAuth: () => openOverlay("auth"), signOut, refresh }), [customer, loading, openOverlay]);
  return <CustomerAuthContext.Provider value={value}>{children}{!isAdminRoute && <WelcomeDiscountTimer customer={customer} onExpired={refresh} />}{!isAdminRoute && isOpen && <AuthModal onClose={() => { sessionStorage.setItem("siren-auth-dismissed", "1"); closeOverlay("auth"); }} onAuthenticated={(result) => { storeCustomerTokens(result); setCustomer(result.customer); closeOverlay("auth"); }} />}</CustomerAuthContext.Provider>;
}
export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  return context;
};

function WelcomeDiscountTimer({ customer, onExpired }: { customer: Customer | null; onExpired: () => Promise<void> }) {
  const expiresAt = customer?.welcomeDiscountExpiresAt;
  const [remaining, setRemaining] = useState("");
  const handledExpiry = useRef<string | null>(null);
  useEffect(() => {
    if (!customer?.welcomeDiscountEligible || !expiresAt) { setRemaining(""); handledExpiry.current = null; return; }
    const expiryKey = `${customer.id}:${expiresAt}`;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((new Date(expiresAt).valueOf() - Date.now()) / 1000));
      if (!seconds) {
        setRemaining("");
        // The account is refreshed once when this offer expires.  Without this
        // guard an expired offer could trigger refresh → render → refresh.
        if (handledExpiry.current !== expiryKey) {
          handledExpiry.current = expiryKey;
          void onExpired();
        }
        return;
      }
      const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60); const secs = seconds % 60;
      setRemaining(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };
    update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer);
  }, [customer?.id, customer?.welcomeDiscountEligible, expiresAt, onExpired]);
  if (!customer?.welcomeDiscountEligible || !remaining) return null;
  return <aside className="welcome-discount-timer" role="status" aria-label="Welcome chegirma taymeri"><span>WELCOME</span><b>−{customer.welcomeDiscountPercent || 15}%</b><time>{remaining}</time><Link href="/shop">XARID QILISH</Link></aside>;
}

function AuthModal({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: (result: TokenPair & { customer: Customer }) => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState(""); const [token, setToken] = useState("");
  const [details, setDetails] = useState({ firstName: "", lastName: "", phone: "+998", region: "", address: "", password: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (action: () => Promise<void>) => { setError(""); setBusy(true); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(false); } };
  const emailSubmit = (event: FormEvent) => { event.preventDefault(); void submit(async () => { const result = await request("/auth/customer/email", { email }); setEmail(result.email); setStep(result.next === "password" ? "password" : "otp"); }); };
  const verify = (event: FormEvent) => { event.preventDefault(); void submit(async () => { const result = await request(`/auth/customer/${step === "forgot" ? "password-reset/verify" : "verify-registration"}`, { email, code }); setToken(result.verificationToken); setStep(step === "forgot" ? "reset" : "details"); }); };
  const register = (event: FormEvent) => { event.preventDefault(); void submit(async () => onAuthenticated(await request("/auth/customer/register", { verificationToken: token, ...details }))); };
  return <div className="customer-auth-backdrop" role="dialog" aria-modal="true" aria-label="Sign in or register"><section className="customer-auth-modal">
    <button type="button" className="customer-auth-close" onClick={onClose} aria-label="Close">×</button><p className="customer-auth-brand">SIREN</p>
    {step === "email" && <form onSubmit={emailSubmit}><h2>REGISTER AND GET 15% OFF</h2><p>Already registered? Just enter your email.</p><label>EMAIL<input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><button disabled={busy}>{busy ? "..." : "CONTINUE"}</button></form>}
    {step === "password" && <form onSubmit={(e) => { e.preventDefault(); void submit(async () => onAuthenticated(await request("/auth/customer/login", { email, password }))); }}><h2>WELCOME BACK</h2><p>{email}</p><label>PASSWORD<input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label><button disabled={busy}>{busy ? "..." : "SIGN IN"}</button><button type="button" className="customer-auth-text" onClick={() => { setStep("forgot"); void submit(async () => { await request("/auth/customer/password-reset/request", { email }); }); }}>FORGOT PASSWORD?</button></form>}
    {(step === "otp" || step === "forgot") && <form onSubmit={verify}><h2>CHECK YOUR EMAIL</h2><p>We sent a 6-digit code to {email}</p><label>CODE<input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required /></label><button disabled={busy || code.length !== 6}>{busy ? "..." : "VERIFY"}</button><button type="button" className="customer-auth-text" onClick={() => void submit(async () => { await request(step === "forgot" ? "/auth/customer/password-reset/request" : "/auth/customer/email", { email }); })}>RESEND CODE</button></form>}
    {step === "details" && <form onSubmit={register}><h2>YOUR DETAILS</h2><div className="customer-auth-grid">{([ ["firstName", "FIRST NAME"], ["lastName", "LAST NAME"], ["phone", "PHONE"], ["region", "REGION"], ["address", "ADDRESS (OPTIONAL)"], ["password", "PASSWORD"] ] as const).map(([key, label]) => <label key={key}>{label}{key === "region" ? <select value={details.region} onChange={(e) => setDetails({ ...details, region: e.target.value })} required><option value="">SELECT REGION</option>{regions.map((region) => <option key={region}>{region}</option>)}</select> : <input type={key === "password" ? "password" : "text"} value={details[key]} onChange={(e) => setDetails({ ...details, [key]: e.target.value })} required={key !== "address"} minLength={key === "password" ? 8 : undefined} />}</label>)}</div><button disabled={busy}>{busy ? "..." : "CREATE ACCOUNT"}</button></form>}
    {step === "reset" && <form onSubmit={(e) => { e.preventDefault(); void submit(async () => onAuthenticated(await request("/auth/customer/password-reset/complete", { verificationToken: token, password }))); }}><h2>NEW PASSWORD</h2><label>NEW PASSWORD<input autoFocus type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button disabled={busy}>SAVE PASSWORD</button></form>}
    {error && <p className="customer-auth-error">{error}</p>}
  </section></div>;
}
