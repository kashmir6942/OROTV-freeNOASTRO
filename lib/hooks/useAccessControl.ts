"use client"

import { useState, useEffect } from "react"
import { validateTokenClient } from "@/lib/token-manager"

export const useAccessControl = () => {
  const [hasAccess, setHasAccess] = useState(false)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const pathToken = window.location.pathname.slice(1)
      if (pathToken === "permanent" || pathToken.startsWith("tokenlizedlinknumber")) {
        const tokenInfo = await validateTokenClient(pathToken === "permanent" ? "permanent" : pathToken)
        if (tokenInfo.isValid) {
          setHasAccess(true)
          setIsCheckingAccess(false)
          return
        }
      }

      const sessionToken = sessionStorage.getItem("currentToken")
      if (sessionToken) {
        const tokenInfo = await validateTokenClient(sessionToken)
        if (tokenInfo.isValid) {
          setHasAccess(true)
          setIsCheckingAccess(false)
          return
        } else {
          sessionStorage.removeItem("currentToken")
        }
      }

      setIsCheckingAccess(false)
    }

    checkAccess()
  }, [])

  return { hasAccess, isCheckingAccess, setHasAccess }
}
