"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
export type HistoryPoint = { label: string; value: number };

export function TailAdminHistoryLine({ points, currency, unit, name }: { points: HistoryPoint[]; currency?: string; unit?: string; name: string }) {
  const compact = (value: number) => `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: currency === "UZS" ? 0 : 2, notation: "compact" }).format(value)}${currency ? "" : ` ${unit ?? ""}`}`;
  const value = (amount: number) => currency ? new Intl.NumberFormat("uz-UZ", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(amount) : `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(amount)} ${unit ?? ""}`;
  const options: ApexOptions = { chart: { type: "area", height: 360, fontFamily: "Outfit, sans-serif", toolbar: { show: false }, zoom: { enabled: false } }, colors: ["#465FFF"], stroke: { curve: "smooth", width: 3 }, fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.32, opacityTo: 0.02, stops: [0, 100] } }, dataLabels: { enabled: false }, markers: { size: 0, strokeColors: "#fff", strokeWidth: 3, hover: { size: 7, sizeOffset: 1 } }, grid: { borderColor: "#eef2f6", strokeDashArray: 0, padding: { left: 8, right: 18, top: 4, bottom: 0 }, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } }, xaxis: { categories: points.map((point) => point.label), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#98A2B3", fontSize: "12px" }, rotate: 0, hideOverlappingLabels: true } }, yaxis: { labels: { style: { colors: ["#98A2B3"], fontSize: "12px" }, formatter: compact } }, tooltip: { enabled: true, shared: true, intersect: false, y: { formatter: value } }, legend: { show: false } };
  return <div className="tailadmin-history-line"><Chart options={options} series={[{ name, data: points.map((point) => point.value) }]} type="area" height={360} /></div>;
}
