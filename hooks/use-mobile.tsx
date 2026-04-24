"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      // Mobile if width < 768px OR if it's a mobile device in landscape (width < 1024 and height < 600)
      const isMobileWidth = width < MOBILE_BREAKPOINT
      const isMobileLandscape = width < 1024 && height < 600 && width > height
      return isMobileWidth || isMobileLandscape
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const orientationMql = window.matchMedia("(orientation: landscape)")

    const onChange = () => {
      setIsMobile(checkMobile())
    }

    mql.addEventListener("change", onChange)
    orientationMql.addEventListener("change", onChange)
    setIsMobile(checkMobile())

    return () => {
      mql.removeEventListener("change", onChange)
      orientationMql.removeEventListener("change", onChange)
    }
  }, [])

  return !!isMobile
}
