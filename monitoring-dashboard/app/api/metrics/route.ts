import { prometheusText } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export function GET() {
  const body = prometheusText(Date.now());
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
