import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Get IP from various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  
  let ip = "unknown"
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    ip = forwardedFor.split(",")[0].trim()
  } else if (realIp) {
    ip = realIp
  } else if (cfConnectingIp) {
    ip = cfConnectingIp
  }
  
  return NextResponse.json({ ip })
}
