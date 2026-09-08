import { getDatabase } from "@/infrastructure/database/client";
import { surveys } from "@/infrastructure/database/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDatabase().select({ id: surveys.id }).from(surveys).limit(1);
    return Response.json(
      { status: "ok", storage: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable", storage: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
