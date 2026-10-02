import { buildHealthReport } from "@/lib/health";

/** Always run at request time: a cached "online" would not be a real check. */
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Success: { success: true, data: { backend, checkedAt, where, services: { … } } }
 * Failure: { success: false, error: { code, message } }
 */
export async function GET() {
  try {
    const report = buildHealthReport("server");
    return Response.json(
      { success: true, data: { backend: "online", ...report } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { success: false, error: { code: "HEALTH_CHECK_FAILED", message: "The health checks could not be run." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
