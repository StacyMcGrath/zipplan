import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  // Probe a table from the initial migration. count=0 with no error means the
  // schema has been applied; an error usually means the migration hasn't run.
  const { error, count } = await supabase
    .from("organizations")
    .select("id", { head: true, count: "exact" });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        connected: true,
        schemaApplied: false,
        message:
          "Connected to Supabase, but the initial migration doesn't appear to have run yet.",
        error: error.message,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    connected: true,
    schemaApplied: true,
    organizationsCount: count ?? 0,
  });
}
