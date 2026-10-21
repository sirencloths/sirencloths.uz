"use client";

import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import { useOverlayHistory } from "./OverlayHistoryProvider";
import { useModalLock } from "./useModalLock";

const API = process.env.NEXT_PUBLIC_API_URL ?? (typeof window === "undefined" ? "http://localhost:4000/api" : `${window.location.protocol}//${window.location.hostname}:4000/api`);
const TOKEN_KEY = "siren-customer-token";
const REFRESH_TOKEN_KEY = "siren-customer-refresh-token";
type Customer = { id: string; email: string; firstName: string; lastName: string; createdAt?: string; phone?: string | null; region?: string | null; address?: string; emailVerifiedAt?: string | null; welcomeDiscountEligible?: boolean; welcomeDiscountPercent?: number; welcomeDiscountExpiresAt?: string | null; metadata?: { notificationPreferences?: { blog?: boolean; discounts?: boolean; products?: boolean } } };
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
  const send = async (accessToken?: string) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      return await fetch(`${API}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new Error("REQUEST_TIMEOUT");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  };
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
  const [guestOfferVisible, setGuestOfferVisible] = useState(false);
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
    if (!customer || isAdminRoute) return;
    const heartbeat = () => { const token = localStorage.getItem(TOKEN_KEY); if (token) void request("/auth/customer/presence", { online: true }, token).catch(() => undefined); };
    const offline = () => { const token = localStorage.getItem(TOKEN_KEY); if (token) void fetch(`${API}/auth/customer/presence`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ online: false }) }).catch(() => undefined); };
    heartbeat(); window.addEventListener("pagehide", offline); const timer = window.setInterval(heartbeat, 30_000);
    return () => { window.clearInterval(timer); window.removeEventListener("pagehide", offline); offline(); };
  }, [customer?.id, isAdminRoute]);
  useEffect(() => {
    const dismissed = sessionStorage.getItem("prevailen-welcome-offer-dismissed") === "1";
    setGuestOfferVisible(!isAdminRoute && !loading && !customer && !dismissed);
  }, [isAdminRoute, loading, customer]);
  const signOut = () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) void fetch(`${API}/auth/customer/logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
    clearCustomerTokens();
    setCustomer(null);
  };
  const value = useMemo(() => ({ customer, loading, openAuth: () => openOverlay("auth"), signOut, refresh }), [customer, loading, openOverlay]);
  const { locale } = useLanguage();
  return <CustomerAuthContext.Provider value={value}>{children}{!isAdminRoute && <WelcomeDiscountTimer customer={customer} onExpired={refresh} />}{!isAdminRoute && guestOfferVisible && !isOpen && <GuestWelcomeOffer onRegister={() => { setGuestOfferVisible(false); openOverlay("auth"); }} onDismiss={() => { sessionStorage.setItem("prevailen-welcome-offer-dismissed", "1"); setGuestOfferVisible(false); }} />}{!isAdminRoute && isOpen && <AuthModal locale={locale} onClose={() => { sessionStorage.setItem("siren-auth-dismissed", "1"); closeOverlay("auth"); }} onAuthenticated={(result) => { storeCustomerTokens(result); setCustomer(result.customer); closeOverlay("auth"); }} />}</CustomerAuthContext.Provider>;
}
export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  return context;
};

function GuestWelcomeOffer({ onRegister, onDismiss }: { onRegister: () => void; onDismiss: () => void }) {
  return <aside className="guest-welcome-offer" aria-label="10 foiz welcome bonus"><button type="button" className="guest-welcome-offer__close" onClick={onDismiss} aria-label="Yopish">×</button><button type="button" className="guest-welcome-offer__cta" onClick={onRegister}>10% OFF</button></aside>;
}

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
  return <aside className="welcome-discount-timer" role="status" aria-label="Welcome chegirma taymeri"><span>WELCOME</span><b>−{customer.welcomeDiscountPercent || 10}%</b><time>{remaining}</time><Link href="/shop">XARID QILISH</Link></aside>;
}

type AuthCopy = { offer: string; offerDescription: string; email: string; continue: string; welcome: string; password: string; signIn: string; forgot: string; checkEmail: string; sent: string; code: string; verify: string; resend: string; details: string; firstName: string; lastName: string; phone: string; region: string; address: string; chooseRegion: string; create: string; newPassword: string; savePassword: string; emailUnavailable: string };
const authCopy: Record<"uz" | "ru" | "en" | "ja", AuthCopy> = {
  uz: { offer: "RO‘YXATDAN O‘TING — 10% CHEGIRMA", offerDescription: "Akkauntingiz bormi? Kirish uchun e-mail manzilingizni yozing.", email: "E-MAIL", continue: "DAVOM ETISH", welcome: "QAYTGANINGIZDAN XURSANDMIZ", password: "PAROL", signIn: "KIRISH", forgot: "PAROLNI UNUTDINGIZMI?", checkEmail: "E-MAILNI TEKSHIRING", sent: "6 xonali kod yuborildi:", code: "KOD", verify: "TASDIQLASH", resend: "KODNI QAYTA YUBORISH", details: "MA’LUMOTLARINGIZ", firstName: "ISM", lastName: "FAMILIYA", phone: "TELEFON", region: "HUDUD", address: "MANZIL (IXTIYORIY)", chooseRegion: "HUDUDNI TANLANG", create: "AKKAUNT YARATISH", newPassword: "YANGI PAROL", savePassword: "PAROLNI SAQLASH", emailUnavailable: "Tasdiqlash kodi yuborilmadi: e-mail xizmatiga ulanib bo‘lmadi. Keyinroq qayta urinib ko‘ring." },
  ru: { offer: "РЕГИСТРАЦИЯ — СКИДКА 10%", offerDescription: "Уже есть аккаунт? Введите e-mail, чтобы войти.", email: "E-MAIL", continue: "ПРОДОЛЖИТЬ", welcome: "С ВОЗВРАЩЕНИЕМ", password: "ПАРОЛЬ", signIn: "ВОЙТИ", forgot: "ЗАБЫЛИ ПАРОЛЬ?", checkEmail: "ПРОВЕРЬТЕ ПОЧТУ", sent: "Мы отправили 6-значный код на", code: "КОД", verify: "ПОДТВЕРДИТЬ", resend: "ОТПРАВИТЬ КОД ЕЩЁ РАЗ", details: "ВАШИ ДАННЫЕ", firstName: "ИМЯ", lastName: "ФАМИЛИЯ", phone: "ТЕЛЕФОН", region: "РЕГИОН", address: "АДРЕС (НЕОБЯЗАТЕЛЬНО)", chooseRegion: "ВЫБЕРИТЕ РЕГИОН", create: "СОЗДАТЬ АККАУНТ", newPassword: "НОВЫЙ ПАРОЛЬ", savePassword: "СОХРАНИТЬ ПАРОЛЬ", emailUnavailable: "Код не отправлен: не удалось подключиться к почтовому сервису. Попробуйте позже." },
  en: { offer: "SIGN UP — GET 10% OFF", offerDescription: "Already have an account? Enter your email to sign in.", email: "EMAIL ADDRESS", continue: "CONTINUE", welcome: "WELCOME BACK", password: "PASSWORD", signIn: "SIGN IN", forgot: "FORGOT PASSWORD?", checkEmail: "CHECK YOUR EMAIL", sent: "We sent a 6-digit code to", code: "CODE", verify: "VERIFY", resend: "RESEND CODE", details: "YOUR DETAILS", firstName: "FIRST NAME", lastName: "LAST NAME", phone: "PHONE", region: "REGION", address: "ADDRESS (OPTIONAL)", chooseRegion: "SELECT REGION", create: "CREATE ACCOUNT", newPassword: "NEW PASSWORD", savePassword: "SAVE PASSWORD", emailUnavailable: "The code could not be sent because the email service is unavailable. Please try again later." },
  ja: { offer: "登録して10% OFF", offerDescription: "アカウントをお持ちの場合は、メールアドレスを入力してください。", email: "メールアドレス", continue: "続ける", welcome: "おかえりなさい", password: "パスワード", signIn: "ログイン", forgot: "パスワードを忘れた場合", checkEmail: "メールを確認", sent: "6桁のコードを送信しました:", code: "コード", verify: "確認", resend: "コードを再送", details: "お客様情報", firstName: "名", lastName: "姓", phone: "電話", region: "地域", address: "住所（任意）", chooseRegion: "地域を選択", create: "アカウントを作成", newPassword: "新しいパスワード", savePassword: "保存", emailUnavailable: "メールサービスに接続できないため、認証コードを送信できません。しばらくしてから再試行してください。" },
};

function AuthModal({ locale, onClose, onAuthenticated }: { locale: "uz" | "ru" | "en" | "ja"; onClose: () => void; onAuthenticated: (result: TokenPair & { customer: Customer }) => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState(""); const [token, setToken] = useState("");
  const [details, setDetails] = useState({ firstName: "", lastName: "", phone: "+998", region: "", address: "", password: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [visual, setVisual] = useState<{ desktopImageUrl?: string; mobileImageUrl?: string }>({});
  const copy = authCopy[locale] ?? authCopy.en;
  useEffect(() => { void fetch(`${API}/content/auth-modal`).then((response) => response.ok ? response.json() : {}).then((value) => setVisual(value)).catch(() => undefined); }, []);
  const submit = async (action: () => Promise<void>) => { setError(""); setBusy(true); try { await action(); } catch (e) { const message = e instanceof Error ? e.message : ""; setError(/REQUEST_TIMEOUT|Email delivery|Failed to fetch|NetworkError/i.test(message) ? copy.emailUnavailable : message || copy.emailUnavailable); } finally { setBusy(false); } };
  const emailSubmit = (event: FormEvent) => { event.preventDefault(); void submit(async () => { const result = await request("/auth/customer/email", { email }); setEmail(result.email); setStep(result.next === "password" ? "password" : "otp"); }); };
  const verify = (event: FormEvent) => { event.preventDefault(); void submit(async () => { const result = await request(`/auth/customer/${step === "forgot" ? "password-reset/verify" : "verify-registration"}`, { email, code }); setToken(result.verificationToken); setStep(step === "forgot" ? "reset" : "details"); }); };
  const register = (event: FormEvent) => { event.preventDefault(); void submit(async () => onAuthenticated(await request("/auth/customer/register", { verificationToken: token, ...details }))); };
  const imageUrl = visual.desktopImageUrl?.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${visual.desktopImageUrl}` : visual.desktopImageUrl || "/images/p1.jpg";
  const mobileImageUrl = visual.mobileImageUrl?.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${visual.mobileImageUrl}` : visual.mobileImageUrl || imageUrl;
  return <div className="customer-auth-backdrop" role="dialog" aria-modal="true" aria-label={copy.offer}><section className="customer-auth-modal">
    <div className="customer-auth-visual"><picture><source media="(max-width: 760px)" srcSet={mobileImageUrl} /><img src={imageUrl} alt="" /></picture></div><div className="customer-auth-content"><button type="button" className="customer-auth-close" onClick={onClose} aria-label="Close"><img src="/icons/close.svg" alt="" /></button>
    {step === "email" && <form onSubmit={emailSubmit}><h2>{copy.offer}</h2><p>{copy.offerDescription}</p><label>{copy.email}<input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><button disabled={busy}>{busy ? "..." : copy.continue}</button></form>}
    {step === "password" && <form onSubmit={(e) => { e.preventDefault(); void submit(async () => onAuthenticated(await request("/auth/customer/login", { email, password }))); }}><h2>{copy.welcome}</h2><p>{email}</p><label>{copy.password}<input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label><button disabled={busy}>{busy ? "..." : copy.signIn}</button><button type="button" className="customer-auth-text" onClick={() => { setStep("forgot"); void submit(async () => { await request("/auth/customer/password-reset/request", { email }); }); }}>{copy.forgot}</button></form>}
    {(step === "otp" || step === "forgot") && <form onSubmit={verify}><h2>{copy.checkEmail}</h2><p>{copy.sent} {email}</p><label>{copy.code}<input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required /></label><button disabled={busy || code.length !== 6}>{busy ? "..." : copy.verify}</button><button type="button" className="customer-auth-text" onClick={() => void submit(async () => { await request(step === "forgot" ? "/auth/customer/password-reset/request" : "/auth/customer/email", { email }); })}>{copy.resend}</button></form>}
    {step === "details" && <form onSubmit={register}><h2>{copy.details}</h2><div className="customer-auth-grid">{([ ["firstName", copy.firstName], ["lastName", copy.lastName], ["phone", copy.phone], ["region", copy.region], ["address", copy.address], ["password", copy.password] ] as const).map(([key, label]) => <label key={key}>{label}{key === "region" ? <select value={details.region} onChange={(e) => setDetails({ ...details, region: e.target.value })} required><option value="">{copy.chooseRegion}</option>{regions.map((region) => <option key={region}>{region}</option>)}</select> : <input type={key === "password" ? "password" : "text"} value={details[key]} onChange={(e) => setDetails({ ...details, [key]: e.target.value })} required={key !== "address"} minLength={key === "password" ? 8 : undefined} />}</label>)}</div><button disabled={busy}>{busy ? "..." : copy.create}</button></form>}
    {step === "reset" && <form onSubmit={(e) => { e.preventDefault(); void submit(async () => onAuthenticated(await request("/auth/customer/password-reset/complete", { verificationToken: token, password }))); }}><h2>{copy.newPassword}</h2><label>{copy.newPassword}<input autoFocus type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button disabled={busy}>{copy.savePassword}</button></form>}
    {error && <p className="customer-auth-error">{error}</p>}
  </div></section></div>;
}
