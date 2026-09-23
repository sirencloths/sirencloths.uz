"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type ChartPoint = { label: string; value: number };

/** TailAdmin StatisticsChart adapted to the host dashboard's live series. */
export default function StatisticsChart({ current, previous, currentLabel = "Joriy davr", previousLabel = "Oldingi davr", mixed = false }: { current: ChartPoint[]; previous: ChartPoint[]; currentLabel?: string; previousLabel?: string; mixed?: boolean }) {
  const labels = Array.from(new Set([...current.map((item) => item.label), ...previous.map((item) => item.label)]));
  const valueFor = (items: ChartPoint[], label: string) => items.find((item) => item.label === label)?.value ?? 0;
  const options: ApexOptions = {
    legend: { show: false },
    colors: ["#465FFF", "#9CB9FF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 310, type: mixed ? "line" : "area", toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: "straight", width: mixed ? [3, 0] : [2.5, 2] },
    fill: mixed ? { opacity: [1, .6] } : { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.35, opacityTo: 0, stops: [0, 100] } },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 6 } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f0f2f5", strokeDashArray: 0, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: "12px", colors: "#667085" } }, tooltip: { enabled: false } },
    yaxis: { labels: { style: { fontSize: "12px", colors: ["#667085"] }, formatter: (value) => new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0, notation: "compact" }).format(value) }, title: { text: "" } },
    tooltip: { enabled: true, shared: true, intersect: false },
  };
  return <div className="tailadmin-statistics-chart"><Chart options={options} series={[{ name: currentLabel, type: mixed ? "line" : "area", data: labels.map((label) => valueFor(current, label)) }, { name: previousLabel, type: mixed ? "bar" : "area", data: labels.map((label) => valueFor(previous, label)) }]} type={mixed ? "line" : "area"} height={310} /></div>;
}
