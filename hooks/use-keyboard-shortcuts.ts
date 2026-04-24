"use client"

import { useEffect } from "react"

interface KeyboardShortcuts {
  onPlayPause?: () => void
  onMute?: () => void
  onFullscreen?: () => void
  onVolumeUp?: () => void
  onVolumeDown?: () => void
  onSeekForward?: () => void
  onSeekBackward?: () => void
  onPiP?: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault()
          shortcuts.onPlayPause?.()
          break
        case "m":
          e.preventDefault()
          shortcuts.onMute?.()
          break
        case "f":
          e.preventDefault()
          shortcuts.onFullscreen?.()
          break
        case "arrowup":
          e.preventDefault()
          shortcuts.onVolumeUp?.()
          break
        case "arrowdown":
          e.preventDefault()
          shortcuts.onVolumeDown?.()
          break
        case "arrowright":
          e.preventDefault()
          shortcuts.onSeekForward?.()
          break
        case "arrowleft":
          e.preventDefault()
          shortcuts.onSeekBackward?.()
          break
        case "p":
          e.preventDefault()
          shortcuts.onPiP?.()
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [shortcuts])
}
