"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";

interface ActivationDay {
  date: string;
  count: number;
}

interface ModuleEngagement {
  module: string;
  usage_count: number;
}

export function ActivationsChart({ data }: { data: ActivationDay[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 text-primary" />
        Activations Over Time
      </h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#6B7280" }}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6B7280" }}
              allowDecimals={false}
            />
            <Tooltip
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              }
              formatter={(value) => [String(value), "Activations"]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#2563EB"
              strokeWidth={2}
              dot={{ r: 3, fill: "#2563EB" }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-sm text-text-secondary">
          No activation data yet
        </div>
      )}
    </div>
  );
}

export function EngagementChart({ data }: { data: ModuleEngagement[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-1.5">
        <BarChart3 className="h-4 w-4 text-primary" />
        Engagement by Module
      </h3>
      {data.some((m) => m.usage_count > 0) ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#6B7280" }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="module"
              tick={{ fontSize: 10, fill: "#6B7280" }}
              tickFormatter={(value) =>
                value.charAt(0).toUpperCase() + value.slice(1)
              }
            />
            <Tooltip
              formatter={(value) => [String(value), "Actions"]}
            />
            <Bar
              dataKey="usage_count"
              fill="#2563EB"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-sm text-text-secondary">
          No engagement data yet
        </div>
      )}
    </div>
  );
}
