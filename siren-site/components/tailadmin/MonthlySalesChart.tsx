"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type ChartPoint = { label: string; value: number };

/** A compact, live monthly-sales chart for the dashboard. */
export default function MonthlySalesChart({ points }: { points: ChartPoint[] }) {
  const options: ApexOptions = {
    chart: { type: "bar", height: 220, fontFamily: "Outfit, sans-serif", toolbar: { show: false }, zoom: { enabled: false } },
    colors: ["#465FFF"],
    plotOptions: { bar: { borderRadius: 5, columnWidth: "33%" } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: "#f0f2f5", strokeDashArray: 0, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    xaxis: { categories: points.map((point) => point.label), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: "12px", colors: "#667085" } } },
    yaxis: { labels: { style: { fontSize: "12px", colors: ["#667085"] }, formatter: (value) => new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0, notation: "compact" }).format(value) } },
    tooltip: { y: { formatter: (value) => new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(value) } },
  };
  return <div className="tailadmin-monthly-sales-chart"><Chart options={options} series={[{ name: "Oylik savdo", data: points.map((point) => point.value) }]} type="bar" height={220} /></div>;
}
