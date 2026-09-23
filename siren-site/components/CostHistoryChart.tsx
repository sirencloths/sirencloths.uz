import { useMemo, useState } from "react";
import { TailAdminHistoryLine } from "./TailAdminHistoryLine";

type Variant = { inventoryQuantity: number; offlineInventoryQuantity?: number; totalInventoryAdded?: number; attributes?: Record<string, unknown> };
type Product = { createdAt?: string; variants: Variant[] };
const numberOf = (value: unknown) => { const number = Number(String(value ?? 0).replace(/[^0-9.-]/g, "")); return Number.isFinite(number) ? number : 0; };
const money = (value: number) => `${Math.round(value).toLocaleString("uz-UZ")} UZS`;
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) => new Intl.DateTimeFormat("uz-UZ", { month: "short", year: "numeric" }).format(new Date(`${key}-01T00:00:00`));

export function CostHistoryChart({ products }: { products: Product[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const events = useMemo(() => products.flatMap((product) => product.variants.map((variant) => ({ date: (product.createdAt || today).slice(0, 10), value: numberOf(variant.attributes?.costPrice) * Math.max(0, numberOf(variant.totalInventoryAdded) || numberOf(variant.inventoryQuantity) + numberOf(variant.offlineInventoryQuantity)) }))).filter((item) => item.value > 0).sort((left, right) => left.date.localeCompare(right.date)), [products, today]);
  const start = from || defaultFrom;
  const end = to && to >= start ? to : start;
  const beforePeriod = events.filter((item) => item.date < start).reduce((sum, item) => sum + item.value, 0);
  const inPeriod = events.filter((item) => item.date >= start && item.date <= end);
  const rangeTotal = inPeriod.reduce((sum, item) => sum + item.value, 0);
  const months: string[] = []; const cursor = new Date(`${start.slice(0, 7)}-01T00:00:00`); const last = new Date(`${end.slice(0, 7)}-01T00:00:00`);
  while (cursor <= last) { months.push(monthKey(cursor)); cursor.setMonth(cursor.getMonth() + 1); }
  let running = beforePeriod;
  const points = months.map((month) => { running += inPeriod.filter((item) => item.date.startsWith(month)).reduce((sum, item) => sum + item.value, 0); return { label: monthLabel(month), value: running }; });
  return <section className="business-cost-page cost-history-page"><header className="tailadmin-page-heading"><div><p className="ui-overline">HISTORY</p><h2>Asl narx tarixi</h2><span>Default ko‘rinish: oxirgi 12 oy. Nuqta ustiga olib borsangiz summa chiqadi.</span></div><div className="finance-filters"><label>Dan<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Gacha<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div></header><div className="business-cost-grid cost-history-summary"><article className="is-total"><span>Tanlangan davrdagi umumiy asl narx</span><b>{money(rangeTotal)}</b><small>{start} — {end}</small></article></div><section className="cost-history-chart"><header><div><h3>Asl narx dinamikasi</h3><span>Oylar kesimida yig‘ma tannarx.</span></div><i>● Yig‘ma asl narx</i></header><TailAdminHistoryLine points={points} name="Asl narx" /></section></section>;
}
