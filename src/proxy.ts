import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const verified = token ? await verifyToken(token) : null;

  if (!verified) {
    return new NextResponse(
      JSON.stringify({ error: "Unauthorized access" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return NextResponse.next();
}

// Intercept all requests under /api/admin/*
export const config = {
  matcher: "/api/admin/:path*",
};
