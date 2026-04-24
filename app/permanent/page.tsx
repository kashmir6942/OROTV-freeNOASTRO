'use client'

import { useEffect, useState } from 'react'
import { validateTokenClient } from '@/lib/token-manager'
import { useDeviceRedirect } from '@/hooks/use-device-redirect'
import Home from '../page'

export default function PermanentPage() {
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  useDeviceRedirect('permanent')

  useEffect(() => {
    const validateAccess = async () => {
      try {
        const tokenInfo = await validateTokenClient('permanent')

        if (tokenInfo.isValid) {
          sessionStorage.setItem('currentToken', 'permanent')
          setIsValid(true)
        }
      } catch (error) {
        console.error('Token validation failed:', error)
        sessionStorage.setItem('currentToken', 'permanent')
        setIsValid(true)
      }

      setIsValidating(false)
    }

    validateAccess()
  }, [])

  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Validating access...</div>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Access Denied</div>
      </div>
    )
  }

  return <Home />
}
