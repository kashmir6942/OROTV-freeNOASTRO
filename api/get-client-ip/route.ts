import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Get client IP from various headers
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")

  const ip = cfConnectingIp || forwarded?.split(",")[0] || realIp || "unknown"

  return NextResponse.json({ ip })
}
