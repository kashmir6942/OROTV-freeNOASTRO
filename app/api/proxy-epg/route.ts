import { type NextRequest, NextResponse } from "next/server"
import { gunzipSync } from "zlib"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    console.log(`[EPG Proxy] Fetching: ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[EPG Proxy] HTTP error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        {
          error: `Failed to fetch EPG: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      )
    }

    let data: string
    const contentType = response.headers.get("content-type") || ""
    const contentEncoding = response.headers.get("content-encoding") || ""

    console.log(`[EPG Proxy] Content-Type: ${contentType}, Content-Encoding: ${contentEncoding}`)

    try {
      const buffer = await response.arrayBuffer()

      if (buffer.byteLength === 0) {
        throw new Error("Empty response buffer")
      }

      const bufferView = new Uint8Array(buffer)

      // Check if content is gzipped by URL extension, content-encoding header, or magic bytes
      const isGzipped =
        url.endsWith(".gz") || contentEncoding.includes("gzip") || (bufferView[0] === 0x1f && bufferView[1] === 0x8b) // gzip magic bytes

      if (isGzipped) {
        console.log("[EPG Proxy] Decompressing gzipped content")
        try {
          const decompressed = gunzipSync(Buffer.from(buffer))
          data = decompressed.toString("utf-8")
        } catch (gzipError) {
          console.error("[EPG Proxy] Gzip decompression failed, trying as plain text:", gzipError)
          data = Buffer.from(buffer).toString("utf-8")
        }
      } else {
        data = Buffer.from(buffer).toString("utf-8")
      }

      const trimmedData = data.trim()
      if (!trimmedData.startsWith("<?xml") && !trimmedData.startsWith("<tv") && !trimmedData.includes("<tv")) {
        console.error("[EPG Proxy] Invalid XML format detected")
        throw new Error("Invalid XML format - content does not appear to be valid EPG XML")
      }
    } catch (processingError) {
      console.error("[EPG Proxy] Content processing error:", processingError)
      return NextResponse.json(
        {
          error: `Failed to process EPG data: ${processingError instanceof Error ? processingError.message : "Unknown error"}`,
        },
        { status: 500 },
      )
    }

    console.log(`[EPG Proxy] Successfully processed ${data.length} characters`)

    if (data.length < 100) {
      console.error("[EPG Proxy] Response too short, likely invalid")
      return NextResponse.json(
        {
          error: "Invalid EPG response - too short",
        },
        { status: 500 },
      )
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=1800", // Cache for 30 minutes
      },
    })
  } catch (error) {
    console.error("[EPG Proxy] Error:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json({ error: "Request timeout" }, { status: 408 })
      }
      return NextResponse.json(
        {
          error: `EPG fetch failed: ${error.message}`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: "Unknown EPG fetch error" }, { status: 500 })
  }
}
