import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

const allowedOrigins = [
  "http://localhost:3000",
  "https://vnguyen.me",
  "https://www.vnguyen.me"
];

const corsOptions = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

export async function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isAllowedOrigin = allowedOrigins.includes(origin) || origin.endsWith(".vnguyen.me");

  // Handle preflighted requests
  const isPreflight = request.method === "OPTIONS";

  if (isPreflight) {
    const preflightHeaders = {
      ...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
      ...corsOptions,
    };
    return new NextResponse(null, { status: 200, headers: preflightHeaders });
  }

  // Authorization check for admin routes
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const token = request.cookies.get("admin_token")?.value;
    const verified = token ? await verifyToken(token) : null;

    if (!verified) {
      const errorHeaders = {
        "Content-Type": "application/json",
        ...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
        ...corsOptions,
      };
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized access" }),
        {
          status: 401,
          headers: errorHeaders,
        }
      );
    }
  }

  // Handle simple/normal requests
  const response = NextResponse.next();

  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Intercept all API routes to handle CORS
export const config = {
  matcher: "/api/:path*",
};

