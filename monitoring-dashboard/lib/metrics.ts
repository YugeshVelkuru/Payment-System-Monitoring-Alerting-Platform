/** Deterministic pseudo-random in [0, 1) from an integer seed. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
}

export type MetricPoint = {
  t: number;
  p95Ms: number;
  errorRate: number;
  rps: number;
};

export type AlertItem = {
  id: string;
  severity: "warning" | "critical";
  message: string;
  firedAt: number;
};

function pointAtSecond(second: number): MetricPoint {
  const p95Ms =
    42 +
    seeded(second) * 55 +
    Math.sin(second / 18) * 22 +
    (second % 11) * 1.2;
  const errorRate = Math.max(
    0,
    0.002 + seeded(second * 3) * 0.012 + Math.sin(second / 24) * 0.006,
  );
  const rps =
    95 + seeded(second * 7) * 140 + Math.sin(second / 9) * 35 + (second % 5) * 3;
  return {
    t: second * 1000,
    p95Ms,
    errorRate,
    rps,
  };
}

export function seriesLastSeconds(nowMs: number, seconds = 90): MetricPoint[] {
  const nowSec = Math.floor(nowMs / 1000);
  const out: MetricPoint[] = [];
  for (let s = nowSec - seconds + 1; s <= nowSec; s++) {
    out.push(pointAtSecond(s));
  }
  return out;
}

export function alertsFromSeries(points: MetricPoint[], nowMs: number): AlertItem[] {
  const alerts: AlertItem[] = [];
  const last = points[points.length - 1];
  if (!last) return alerts;

  if (last.p95Ms > 115) {
    alerts.push({
      id: "lat-p95",
      severity: "critical",
      message: `p95 latency ${last.p95Ms.toFixed(0)}ms exceeds SLO (115ms)`,
      firedAt: nowMs,
    });
  } else if (last.p95Ms > 95) {
    alerts.push({
      id: "lat-p95-warn",
      severity: "warning",
      message: `p95 latency elevated: ${last.p95Ms.toFixed(0)}ms`,
      firedAt: nowMs,
    });
  }

  if (last.errorRate > 0.02) {
    alerts.push({
      id: "err-rate",
      severity: "critical",
      message: `Error rate ${(last.errorRate * 100).toFixed(2)}% > 2%`,
      firedAt: nowMs,
    });
  } else if (last.errorRate > 0.01) {
    alerts.push({
      id: "err-rate-warn",
      severity: "warning",
      message: `Error rate ${(last.errorRate * 100).toFixed(2)}% above 1%`,
      firedAt: nowMs,
    });
  }

  return alerts;
}

export function prometheusText(nowMs: number): string {
  const sec = Math.floor(nowMs / 1000);
  const p = pointAtSecond(sec);
  const success = Math.round(p.rps * (1 - p.errorRate));
  const errors = Math.max(0, Math.round(p.rps * p.errorRate));

  const lines = [
    "# HELP payment_api_requests_total Total payment API requests by status.",
    "# TYPE payment_api_requests_total counter",
    `payment_api_requests_total{status="success"} ${success}`,
    `payment_api_requests_total{status="error"} ${errors}`,
    "",
    "# HELP payment_api_latency_p95_milliseconds Estimated p95 latency in ms.",
    "# TYPE payment_api_latency_p95_milliseconds gauge",
    `payment_api_latency_p95_milliseconds ${p.p95Ms.toFixed(3)}`,
    "",
    "# HELP payment_api_error_rate_ratio Error ratio (0-1).",
    "# TYPE payment_api_error_rate_ratio gauge",
    `payment_api_error_rate_ratio ${p.errorRate.toFixed(6)}`,
    "",
    "# HELP payment_api_up Service is accepting traffic.",
    "# TYPE payment_api_up gauge",
    "payment_api_up 1",
  ];
  return lines.join("\n") + "\n";
}
