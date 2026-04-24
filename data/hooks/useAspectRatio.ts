"use client"

import type React from "react"

import { useState, useCallback } from "react"

export type AspectRatioMode =
  | "fit-to-screen"
  | "fill-to-width"
  | "zoom-to-screen"
  | "zoom-off-screen"
  | "16:9"
  | "21:9"
  | "18:9"
  | "shrink"

interface AspectRatioSettings {
  mode: AspectRatioMode
  scale: number
}

export function useAspectRatio() {
  const [settings, setSettings] = useState<AspectRatioSettings>({
    mode: "fit-to-screen",
    scale: 100,
  })

  const setMode = useCallback((mode: AspectRatioMode) => {
    setSettings((prev) => ({ ...prev, mode }))
  }, [])

  const setScale = useCallback((scale: number) => {
    setSettings((prev) => ({ ...prev, scale }))
  }, [])

  const resetToDefault = useCallback(() => {
    setSettings({
      mode: "fit-to-screen",
      scale: 100,
    })
  }, [])

  const getVideoStyles = useCallback((): React.CSSProperties => {
    const { mode, scale } = settings
    const scaleValue = scale / 100

    const baseStyles: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      transform: `scale(${scaleValue})`,
      transformOrigin: "center",
    }

    switch (mode) {
      case "fit-to-screen":
        return { ...baseStyles, objectFit: "contain" }
      case "fill-to-width":
        return { ...baseStyles, objectFit: "cover", width: "100%" }
      case "zoom-to-screen":
        return { ...baseStyles, objectFit: "cover" }
      case "zoom-off-screen":
        return { ...baseStyles, objectFit: "cover", transform: `scale(${scaleValue * 1.2})` }
      case "16:9":
        return { ...baseStyles, aspectRatio: "16/9" }
      case "21:9":
        return { ...baseStyles, aspectRatio: "21/9" }
      case "18:9":
        return { ...baseStyles, aspectRatio: "18/9" }
      case "shrink":
        return { ...baseStyles, transform: `scale(${scaleValue * 0.8})` }
      default:
        return baseStyles
    }
  }, [settings])

  return {
    settings,
    setMode,
    setScale,
    resetToDefault,
    getVideoStyles,
  }
}
