"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { SOURCES } from "@/lib/constants";

interface PricePoint {
  product_id: number;
  izvor: string;
  cena: number;
  recorded_at: string;
}

interface ChartDataPoint {
  date: string;
  [izvor: string]: string | number;
}

const SOURCE_COLORS = [
  "#c8e64a", "#f59e0b", "#10b981", "#6366f1", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-RS").format(price);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export default function PriceChart({ matchKey }: { matchKey: string }) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/price-history/${encodeURIComponent(matchKey)}`);
        if (!res.ok) return;
        const points: PricePoint[] = await res.json();

        if (points.length === 0) {
          setLoading(false);
          return;
        }

        // Grupiši po datumu
        const dateMap = new Map<string, Record<string, number>>();
        const sourceSet = new Set<string>();

        for (const p of points) {
          sourceSet.add(p.izvor);
          if (!dateMap.has(p.recorded_at)) {
            dateMap.set(p.recorded_at, {});
          }
          dateMap.get(p.recorded_at)![p.izvor] = p.cena;
        }

        const sortedDates = [...dateMap.keys()].sort();
        const chartData: ChartDataPoint[] = sortedDates.map((date) => ({
          date,
          ...dateMap.get(date)!,
        }));

        setData(chartData);
        setSources([...sourceSet]);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [matchKey]);

  if (loading) {
    return (
      <div className="bg-[#16181d] border border-[#2a2d35] p-6">
        <div className="h-[250px] flex items-center justify-center text-[#555963] text-sm">
          Učitavam grafikon...
        </div>
      </div>
    );
  }

  if (data.length < 2) return null;

  return (
    <div className="bg-[#16181d] border border-[#2a2d35]">
      <div className="px-4 py-3 border-b border-[#2a2d35]">
        <h2 className="text-sm font-bold text-[#e0e2e7] uppercase tracking-wider">
          Kretanje cena
        </h2>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#555963"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#2a2d35" }}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              stroke="#555963"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#16181d",
                border: "1px solid #2a2d35",
                borderRadius: 0,
                fontSize: 12,
              }}
              labelFormatter={(label) => formatDate(String(label))}
              formatter={(value, name) => [
                `${formatPrice(Number(value))} RSD`,
                SOURCES[String(name)]?.label || String(name),
              ]}
            />
            <Legend
              formatter={(value: string) => SOURCES[value]?.label || value}
              wrapperStyle={{ fontSize: 11, color: "#8b8f9a" }}
            />
            {sources.map((izvor, i) => (
              <Line
                key={izvor}
                type="monotone"
                dataKey={izvor}
                stroke={SOURCES[izvor]?.color || SOURCE_COLORS[i % SOURCE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
