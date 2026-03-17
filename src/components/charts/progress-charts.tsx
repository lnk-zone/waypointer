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

interface WeeklyActivity {
  week: number;
  actions: number;
}

interface ConfidenceEntry {
  week: number;
  score: number;
}

export function WeeklyActivityChart({ data }: { data: WeeklyActivity[] }) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-text-primary">
          Weekly Activity
        </h3>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickFormatter={(w: number) => `Wk ${w}`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [String(value), "Actions"]}
              labelFormatter={(w) => `Week ${w}`}
            />
            <Bar
              dataKey="actions"
              fill="#2563EB"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ConfidenceChart({ data }: { data: ConfidenceEntry[] }) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-[#059669]" />
        <h3 className="text-sm font-medium text-text-primary">
          Confidence Over Time
        </h3>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickFormatter={(w: number) => `Wk ${w}`}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: "#6B7280" }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [`${value}/5`, "Confidence"]}
              labelFormatter={(w) => `Week ${w}`}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 4, fill: "#059669" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
