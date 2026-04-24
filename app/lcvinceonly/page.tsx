"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Copy, Mic, Volume2 } from "lucide-react"

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "tl", name: "Tagalog" },
]

export default function LiveCaptionsPage() {
  const router = useRouter()
  const [isListening, setIsListening] = useState(false)
  const [captions, setCaptions] = useState<Array<{ id: string; original: string; translated: string; time: string }>>(
    [],
  )
  const [targetLanguage, setTargetLanguage] = useState("en")
  const [detectedLanguage, setDetectedLanguage] = useState("Spanish")
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [audioSource, setAudioSource] = useState<"microphone" | "system">("microphone")
  const [enableTranslation, setEnableTranslation] = useState(true)
  const [captionFontSize, setCaptionFontSize] = useState("medium")
  const [fontColor, setFontColor] = useState("#ffffff")
  const [bgColor, setBgColor] = useState("#000000")

  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const captionsContainerRef = useRef<HTMLDivElement>(null)

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "es-ES" // Default to Spanish for anime

      recognitionRef.current.onstart = () => {
        setIsListening(true)
      }

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " "
          } else {
            interimTranscript += transcript
          }
        }

        const currentCaption = finalTranscript || interimTranscript
        if (currentCaption.trim()) {
          if (finalTranscript) {
            handleTranslate(finalTranscript)
          }
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const captureSystemAudio = async () => {
    try {
      if (audioSource === "system") {
        // Try to capture system audio using getDisplayMedia
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        })
        mediaStreamRef.current = stream
        setupAudioContext(stream)
      } else {
        // Capture microphone audio
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream
        setupAudioContext(stream)
      }
    } catch (error) {
      console.error("Error capturing audio:", error)
      alert("Could not access audio. Please check permissions.")
    }
  }

  const setupAudioContext = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const source = audioContextRef.current.createMediaStreamSource(stream)
    source.connect(audioContextRef.current.destination)
  }

  const handleTranslate = async (text: string) => {
    if (!text.trim() || !enableTranslation) {
      addCaption(text, "")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage: detectedLanguage,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        addCaption(text, data.translatedText)
      } else {
        addCaption(text, "")
      }
    } catch (error) {
      console.error("Translation error:", error)
      addCaption(text, "")
    } finally {
      setIsLoading(false)
    }
  }

  const addCaption = (original: string, translated: string) => {
    const newCaption = {
      id: Date.now().toString(),
      original,
      translated,
      time: new Date().toLocaleTimeString(),
    }
    setCaptions((prev) => [...prev, newCaption])

    // Auto-scroll to latest caption
    setTimeout(() => {
      if (captionsContainerRef.current) {
        captionsContainerRef.current.scrollTop = captionsContainerRef.current.scrollHeight
      }
    }, 0)
  }

  const toggleListening = async () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    } else {
      setCaptions([])
      await captureSystemAudio()
      recognitionRef.current.start()
    }
  }

  const handleLanguageChange = (lang: string) => {
    setTargetLanguage(lang)
  }

  const copyToClipboard = () => {
    const text = captions.map((c) => `${c.original} -> ${c.translated}`).join("\n")
    navigator.clipboard.writeText(text)
  }

  const fontSizeClass = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
  }[captionFontSize]

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 p-4 flex justify-between items-center bg-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
            title="Settings"
          >
            <Settings size={24} />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Volume2 size={28} className="text-blue-400" />
            Live Translate
          </h1>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/salvadoronlyadminpanel")}
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
          >
            Go to Admin Panel
          </Button>
          <Button
            onClick={() => router.push("/permanent")}
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
          >
            Go to Live Playlist
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Settings Panel - Left Side */}
        {showSettings && (
          <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Settings</h2>

            <div className="space-y-6">
              {/* Audio Source */}
              <div>
                <label className="block text-sm font-medium mb-2">Audio Source</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="microphone"
                      checked={audioSource === "microphone"}
                      onChange={(e) => setAudioSource(e.target.value as "microphone" | "system")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Microphone</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="system"
                      checked={audioSource === "system"}
                      onChange={(e) => setAudioSource(e.target.value as "microphone" | "system")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">System Audio</span>
                  </label>
                </div>
              </div>

              {/* Input Language */}
              <div>
                <label className="block text-sm font-medium mb-2">Input Language</label>
                <Select value={detectedLanguage} onValueChange={setDetectedLanguage}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.name}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Translation Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableTranslation}
                    onChange={(e) => setEnableTranslation(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Enable real-time translation</span>
                </label>
              </div>

              {/* Target Language */}
              {enableTranslation && (
                <div>
                  <label className="block text-sm font-medium mb-2">Translate to</label>
                  <Select value={targetLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Caption Style */}
              <div className="pt-4 border-t border-slate-700">
                <h3 className="font-medium mb-4">Caption Style</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Font Size</label>
                    <div className="flex gap-2">
                      {["small", "medium", "large"].map((size) => (
                        <button
                          key={size}
                          onClick={() => setCaptionFontSize(size)}
                          className={`px-3 py-1 rounded text-sm capitalize ${
                            captionFontSize === size ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Font Color</label>
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Background Color</label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Captions Display */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={captionsContainerRef}>
            {captions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p className="text-center">
                  {isListening ? "Listening for audio..." : "Click the button below to start capturing audio"}
                </p>
              </div>
            ) : (
              captions.map((caption) => (
                <div key={caption.id} className="space-y-2">
                  <div className="text-xs text-slate-500">{caption.time}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-slate-800 border-slate-700 p-4">
                      <div className="text-xs text-slate-400 mb-2">Source Language ({detectedLanguage})</div>
                      <p className={`${fontSizeClass}`} style={{ color: fontColor }}>
                        {caption.original}
                      </p>
                    </Card>
                    {enableTranslation && (
                      <Card className="bg-slate-800 border-slate-700 p-4">
                        <div className="text-xs text-slate-400 mb-2">
                          {SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage)?.name} Translation
                        </div>
                        <p className={`${fontSizeClass}`} style={{ color: fontColor }}>
                          {caption.translated}
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Controls */}
          <div className="border-t border-slate-700 bg-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isListening && (
                <>
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-400">Listening</span>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={toggleListening}
                className={`p-3 rounded-full transition ${
                  isListening ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
                title={isListening ? "Stop listening" : "Start listening"}
              >
                <Mic size={24} />
              </button>

              <button
                onClick={copyToClipboard}
                disabled={captions.length === 0}
                className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Copy captions"
              >
                <Copy size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
