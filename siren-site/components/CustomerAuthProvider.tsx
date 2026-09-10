"use client";

import { createContext, FormEvent, ReactNode, useContext, useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "siren-customer-token";
type Customer = { id: string; email: string; firstName: string; lastName: string; phone?: string | null; region?: string | null; address?: string; emailVerifiedAt?: string | null; welcomeDiscountEligible?: boolean; welcomeDiscountPercent?: number; metadata?: { notificationPreferences?: { blog?: boolean; discounts?: boolean; products?: boolean } } };
type Step = "email" | "password" | "otp" | "details" | "forgot" | "reset";
type Context = { customer: Customer | null; loading: boolean; openAuth: () => void; signOut: () => void; refresh: () => Promise<void> };
const CustomerAuthContext = createContext<Context | null>(null);
const regions = ["Toshkent", "Andijon", "Buxoro", "Farg‘ona", "Jizzax", "Namangan", "Navoiy", "Qashqadaryo", "Qoraqalpog‘iston", "Samarqand", "Sirdaryo", "Surxondaryo", "Xorazm"];

export async function customerApi(path: string, body?: unknown, token?: string, method = body ? "POST" : "GET") {
  const res = await fetch(`${API}${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.message || "Something went wrong");
  return payload;
}
const request = customerApi;

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setOpen] = useState(false);
  const refresh = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setCustomer(null); return; }
    try { setCustomer(await request("/auth/customer/me", undefined, token)); } catch { localStorage.removeItem(TOKEN_KEY); setCustomer(null); }
  };
  useEffect(() => { void refresh().finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!loading && !customer && !sessionStorage.getItem("siren-auth-dismissed")) {
      const id = window.setTimeout(() => setOpen(true), 850);
      return () => window.clearTimeout(id);
    }
  }, [loading, customer]);
  const signOut = () => { localStorage.removeItem(TOKEN_KEY); setCustomer(null); };
  const value = useMemo(() => ({ customer, loading, openAuth: () => setOpen(true), signOut, refresh }), [customer, loading]);
  return <CustomerAuthContext.Provider value={value}>{children}{isOpen && <AuthModal onClose={() => { sessionStorage.setItem("siren-auth-dismissed", "1"); setOpen(false); }} onAuthenticated={(result) => { localStorage.setItem(TOKEN_KEY, result.accessToken); setCustomer(result.customer); setOpen(false); }} />}</CustomerAuthContext.Provider>;
}
export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  return context;
};

function AuthModal({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: (result: { accessToken: string; customer: Customer }) => void }) {
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
