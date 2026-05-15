import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Dev-only sign-in shortcut. Uses the service-role API to generate a magic
// link, then redirects you straight to it — no email involved. Returns 404
// in production builds so this can never be hit on a deployed server.
//
// Usage: visit /api/dev/sign-in?email=you@example.com  (optional &next=/path)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not available in production", { status: 404 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const next = url.searchParams.get("next") ?? "/admin";

  if (!email) {
    return NextResponse.json(
      {
        error:
          "Provide ?email=you@example.com (and optional &next=/path) in the URL.",
      },
      { status: 400 },
    );
  }

  const callback = new URL("/auth/callback", url.origin);
  callback.searchParams.set("next", next);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: callback.toString() },
  });

  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to generate link" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(actionLink);
}
