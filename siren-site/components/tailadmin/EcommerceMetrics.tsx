"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { ElementType } from "react";

export type TailAdminMetric = { label: string; value: string; change?: number | null; icon: ElementType };

// Adapted from TailAdmin's EcommerceMetrics: values are supplied by the host
// dashboard, never by template demo data.
export default function EcommerceMetrics({ metrics }: { metrics: TailAdminMetric[] }) {
  return <div className="tailadmin-metric-grid">
    {metrics.map((metric) => {
      const Icon = metric.icon;
      const hasTrend = metric.change !== null && metric.change !== undefined;
      const positive = (metric.change ?? 0) >= 0;
      return <article className="tailadmin-metric-card" key={metric.label}>
        <div className="tailadmin-metric-icon"><Icon size={22} /></div>
        <div className="tailadmin-metric-footer"><div><span>{metric.label}</span><b>{metric.value}</b></div>{hasTrend ? <em className={positive ? "is-positive" : "is-negative"}>{positive ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(metric.change ?? 0).toFixed(1)}%</em> : <em className="is-neutral">—</em>}</div>
      </article>;
    })}
  </div>;
}
