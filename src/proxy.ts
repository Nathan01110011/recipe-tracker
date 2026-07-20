import { NextResponse, type NextRequest } from "next/server";
import { basicAuthHeaders, isAuthorized, isBasicAuthEnabled } from "@/lib/basic-auth";

export function proxy(request: NextRequest) {
  if (!isBasicAuthEnabled() || isAuthorized(request.headers)) {
    return NextResponse.next();
  }

  return new Response(null, {
    status: 401,
    headers: basicAuthHeaders(),
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
