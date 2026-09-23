import { useCallback, useEffect, useState } from "react";
import { TailAdminHistoryLine } from "./TailAdminHistoryLine";

type RatePayload = { rates?: Record<string, number | null>; live?: boolean };
type SalesPayload = { chart?: { current?: Array<{ label: string; value: number }>; currentTotal?: number } };
const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? `${window.location.protocol}//${window.location.hostname}:4000/api`;
const money = (value: number, currency: string) => new Intl.NumberFormat("uz-UZ", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value);

export function SalesHistoryChart({ token }: { token: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [currency, setCurrency] = useState("UZS");
  const [rates, setRates] = useState<RatePayload | null>(null);
  const [sales, setSales] = useState<SalesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const headers = { Authorization: `Bearer ${token}` }; const rateResponse = await fetch(`${apiBase()}/admin/currencies/refresh`, { method: "POST", headers }); if (!rateResponse.ok) throw new Error(); setRates(await rateResponse.json() as RatePayload); const query = new URLSearchParams({ period: "custom", metric: "revenue", granularity: "monthly", currency, from, to }); const salesResponse = await fetch(`${apiBase()}/admin/dashboard?${query}`, { headers }); if (!salesResponse.ok) throw new Error(); setSales(await salesResponse.json() as SalesPayload); } catch { setError("Jonli kurs yoki sotuv ma’lumoti yuklanmadi."); } finally { setLoading(false); } }, [currency, from, to, token]);
  useEffect(() => { void load(); }, [load]);
  const points = sales?.chart?.current ?? [];
  const total = sales?.chart?.currentTotal ?? points.reduce((sum, point) => sum + point.value, 0);
  const rate = rates?.rates?.[currency];
  return <section className="business-cost-page sales-history-page"><header className="tailadmin-page-heading"><div><p className="ui-overline">HISTORY</p><h2>Sotuv tarixi</h2><span>Default ko‘rinish: oxirgi 12 oy. Nuqta ustiga olib borsangiz summa chiqadi.</span></div><div className="finance-filters"><label>Valyuta<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{["UZS", "USD", "EUR", "RUB", "KZT"].map((code) => <option key={code}>{code}</option>)}</select></label><label>Dan<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Gacha<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div></header><div className="business-cost-grid cost-history-summary"><article className="is-total"><span>Tanlangan davrdagi umumiy sotuv</span><b>{loading ? "Yuklanmoqda…" : money(total, currency)}</b><small>{from} — {to} · {currency === "UZS" ? "Asosiy valuta" : rate ? `1 ${currency} = ${Math.round(rate).toLocaleString("uz-UZ")} UZS` : "Kurs olinmadi"}</small></article></div><section className="cost-history-chart sales-history-chart"><header><div><h3>Sotuvlar dinamikasi</h3><span>To‘langan online buyurtmalar bo‘yicha oyma-oy savdo.</span></div><i>{rates?.live ? "● Jonli kurs" : "○ Kurs kutilmoqda"}</i></header>{error ? <p className="sales-history-error">{error}</p> : <TailAdminHistoryLine points={points} currency={currency} name="Sotuv" />}</section></section>;
}
