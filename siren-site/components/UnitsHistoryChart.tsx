import { useCallback, useEffect, useState } from "react";
import { TailAdminHistoryLine } from "./TailAdminHistoryLine";

type UnitsPayload = { chart?: { current?: Array<{ label: string; value: number }>; currentTotal?: number } };
const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? `${window.location.protocol}//${window.location.hostname}:4000/api`;

export function UnitsHistoryChart({ token }: { token: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<UnitsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const query = new URLSearchParams({ period: "custom", metric: "units", granularity: "monthly", from, to }); const response = await fetch(`${apiBase()}/admin/dashboard?${query}`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error(); setData(await response.json() as UnitsPayload); } catch { setError("Sotilgan birliklar ma’lumoti yuklanmadi."); } finally { setLoading(false); } }, [from, to, token]);
  useEffect(() => { void load(); }, [load]);
  const points = data?.chart?.current ?? [];
  const total = data?.chart?.currentTotal ?? points.reduce((sum, point) => sum + point.value, 0);
  return <section className="business-cost-page units-history-page"><header className="tailadmin-page-heading"><div><p className="ui-overline">HISTORY</p><h2>Sotilgan birliklar tarixi</h2><span>Default ko‘rinish: oxirgi 12 oy. Har bir sotilgan dona hisobga olinadi.</span></div><div className="finance-filters"><label>Dan<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Gacha<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div></header><div className="business-cost-grid cost-history-summary"><article className="is-total"><span>Tanlangan davrda sotilgan birliklar</span><b>{loading ? "Yuklanmoqda…" : `${Math.round(total).toLocaleString("uz-UZ")} ta`}</b><small>{from} — {to}</small></article></div><section className="cost-history-chart"><header><div><h3>Sotilgan birliklar dinamikasi</h3><span>Faqat to‘langan buyurtmalardagi mahsulot donalari.</span></div><i>● Sotilgan dona</i></header>{error ? <p className="sales-history-error">{error}</p> : <TailAdminHistoryLine points={points} unit="ta" name="Sotilgan birlik" />}</section></section>;
}
