import { alertsFromSeries, seriesLastSeconds } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export function GET() {
  const now = Date.now();
  const series = seriesLastSeconds(now, 90);
  const alerts = alertsFromSeries(series, now);
  return Response.json({
    generatedAt: now,
    series,
    alerts,
  });
}
