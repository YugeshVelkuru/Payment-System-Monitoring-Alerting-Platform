"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MetricPoint = {
  t: number;
  p95Ms: number;
  errorRate: number;
  rps: number;
};

type AlertItem = {
  id: string;
  severity: "warning" | "critical";
  message: string;
  firedAt: number;
};

type Payload = {
  generatedAt: number;
  series: MetricPoint[];
  alerts: AlertItem[];
};

const pollMs = 2500;

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function Dashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Payload;
      setData(json);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(id);
  }, [load]);

  const chartData =
    data?.series.map((p) => ({
      label: formatTime(p.t),
      p95Ms: Math.round(p.p95Ms * 10) / 10,
      errorPct: Math.round(p.errorRate * 10000) / 100,
      rps: Math.round(p.rps * 10) / 10,
    })) ?? [];

  const last = data?.series[data.series.length - 1];

  return (
    <div className="min-h-full bg-[#0b0c0e] text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-[#111214] px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">

          <div className="text-right text-xs text-zinc-500">
            {data ? (
              <>
                <div>Updated {formatTime(data.generatedAt)}</div>
                <div className="text-zinc-600">Refresh every {pollMs / 1000}s</div>
              </>
            ) : (
              <span>Loading…</span>
            )}
          </div>
        </div>
      </header>

      {err && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="p95 latency"
            value={last ? `${last.p95Ms.toFixed(0)} ms` : "—"}
            hint="Target under 115 ms"
            accent="border-l-orange-500"
          />
          <StatCard
            title="Error rate"
            value={last ? `${(last.errorRate * 100).toFixed(2)}%` : "—"}
            hint="Target &lt; 1% warn · 2% page"
            accent="border-l-amber-500"
          />
          <StatCard
            title="Throughput"
            value={last ? `${last.rps.toFixed(0)} req/s` : "—"}
            hint="Simulated checkout API"
            accent="border-l-emerald-500"
          />
          <StatCard
            title="Active alerts"
            value={data ? String(data.alerts.length) : "—"}
            hint="Derived from latest sample"
            accent="border-l-red-500"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Panel title="Latency (p95)">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      domain={["auto", "auto"]}
                      label={{
                        value: "ms",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#71717a",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "#e4e4e7" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="p95Ms"
                      name="p95 (ms)"
                      stroke="#fb923c"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Error rate (% of requests)">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="errFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="errorPct"
                      name="errors %"
                      stroke="#f87171"
                      fill="url(#errFill)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Throughput (req/s)">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rps"
                      name="req/s"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel title="Alerts">
              {!data?.alerts.length ? (
                <p className="text-sm text-zinc-500">
                  No thresholds firing on the latest sample.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.alerts.map((a) => (
                    <li
                      key={a.id}
                      className={`rounded-md border px-3 py-2 text-sm ${a.severity === "critical"
                          ? "border-red-900/70 bg-red-950/50 text-red-100"
                          : "border-amber-900/60 bg-amber-950/40 text-amber-100"
                        }`}
                    >
                      <span className="text-xs uppercase text-zinc-400">
                        {a.severity}
                      </span>
                      <div className="mt-1">{a.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Endpoints">
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>
                  <span className="text-zinc-500">Dashboard JSON · </span>
                  <code className="text-orange-200">GET /api/dashboard</code>
                </li>
                <li>
                  <span className="text-zinc-500">Prometheus · </span>
                  <code className="text-orange-200">GET /api/metrics</code>
                </li>
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                In production, Prometheus scrapes <code>/metrics</code> on your
                services; Grafana reads from Prometheus. This project mirrors the
                contract with a serverless-friendly demo.
              </p>
            </Panel>
          </aside>
        </div>
      </main>

      <footer className="border-t border-zinc-800/80 px-6 py-6 text-center text-xs text-zinc-600">
        Deploy on Vercel from the <code className="text-zinc-500">monitoring-dashboard</code>{" "}
        folder · Node 20+ for local dev
      </footer>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800/90 bg-[#131416] shadow-sm shadow-black/40">
      <div className="border-b border-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-300">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-800/90 bg-[#131416] px-4 py-3 ${accent} border-l-4`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}
