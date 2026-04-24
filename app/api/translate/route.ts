import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await request.json()

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { text: translatedText } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `Translate the following text from ${sourceLanguage || "auto-detect"} to ${targetLanguage}. Only provide the translation, nothing else.

Text to translate: "${text}"`,
    })

    return NextResponse.json({
      translatedText: translatedText.trim(),
      detectedLanguage: sourceLanguage,
      targetLanguage,
    })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ error: "Translation failed" }, { status: 500 })
  }
}
