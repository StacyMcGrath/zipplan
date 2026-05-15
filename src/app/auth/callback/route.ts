import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/admin";

  // Supabase magic links can arrive in two shapes depending on flow + template:
  //   - PKCE flow: ?code=<auth_code>
  //   - OTP flow:  ?token_hash=<hash>&type=<otp_type>
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return errorRedirect(url.origin, error.message);
    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) return errorRedirect(url.origin, error.message);
    return NextResponse.redirect(new URL(next, url.origin));
  }

  return errorRedirect(
    url.origin,
    "Missing authentication code in callback URL. Check your Supabase email template and Redirect URL allow-list.",
  );
}

function errorRedirect(origin: string, message: string) {
  const params = new URLSearchParams({ error: message });
  return NextResponse.redirect(new URL(`/login?${params.toString()}`, origin));
}
