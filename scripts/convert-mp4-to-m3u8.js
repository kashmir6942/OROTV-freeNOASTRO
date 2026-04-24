import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execAsync = promisify(exec)

async function convertMP4toM3U8(inputDir, outputDir) {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Get all MP4 files
    const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".mp4"))

    console.log(`[v0] Found ${files.length} MP4 files to convert`)

    for (const file of files) {
      const inputPath = path.join(inputDir, file)
      const outputName = path.basename(file, ".mp4")
      const outputPath = path.join(outputDir, outputName)

      // Create subdirectory for each episode
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true })
      }

      const m3u8Path = path.join(outputPath, "playlist.m3u8")

      console.log(`[v0] Converting: ${file}`)

      // FFmpeg command for HLS conversion
      const command = `ffmpeg -i "${inputPath}" -c:v libx264 -preset medium -b:v 2500k -c:a aac -b:a 128k -hls_time 10 -hls_list_size 0 -f hls "${m3u8Path}"`

      await execAsync(command)
      console.log(`[v0] ✓ Converted: ${file} -> ${outputName}/playlist.m3u8`)
    }

    console.log("[v0] All conversions complete!")
  } catch (error) {
    console.error("[v0] Conversion error:", error.message)
  }
}

// Usage
const inputDir = "./public/videos/mp4" // Your MP4 files
const outputDir = "./public/videos/hls" // Output HLS files

convertMP4toM3U8(inputDir, outputDir)
